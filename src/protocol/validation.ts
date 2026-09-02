import { PROTOCOL_VERSION, QRMeshPayload } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const MAX_PAYLOAD_JSON_LENGTH = 2_000_000; // guards against decompression-bomb style abuse

export function validatePayloadShape(candidate: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof candidate !== 'object' || candidate === null) {
    return { valid: false, errors: ['Payload is not an object'] };
  }
  const p = candidate as Partial<QRMeshPayload>;

  if (p.protocol !== 'QRMesh') errors.push('Unknown protocol');
  if (typeof p.version !== 'number') errors.push('Missing protocol version');
  else if (p.version > PROTOCOL_VERSION) errors.push(`Unsupported QRMesh version ${p.version}`);
  if (typeof p.id !== 'string' || !p.id) errors.push('Missing payload id');
  if (typeof p.type !== 'string') errors.push('Missing action type');
  if (typeof p.createdAt !== 'number') errors.push('Missing createdAt');
  if (p.data === undefined || p.data === null) errors.push('Missing data');

  if (p.expiresAt && Date.now() > p.expiresAt) {
    errors.push('This transfer has expired. Ask the sender to start a new one.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateRawSize(jsonString: string): ValidationResult {
  if (jsonString.length > MAX_PAYLOAD_JSON_LENGTH) {
    return { valid: false, errors: ['Payload exceeds the safe size limit for this browser'] };
  }
  return { valid: true, errors: [] };
}
