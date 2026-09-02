// Exercises the ACTUAL QR encode/decode path — not just the packet-string
// generator. Renders a real PNG with the same `qrcode` library the app uses,
// decodes those pixels with the same `jsqr` library the receiver uses, and
// confirms the round-tripped string matches. This is the closest this
// environment can get to a physical camera test (no browser/camera available
// here — see the final verification report for what that leaves unverified).
import { describe, it, expect } from 'vitest';
import QRCode from 'qrcode';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { buildPayload, serializePayloadToPackets } from './encode';
import { QRMeshReceiver } from './decode';

async function renderAndDecode(text: string): Promise<string | null> {
  const pngBuffer = await QRCode.toBuffer(text, { errorCorrectionLevel: 'H', margin: 2, width: 320 });
  const png = PNG.sync.read(pngBuffer);
  const pixels = new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.length);
  const code = jsQR(pixels, png.width, png.height, { inversionAttempts: 'dontInvert' });
  return code?.data ?? null;
}

describe('real QR generation -> jsQR decode', () => {
  it('round-trips a short legacy-style chunk string', async () => {
    const original = '0|1|i|SGVsbG8gd29ybGQ=';
    const decoded = await renderAndDecode(original);
    expect(decoded).toBe(original);
  });

  it('round-trips a real v2 QRMesh packet end to end (render QR, decode QR, decode packet, verify payload)', async () => {
    const payload = await buildPayload({ type: 'TEXT', action: 'share_text', data: { text: 'Hello QRMesh' } });
    const packets = serializePayloadToPackets(payload);
    expect(packets.length).toBe(1); // small payload — fits in a single QR frame

    const decodedFromImage = await renderAndDecode(packets[0]);
    expect(decodedFromImage).toBe(packets[0]);

    const receiver = new QRMeshReceiver();
    const result = await receiver.ingest(decodedFromImage!);
    expect(result.status).toBe('complete');
    expect(result.payload?.data).toEqual({ text: 'Hello QRMesh' });
  });

  it('round-trips unicode text through an actual rendered QR image', async () => {
    const payload = await buildPayload({ type: 'TEXT', action: 'share_text', data: { text: 'नमस्ते 👋 中文' } });
    const packets = serializePayloadToPackets(payload);
    const receiver = new QRMeshReceiver();
    let last;
    for (const p of packets) {
      const decodedFromImage = await renderAndDecode(p);
      expect(decodedFromImage).toBe(p);
      last = await receiver.ingest(decodedFromImage!);
    }
    expect(last!.status).toBe('complete');
    expect((last!.payload!.data as { text: string }).text).toBe('नमस्ते 👋 中文');
  });
});
