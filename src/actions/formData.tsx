import { useState } from 'react';
import { ListChecks, Plus, Trash2, Copy } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextInput, PrimaryButton } from '../components/common/Field';
import { PreviewCard, PreviewRow } from '../components/common/PreviewCard';

export interface FormDataPayload {
  title?: string;
  fields: { key: string; value: string }[];
}

function SenderForm({ onCreate }: { onCreate: (d: FormDataPayload) => void }) {
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState([{ key: '', value: '' }]);
  const valid = fields.some((f) => f.key.trim() && f.value.trim());

  const update = (i: number, k: 'key' | 'value', v: string) =>
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, [k]: v } : f)));

  return (
    <div className="w-full max-w-md">
      <Field label="Title (optional)"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      {fields.map((f, i) => (
        <div key={i} className="flex gap-2 mb-3">
          <TextInput placeholder="Field name" value={f.key} onChange={(e) => update(i, 'key', e.target.value)} />
          <TextInput placeholder="Value" value={f.value} onChange={(e) => update(i, 'value', e.target.value)} />
          <button onClick={() => setFields((prev) => prev.filter((_, idx) => idx !== i))} className="shrink-0 text-[#D01012]">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      ))}
      <button onClick={() => setFields((prev) => [...prev, { key: '', value: '' }])} className="flex items-center gap-2 text-sm font-bold text-[#0057A6] mb-4">
        <Plus className="w-4 h-4" /> Add field
      </button>
      <PrimaryButton
        disabled={!valid}
        onClick={() => onCreate({ title: title || undefined, fields: fields.filter((f) => f.key.trim() && f.value.trim()) })}
      >
        Create QR
      </PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: FormDataPayload; onConfirm: () => void; onCancel: () => void }) {
  const asJson = JSON.stringify(Object.fromEntries(data.fields.map((f) => [f.key, f.value])), null, 2);
  return (
    <PreviewCard title={data.title || 'Form Data Received'} riskLevel="LOW" onConfirm={onConfirm} onCancel={onCancel} confirmLabel="Import">
      <ListChecks className="w-5 h-5 text-[#0057A6]" />
      {data.fields.map((f, i) => (
        <PreviewRow key={i} label={f.key} value={f.value} />
      ))}
      <button onClick={() => navigator.clipboard.writeText(asJson)} className="flex items-center gap-2 text-sm font-bold text-[#0057A6] mt-2">
        <Copy className="w-4 h-4" /> Copy as JSON
      </button>
    </PreviewCard>
  );
}

const definition: ActionDefinition<FormDataPayload> = {
  type: 'FORM_DATA',
  label: 'Form Data',
  description: 'Send structured key/value data',
  category: 'Productivity',
  riskLevel: 'LOW',
  icon: ListChecks,
  actionName: 'share_form_data',
  validate: (d) => {
    const data = d as FormDataPayload;
    return Array.isArray(data?.fields) && data.fields.length > 0
      ? { valid: true, errors: [] }
      : { valid: false, errors: ['At least one field is required'] };
  },
  SenderForm,
  ReceiverPreview,
};

registerAction(definition);
export default definition;
