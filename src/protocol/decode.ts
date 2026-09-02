import { QRMeshPayload } from './types';
import { parseV2Packet, TransferSession, isV2Packet } from './packet';

export { isV2Packet };
import { validatePayloadShape, validateRawSize } from './validation';
import { sha256Hex } from './security';

export interface ScanResult {
  status: 'progress' | 'complete' | 'error' | 'not-qrmesh';
  progress?: { collected: number; total: number; missing: number[]; duplicates: number };
  payload?: QRMeshPayload;
  error?: string;
}

/** Stateful accumulator you feed raw QR strings into; it tracks one v2 session at a time. */
export class QRMeshReceiver {
  private session: TransferSession | null = null;

  reset(): void {
    this.session = null;
  }

  async ingest(raw: string): Promise<ScanResult> {
    if (!isV2Packet(raw)) {
      return { status: 'not-qrmesh' };
    }
    const parsed = parseV2Packet(raw);
    if (!parsed) return { status: 'error', error: 'Malformed QRMesh packet' };

    if (!this.session || this.session.sessionId !== parsed.sessionId) {
      this.session = new TransferSession(parsed.sessionId, parsed.total, parsed.checksum);
    }
    this.session.add(parsed.index, parsed.chunk);

    if (!this.session.isComplete) {
      return {
        status: 'progress',
        progress: {
          collected: this.session.collected,
          total: this.session.total,
          missing: this.session.missing,
          duplicates: this.session.duplicates,
        },
      };
    }

    let json: string;
    try {
      json = this.session.reassemble();
    } catch (e) {
      this.session = null;
      return { status: 'error', error: e instanceof Error ? e.message : 'Corrupted transfer' };
    }

    const sizeCheck = validateRawSize(json);
    if (!sizeCheck.valid) {
      this.session = null;
      return { status: 'error', error: sizeCheck.errors.join('; ') };
    }

    let candidate: unknown;
    try {
      candidate = JSON.parse(json);
    } catch {
      this.session = null;
      return { status: 'error', error: 'Payload is not valid JSON' };
    }

    const shapeCheck = validatePayloadShape(candidate);
    if (!shapeCheck.valid) {
      this.session = null;
      return { status: 'error', error: shapeCheck.errors.join('; ') };
    }

    const payload = candidate as QRMeshPayload;
    if (payload.security?.checksum) {
      const actual = await sha256Hex(JSON.stringify(payload.data));
      if (actual !== payload.security.checksum) {
        this.session = null;
        return { status: 'error', error: 'Data integrity check failed — transfer was corrupted' };
      }
    }

    this.session = null;
    return { status: 'complete', payload };
  }
}
