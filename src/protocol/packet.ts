// Chunking/serialization for QRMesh v2 action payloads.
// Wire format: QM2|<sessionId>|<index>|<total>|<crc32-of-full-base64>|<base64-chunk>
// Legacy binary format (image/audio, produced by utils/dataUtils.ts) stays untouched:
//   <index>|<total>|<typeFlag>|<base64-chunk>  — detected by absence of the "QM2|" prefix.

import { crc32 } from './security';

export const V2_PREFIX = 'QM2';
export const ACTION_CHUNK_SIZE = 700; // chars of base64 per QR packet — small enough for reliable scans

// At MAX_PAYLOAD_JSON_LENGTH (validation.ts) worst case, ACTION_CHUNK_SIZE implies
// well under this many packets. A hostile packet claiming far more than that would
// make TransferSession's O(total) bookkeeping (missing-packet scans) hang the
// browser before a single byte of actual data is even collected — so this is
// checked before a session is ever created, not after.
export const MAX_V2_CHUNKS = 5000;

export function isV2Packet(raw: string): boolean {
  return raw.startsWith(`${V2_PREFIX}|`);
}

export function packetize(jsonString: string, sessionId: string): string[] {
  const b64 = btoa(unescape(encodeURIComponent(jsonString)));
  const checksum = crc32(b64);
  const total = Math.max(1, Math.ceil(b64.length / ACTION_CHUNK_SIZE));
  const packets: string[] = [];
  for (let i = 0; i < total; i++) {
    const chunk = b64.slice(i * ACTION_CHUNK_SIZE, (i + 1) * ACTION_CHUNK_SIZE);
    packets.push([V2_PREFIX, sessionId, i, total, checksum, chunk].join('|'));
  }
  return packets;
}

export interface ParsedV2Packet {
  sessionId: string;
  index: number;
  total: number;
  checksum: string;
  chunk: string;
}

export function parseV2Packet(raw: string): ParsedV2Packet | null {
  if (!isV2Packet(raw)) return null;
  const parts = raw.split('|');
  if (parts.length < 6) return null;
  const [, sessionId, indexStr, totalStr, checksum, ...rest] = parts;
  const index = parseInt(indexStr, 10);
  const total = parseInt(totalStr, 10);
  if (Number.isNaN(index) || Number.isNaN(total)) return null;
  if (total <= 0 || total > MAX_V2_CHUNKS || index < 0 || index >= total) return null;
  return { sessionId, index, total, checksum, chunk: rest.join('|') };
}

/** Accumulates packets for a single in-flight session and reassembles once complete. */
export class TransferSession {
  sessionId: string;
  total: number;
  checksum: string;
  private chunks: Map<number, string> = new Map();
  duplicates = 0;

  constructor(sessionId: string, total: number, checksum: string) {
    this.sessionId = sessionId;
    this.total = total;
    this.checksum = checksum;
  }

  add(index: number, chunk: string): void {
    if (this.chunks.has(index)) {
      this.duplicates++;
      return;
    }
    this.chunks.set(index, chunk);
  }

  get collected(): number {
    return this.chunks.size;
  }

  get missing(): number[] {
    const missing: number[] = [];
    for (let i = 0; i < this.total; i++) if (!this.chunks.has(i)) missing.push(i);
    return missing;
  }

  get isComplete(): boolean {
    return this.chunks.size === this.total;
  }

  /** Reassembles, verifies the packet-level crc32, and returns the decoded JSON string. */
  reassemble(): string {
    if (!this.isComplete) throw new Error('Transfer incomplete');
    let b64 = '';
    for (let i = 0; i < this.total; i++) b64 += this.chunks.get(i);
    if (crc32(b64) !== this.checksum) {
      throw new Error('Packet checksum mismatch — data may be corrupted');
    }
    return decodeURIComponent(escape(atob(b64)));
  }
}
