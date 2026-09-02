// QRMesh protocol v2 — core types shared by sender and receiver.

export type ActionType =
  | 'CONTACT'
  | 'BUSINESS_CARD'
  | 'WIFI'
  | 'URL'
  | 'LOCATION'
  | 'CALL'
  | 'SMS'
  | 'EMAIL'
  | 'CALENDAR_EVENT'
  | 'REMINDER'
  | 'PAYMENT_REQUEST'
  | 'EVENT_TICKET'
  | 'DIGITAL_ID'
  | 'TEXT'
  | 'CLIPBOARD'
  | 'IMAGE'
  | 'AUDIO'
  | 'FILE'
  | 'PDF'
  | 'FORM_DATA'
  | 'APP_LINK'
  | 'DEVICE_PAIRING'
  | 'AUTHORIZATION'
  | 'CONFIGURATION'
  | 'SETTINGS'
  | 'MULTI_ACTION';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export const PROTOCOL_VERSION = 2;

export interface SenderMetadata {
  name?: string;
  deviceId?: string;
}

export interface SecurityMetadata {
  /** SHA-256 hex digest of the JSON-stringified `data` field. */
  checksum?: string;
  /** Set when `data` is AES-GCM encrypted; `data` is then a base64 ciphertext envelope. */
  encrypted?: boolean;
  /** base64 IV, only present when encrypted. */
  iv?: string;
}

export interface QRMeshPayload<T = unknown> {
  protocol: 'QRMesh';
  version: number;
  id: string;
  type: ActionType;
  action: string;
  createdAt: number;
  expiresAt?: number;
  sender?: SenderMetadata;
  data: T;
  security?: SecurityMetadata;
}

export interface TransferSessionMeta {
  sessionId: string;
  total: number;
  kind: 'action' | 'binary';
  /** short checksum (8 hex chars) of the fully reassembled string, repeated on every packet */
  checksum: string;
}

export interface ReceiveProgress {
  sessionId: string;
  total: number;
  collected: number;
  missing: number[];
  duplicates: number;
}
