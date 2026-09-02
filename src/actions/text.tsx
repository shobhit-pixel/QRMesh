import { useState } from 'react';
import { FileText, Copy, Check } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextArea, PrimaryButton } from '../components/common/Field';
import { PreviewCard } from '../components/common/PreviewCard';

export interface TextData {
  text: string;
}

function SenderForm({ onCreate }: { onCreate: (d: TextData) => void }) {
  const [text, setText] = useState('');
  return (
    <div className="w-full max-w-md">
      <Field label="Text" required>
        <TextArea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type or paste anything…" />
      </Field>
      <PrimaryButton disabled={!text.trim()} onClick={() => onCreate({ text: text.trim() })}>
        Create QR
      </PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: TextData; onConfirm: () => void; onCancel: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <PreviewCard title="Text Received" riskLevel="LOW" onConfirm={onConfirm} onCancel={onCancel} confirmLabel="Save">
      <p className="whitespace-pre-wrap break-words bg-[var(--lego-bg)] border-2 border-[var(--lego-border)] rounded-xl p-3 max-h-48 overflow-y-auto">{data.text}</p>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(data.text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="mt-2 flex items-center gap-2 text-sm font-bold text-[#0057A6]"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copied!' : 'Copy text'}
      </button>
    </PreviewCard>
  );
}

const definition: ActionDefinition<TextData> = {
  type: 'TEXT',
  label: 'Text',
  description: 'Send arbitrary text',
  category: 'Productivity',
  riskLevel: 'LOW',
  icon: FileText,
  actionName: 'share_text',
  validate: (d) => {
    const data = d as TextData;
    return typeof data?.text === 'string' && data.text.length > 0
      ? { valid: true, errors: [] }
      : { valid: false, errors: ['Text is required'] };
  },
  SenderForm,
  ReceiverPreview,
  universal: { format: 'Plain text', encode: (data) => data.text },
};

registerAction(definition);
export default definition;
