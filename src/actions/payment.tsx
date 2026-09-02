import { useState } from 'react';
import { IndianRupee } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextInput, TextArea, PrimaryButton } from '../components/common/Field';
import { PreviewCard, PreviewRow } from '../components/common/PreviewCard';
import { encodeUpi } from '../protocol/standardFormats';

export interface PaymentData {
  payeeVpa?: string; // UPI id, e.g. name@bank
  payeeName?: string;
  amount: number;
  currency: string;
  reference?: string;
  description?: string;
}

function SenderForm({ onCreate }: { onCreate: (d: PaymentData) => void }) {
  const [d, setD] = useState<Partial<PaymentData>>({ currency: 'INR' });
  const valid = typeof d.amount === 'number' && Number.isFinite(d.amount) && d.amount > 0;
  return (
    <div className="w-full max-w-md">
      <Field label="UPI ID (optional)" hint="e.g. name@bank — adding one creates a Universal QR any UPI app can scan; without it, this uses QRMesh Transfer instead">
        <TextInput value={d.payeeVpa || ''} onChange={(e) => setD((p) => ({ ...p, payeeVpa: e.target.value }))} />
      </Field>
      <Field label="Payee name"><TextInput value={d.payeeName || ''} onChange={(e) => setD((p) => ({ ...p, payeeName: e.target.value }))} /></Field>
      <div className="flex gap-3">
        <Field label="Amount" required><TextInput type="number" min="0" value={d.amount ?? ''} onChange={(e) => setD((p) => ({ ...p, amount: parseFloat(e.target.value) }))} /></Field>
        <Field label="Currency"><TextInput value={d.currency || 'INR'} onChange={(e) => setD((p) => ({ ...p, currency: e.target.value }))} /></Field>
      </div>
      <Field label="Reference"><TextInput value={d.reference || ''} onChange={(e) => setD((p) => ({ ...p, reference: e.target.value }))} /></Field>
      <Field label="Description"><TextArea rows={2} value={d.description || ''} onChange={(e) => setD((p) => ({ ...p, description: e.target.value }))} /></Field>
      <PrimaryButton disabled={!valid} onClick={() => onCreate(d as PaymentData)}>Create QR</PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: PaymentData; onConfirm: () => void; onCancel: () => void }) {
  const upiUrl = data.payeeVpa ? encodeUpi(data) : null;
  return (
    <PreviewCard
      title="Payment Request"
      riskLevel="HIGH"
      confirmLabel={upiUrl ? 'Continue to Payment' : 'Acknowledge'}
      onConfirm={() => { if (upiUrl) window.location.href = upiUrl; onConfirm(); }}
      onCancel={onCancel}
    >
      <div className="flex items-center gap-2 justify-center text-3xl font-black py-2">
        <IndianRupee className="w-6 h-6" />
        {data.amount.toFixed(2)} {data.currency}
      </div>
      <PreviewRow label="Payee" value={data.payeeName} />
      <PreviewRow label="Reference" value={data.reference} />
      {data.description && <p className="text-sm text-[var(--lego-muted)]">{data.description}</p>}
      <p className="text-xs text-[var(--lego-muted)]">
        QRMesh never handles your PIN, OTP, or banking credentials — this only opens your UPI app to review and pay.
      </p>
    </PreviewCard>
  );
}

const definition: ActionDefinition<PaymentData> = {
  type: 'PAYMENT_REQUEST',
  label: 'Payment Request',
  description: 'Request a UPI/generic payment',
  category: 'Payments',
  riskLevel: 'HIGH',
  icon: IndianRupee,
  actionName: 'payment_request',
  validate: (d) => {
    const data = d as PaymentData;
    return typeof data?.amount === 'number' && Number.isFinite(data.amount) && data.amount > 0
      ? { valid: true, errors: [] }
      : { valid: false, errors: ['A positive, finite amount is required'] };
  },
  SenderForm,
  ReceiverPreview,
  // Only a genuine UPI QR if a payee VPA was given — a bare amount/reference has
  // no standard interoperable representation, so those transfer via QRMesh instead.
  universal: { format: 'upi://pay', encode: (data) => (data.payeeVpa ? encodeUpi(data) : '') },
};

registerAction(definition);
export default definition;
