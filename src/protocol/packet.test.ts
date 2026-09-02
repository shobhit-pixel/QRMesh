import { describe, it, expect } from 'vitest';
import { packetize, parseV2Packet, isV2Packet, TransferSession, MAX_V2_CHUNKS } from './packet';

describe('isV2Packet', () => {
  it('recognizes v2 packets', () => {
    expect(isV2Packet('QM2|abc|0|1|deadbeef|SGVsbG8=')).toBe(true);
  });
  it('does not misclassify legacy packets', () => {
    expect(isV2Packet('0|3|i|SGVsbG8=')).toBe(false);
  });
});

describe('packetize + TransferSession round trip', () => {
  it('reassembles a small single-packet payload', () => {
    const json = JSON.stringify({ hello: 'world' });
    const packets = packetize(json, 'sess1');
    expect(packets.length).toBe(1);

    const parsed = parseV2Packet(packets[0])!;
    const session = new TransferSession(parsed.sessionId, parsed.total, parsed.checksum);
    session.add(parsed.index, parsed.chunk);
    expect(session.isComplete).toBe(true);
    expect(session.reassemble()).toBe(json);
  });

  it('reassembles a large multi-packet payload', () => {
    const json = JSON.stringify({ text: 'x'.repeat(5000) });
    const packets = packetize(json, 'sess2');
    expect(packets.length).toBeGreaterThan(1);

    const parsedFirst = parseV2Packet(packets[0])!;
    const session = new TransferSession(parsedFirst.sessionId, parsedFirst.total, parsedFirst.checksum);
    for (const p of packets) {
      const parsed = parseV2Packet(p)!;
      session.add(parsed.index, parsed.chunk);
    }
    expect(session.isComplete).toBe(true);
    expect(session.reassemble()).toBe(json);
  });

  it('reassembles correctly when packets arrive out of order', () => {
    const json = JSON.stringify({ text: 'y'.repeat(3000) });
    const packets = packetize(json, 'sess3');
    const shuffled = [...packets].reverse();

    const parsedFirst = parseV2Packet(shuffled[0])!;
    const session = new TransferSession(parsedFirst.sessionId, parsedFirst.total, parsedFirst.checksum);
    for (const p of shuffled) {
      const parsed = parseV2Packet(p)!;
      session.add(parsed.index, parsed.chunk);
    }
    expect(session.reassemble()).toBe(json);
  });

  it('ignores duplicate packets without corrupting the transfer', () => {
    const json = JSON.stringify({ a: 1, b: 2 });
    const packets = packetize(json, 'sess4');
    const withDupes = [...packets, ...packets, packets[0]];

    const parsedFirst = parseV2Packet(withDupes[0])!;
    const session = new TransferSession(parsedFirst.sessionId, parsedFirst.total, parsedFirst.checksum);
    for (const p of withDupes) {
      const parsed = parseV2Packet(p)!;
      session.add(parsed.index, parsed.chunk);
    }
    expect(session.collected).toBe(packets.length);
    expect(session.duplicates).toBe(withDupes.length - packets.length);
    expect(session.reassemble()).toBe(json);
  });

  it('detects corruption via checksum mismatch', () => {
    const json = JSON.stringify({ hello: 'world' });
    const packets = packetize(json, 'sess5');
    const parsed = parseV2Packet(packets[0])!;
    const session = new TransferSession(parsed.sessionId, parsed.total, parsed.checksum);
    // Tamper with the chunk after parsing (simulates a corrupted scan).
    session.add(parsed.index, parsed.chunk.slice(0, -1) + (parsed.chunk.endsWith('A') ? 'B' : 'A'));
    expect(() => session.reassemble()).toThrow(/checksum mismatch/i);
  });

  it('reports missing packet indices', () => {
    const json = JSON.stringify({ text: 'z'.repeat(3000) });
    const packets = packetize(json, 'sess6');
    const parsedFirst = parseV2Packet(packets[0])!;
    const session = new TransferSession(parsedFirst.sessionId, parsedFirst.total, parsedFirst.checksum);
    // Skip the last packet.
    for (const p of packets.slice(0, -1)) {
      const parsed = parseV2Packet(p)!;
      session.add(parsed.index, parsed.chunk);
    }
    expect(session.isComplete).toBe(false);
    expect(session.missing).toEqual([packets.length - 1]);
  });

  it('rejects a packet claiming an unreasonable total (DoS guard)', () => {
    const malicious = `QM2|s|0|999999999|deadbeef|AAAA`;
    expect(parseV2Packet(malicious)).toBeNull();
  });

  it('rejects a packet whose index is out of range', () => {
    const malicious = `QM2|s|5|3|deadbeef|AAAA`;
    expect(parseV2Packet(malicious)).toBeNull();
  });

  it('MAX_V2_CHUNKS is a sane finite bound', () => {
    expect(MAX_V2_CHUNKS).toBeGreaterThan(0);
    expect(MAX_V2_CHUNKS).toBeLessThan(1_000_000);
  });
});

describe('unicode payloads', () => {
  it('round-trips emoji and multi-script text', () => {
    const json = JSON.stringify({ text: 'Hello 👋 नमस्ते ગુજરાતી 中文 日本語' });
    const packets = packetize(json, 'sess-unicode');
    const parsedFirst = parseV2Packet(packets[0])!;
    const session = new TransferSession(parsedFirst.sessionId, parsedFirst.total, parsedFirst.checksum);
    for (const p of packets) {
      const parsed = parseV2Packet(p)!;
      session.add(parsed.index, parsed.chunk);
    }
    const result = session.reassemble();
    expect(result).toBe(json);
    expect(JSON.parse(result).text).toBe('Hello 👋 नमस्ते ગુજરાતી 中文 日本語');
  });
});
