import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextInput, TextArea, PrimaryButton } from '../components/common/Field';
import { PreviewCard, PreviewRow } from '../components/common/PreviewCard';
import { encodeSms } from '../protocol/standardFormats';

export interface SmsData {
  phone: string;
  message?: string;
}

function SenderForm({ onCreate }: { onCreate: (d: SmsData) => void }) {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  return (
    <div className="w-full max-w-md">
      <Field label="Phone number" required>
        <TextInput type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <Field label="Message"><TextArea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
      <PrimaryButton disabled={!phone.trim()} onClick={() => onCreate({ phone: phone.trim(), message: message || undefined })}>Create QR</PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: SmsData; onConfirm: () => void; onCancel: () => void }) {
  return (
    <PreviewCard
      title="SMS Request"
      riskLevel="HIGH"
      confirmLabel="Open Messages"
      onConfirm={() => {
        window.location.href = `sms:${data.phone}${data.message ? `?body=${encodeURIComponent(data.message)}` : ''}`;
        onConfirm();
      }}
      onCancel={onCancel}
    >
      <MessageSquare className="w-5 h-5 text-[#0057A6]" />
      <PreviewRow label="To" value={data.phone} />
      {data.message && <p className="bg-[var(--lego-bg)] border-2 border-[var(--lego-border)] rounded-xl p-3 text-sm">{data.message}</p>}
      <p className="text-xs text-[var(--lego-muted)]">Opens your messaging app with this drafted — nothing sends automatically.</p>
    </PreviewCard>
  );
}

const definition: ActionDefinition<SmsData> = {
  type: 'SMS',
  label: 'SMS',
  description: 'Draft a text message',
  category: 'Communication',
  riskLevel: 'HIGH',
  icon: MessageSquare,
  actionName: 'request_sms',
  validate: (d) => {
    const data = d as SmsData;
    return typeof data?.phone === 'string' && data.phone.trim().length > 0
      ? { valid: true, errors: [] }
      : { valid: false, errors: ['Phone number is required'] };
  },
  SenderForm,
  ReceiverPreview,
  universal: { format: 'SMSTO:', encode: (data) => encodeSms(data.phone, data.message) },
};

registerAction(definition);
export default definition;
