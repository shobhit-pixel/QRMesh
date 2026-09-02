import { ActionType, PROTOCOL_VERSION, QRMeshPayload, SenderMetadata } from './types';
import { sha256Hex, generateSessionId } from './security';
import { packetize } from './packet';

export interface BuildPayloadOptions {
  action: string;
  type: ActionType;
  data: unknown;
  expiresInMs?: number;
  sender?: SenderMetadata;
}

export async function buildPayload(opts: BuildPayloadOptions): Promise<QRMeshPayload> {
  const dataString = JSON.stringify(opts.data);
  const checksum = await sha256Hex(dataString);
  const payload: QRMeshPayload = {
    protocol: 'QRMesh',
    version: PROTOCOL_VERSION,
    id: generateSessionId(),
    type: opts.type,
    action: opts.action,
    createdAt: Date.now(),
    expiresAt: opts.expiresInMs ? Date.now() + opts.expiresInMs : undefined,
    sender: opts.sender,
    data: opts.data,
    security: { checksum },
  };
  return payload;
}

/** Serializes a payload into one or more QR-ready packet strings. */
export function serializePayloadToPackets(payload: QRMeshPayload): string[] {
  const json = JSON.stringify(payload);
  return packetize(json, payload.id);
}
