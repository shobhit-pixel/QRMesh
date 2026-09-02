import { useState } from 'react';
import { BadgeCheck, AlertTriangle } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextInput, PrimaryButton } from '../components/common/Field';
import { PreviewCard, PreviewRow } from '../components/common/PreviewCard';

export interface DigitalIdData {
  name: string;
  idNumber: string;
  organization?: string;
  role?: string;
  validUntil?: string; // ISO date
}

function SenderForm({ onCreate }: { onCreate: (d: DigitalIdData) => void }) {
  const [d, setD] = useState<Partial<DigitalIdData>>({});
  const valid = !!(d.name?.trim() && d.idNumber?.trim());
  const set = (k: keyof DigitalIdData) => (e: React.ChangeEvent<HTMLInputElement>) => setD((p) => ({ ...p, [k]: e.target.value }));
  return (
    <div className="w-full max-w-md">
      <div className="flex items-start gap-2 bg-[#FFF7D6] border-2 border-[var(--lego-border)] rounded-xl p-3 mb-4 text-xs font-bold">
        <AlertTriangle className="w-4 h-4 shrink-0 text-[#B29500]" />
        This is a self-declared badge, not a verified government ID.
      </div>
      <Field label="Name" required><TextInput value={d.name || ''} onChange={set('name')} /></Field>
      <Field label="ID number" required><TextInput value={d.idNumber || ''} onChange={set('idNumber')} /></Field>
      <Field label="Organization"><TextInput value={d.organization || ''} onChange={set('organization')} /></Field>
      <Field label="Role"><TextInput value={d.role || ''} onChange={set('role')} /></Field>
      <Field label="Valid until"><TextInput type="date" value={d.validUntil || ''} onChange={set('validUntil')} /></Field>
      <PrimaryButton disabled={!valid} onClick={() => onCreate(d as DigitalIdData)}>Create QR</PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: DigitalIdData; onConfirm: () => void; onCancel: () => void }) {
  const expired = data.validUntil ? new Date(data.validUntil) < new Date() : false;
  return (
    <PreviewCard title="Identity Received" riskLevel="MEDIUM" confirmLabel="View" onConfirm={onConfirm} onCancel={onCancel}>
      <div className="flex items-center gap-2 font-black text-lg"><BadgeCheck className="w-5 h-5 text-[#0057A6]" />{data.name}</div>
      <PreviewRow label="ID" value={data.idNumber} />
      <PreviewRow label="Organization" value={data.organization} />
      <PreviewRow label="Role" value={data.role} />
      <PreviewRow label="Valid until" value={data.validUntil} />
      {expired && <p className="text-[#D01012] text-sm font-bold">This ID's stated validity has expired.</p>}
      <p className="text-xs text-[var(--lego-muted)]">Self-declared identity — not verified against any government or official database.</p>
    </PreviewCard>
  );
}

const definition: ActionDefinition<DigitalIdData> = {
  type: 'DIGITAL_ID',
  label: 'Digital ID',
  description: 'Share a self-declared identity badge',
  category: 'Events & Identity',
  riskLevel: 'MEDIUM',
  icon: BadgeCheck,
  actionName: 'share_digital_id',
  validate: (d) => {
    const data = d as DigitalIdData;
    return data?.name?.trim() && data?.idNumber?.trim()
      ? { valid: true, errors: [] }
      : { valid: false, errors: ['Name and ID number are required'] };
  },
  SenderForm,
  ReceiverPreview,
};

registerAction(definition);
export default definition;
