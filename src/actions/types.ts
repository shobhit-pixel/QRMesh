import { ComponentType } from 'react';
import { ActionType, RiskLevel } from '../protocol/types';

export type ActionCategory =
  | 'Communication'
  | 'Connectivity'
  | 'Navigation'
  | 'Productivity'
  | 'Payments'
  | 'Events & Identity'
  | 'Files & Media'
  | 'Apps & Devices'
  | 'Advanced';

export interface ValidationOutcome {
  valid: boolean;
  errors: string[];
}

export interface SenderFormProps<TData> {
  onCreate: (data: TData) => void;
}

export interface ReceiverPreviewProps<TData> {
  data: TData;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface ActionDefinition<TData = any> {
  type: ActionType;
  label: string;
  description: string;
  category: ActionCategory;
  riskLevel: RiskLevel;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Human label used as QRMeshPayload.action, e.g. "share_contact" */
  actionName: string;
  validate: (data: unknown) => ValidationOutcome;
  SenderForm: ComponentType<SenderFormProps<TData>>;
  ReceiverPreview: ComponentType<ReceiverPreviewProps<TData>>;
  /**
   * Set when this action doesn't go through the generic single-QR JSON flow —
   * e.g. binary transfers (image/audio/file/pdf) that reuse the multi-frame
   * chunked transport directly. The shell routes these to a dedicated screen
   * instead of rendering SenderForm/ReceiverPreview.
   */
  special?: 'binary-transfer';
  /**
   * Present when this action has an established interoperable QR standard
   * (vCard, tel:, mailto:, geo:, WIFI:, upi://, plain URL/text). When set,
   * the sender generates a single raw standard-format QR — no QRMesh
   * wrapper — that any standard camera/QR scanner can read without QRMesh
   * installed. When absent, the action always uses QRMesh's own QM2
   * multi-frame transport and requires the QRMesh receiver.
   */
  universal?: {
    /** Human label for the standard, e.g. "vCard 3.0", "tel:", "WIFI:". */
    format: string;
    /** Produces the raw QR payload string — no JSON/QM2 wrapping. */
    encode: (data: TData) => string;
  };
}
