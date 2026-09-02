import { useState } from 'react';
import { Mail } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextInput, TextArea, PrimaryButton } from '../components/common/Field';
import { PreviewCard, PreviewRow } from '../components/common/PreviewCard';
import { encodeMailto, sanitizeMailtoRecipient } from '../protocol/standardFormats';

export { sanitizeMailtoRecipient };

export interface EmailData {
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
}

function SenderForm({ onCreate }: { onCreate: (d: EmailData) => void }) {
  const [d, setD] = useState<EmailData>({ to: '' });
  const set = (k: keyof EmailData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setD((prev) => ({ ...prev, [k]: e.target.value }));
  return (
    <div className="w-full max-w-md">
      <Field label="To" required><TextInput type="email" value={d.to} onChange={set('to')} /></Field>
      <Field label="CC"><TextInput type="email" value={d.cc || ''} onChange={set('cc')} /></Field>
      <Field label="BCC"><TextInput type="email" value={d.bcc || ''} onChange={set('bcc')} /></Field>
      <Field label="Subject"><TextInput value={d.subject || ''} onChange={set('subject')} /></Field>
      <Field label="Body"><TextArea rows={4} value={d.body || ''} onChange={set('body')} /></Field>
      <PrimaryButton disabled={!d.to.trim()} onClick={() => onCreate(d)}>Create QR</PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: EmailData; onConfirm: () => void; onCancel: () => void }) {
  const mailto = encodeMailto(data.to, { cc: data.cc, bcc: data.bcc, subject: data.subject, body: data.body });
  return (
    <PreviewCard
      title="Email Request"
      riskLevel="HIGH"
      confirmLabel="Open Email"
      onConfirm={() => { window.location.href = mailto; onConfirm(); }}
      onCancel={onCancel}
    >
      <Mail className="w-5 h-5 text-[#0057A6]" />
      <PreviewRow label="To" value={data.to} />
      <PreviewRow label="Subject" value={data.subject} />
      <p className="text-xs text-[var(--lego-muted)]">Opens your mail app with a draft — nothing sends automatically.</p>
    </PreviewCard>
  );
}

const definition: ActionDefinition<EmailData> = {
  type: 'EMAIL',
  label: 'Email',
  description: 'Draft an email',
  category: 'Communication',
  riskLevel: 'HIGH',
  icon: Mail,
  actionName: 'request_email',
  validate: (d) => {
    const data = d as EmailData;
    return typeof data?.to === 'string' && data.to.includes('@')
      ? { valid: true, errors: [] }
      : { valid: false, errors: ['A valid recipient email is required'] };
  },
  SenderForm,
  ReceiverPreview,
  universal: { format: 'mailto:', encode: (data) => encodeMailto(data.to, { cc: data.cc, bcc: data.bcc, subject: data.subject, body: data.body }) },
};

registerAction(definition);
export default definition;
