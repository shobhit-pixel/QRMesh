import { describe, it, expect } from 'vitest';
import { buildPayload, serializePayloadToPackets } from './encode';
import { QRMeshReceiver } from './decode';
import { PROTOCOL_VERSION } from './types';

async function roundTrip(data: unknown) {
  const payload = await buildPayload({ type: 'TEXT', action: 'share_text', data });
  const packets = serializePayloadToPackets(payload);
  const receiver = new QRMeshReceiver();
  let last;
  for (const p of packets) {
    last = await receiver.ingest(p);
  }
  return { payload, packets, result: last! };
}

describe('full encode -> packetize -> decode round trip', () => {
  it('reproduces the exact original payload for a small action', async () => {
    const { payload, result } = await roundTrip({ text: 'Hello QRMesh' });
    expect(result.status).toBe('complete');
    expect(result.payload).toEqual(payload);
  });

  it('reproduces a large multi-packet payload exactly', async () => {
    const { payload, result } = await roundTrip({ text: 'x'.repeat(10_000) });
    expect(result.status).toBe('complete');
    expect(result.payload?.data).toEqual(payload.data);
  });

  it('stamps the current protocol version', async () => {
    const { payload } = await roundTrip({ text: 'v' });
    expect(payload.version).toBe(PROTOCOL_VERSION);
  });

  it('rejects an expired payload', async () => {
    const payload = await buildPayload({ type: 'TEXT', action: 'share_text', data: { text: 'old' }, expiresInMs: -1000 });
    const packets = serializePayloadToPackets(payload);
    const receiver = new QRMeshReceiver();
    let last;
    for (const p of packets) last = await receiver.ingest(p);
    expect(last!.status).toBe('error');
    expect(last!.error).toMatch(/expired/i);
  });

  it('detects tampering that breaks the SHA-256 integrity checksum', async () => {
    const payload = await buildPayload({ type: 'TEXT', action: 'share_text', data: { text: 'original' } });
    // Tamper with the payload data after checksum computation, before sending.
    (payload.data as { text: string }).text = 'tampered';
    const packets = serializePayloadToPackets(payload);
    const receiver = new QRMeshReceiver();
    let last;
    for (const p of packets) last = await receiver.ingest(p);
    expect(last!.status).toBe('error');
    expect(last!.error).toMatch(/integrity/i);
  });

  it('rejects malformed JSON gracefully instead of throwing', async () => {
    const receiver = new QRMeshReceiver();
    const result = await receiver.ingest('QM2|s|0|1|00000000|bm90LWpzb24=' /* base64("not-json") */);
    expect(result.status).toBe('error');
  });

  it('treats non-QRMesh strings as not-qrmesh rather than erroring', async () => {
    const receiver = new QRMeshReceiver();
    const result = await receiver.ingest('0|3|i|SGVsbG8=');
    expect(result.status).toBe('not-qrmesh');
  });

  it('does not confuse a legacy packet for a v2 packet', async () => {
    const receiver = new QRMeshReceiver();
    const legacy = await receiver.ingest('0|1|i|AAAA');
    expect(legacy.status).toBe('not-qrmesh');
  });
});
