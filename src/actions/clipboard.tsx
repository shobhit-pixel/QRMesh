import { useState } from 'react';
import { Clipboard } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextArea, PrimaryButton } from '../components/common/Field';
import { PreviewCard } from '../components/common/PreviewCard';

export interface ClipboardData {
  text: string;
}

function SenderForm({ onCreate }: { onCreate: (d: ClipboardData) => void }) {
  const [text, setText] = useState('');
  return (
    <div className="w-full max-w-md">
      <Field label="Text to copy" required>
        <TextArea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Snippet, code, password reset link…" />
      </Field>
      <PrimaryButton disabled={!text.trim()} onClick={() => onCreate({ text: text.trim() })}>
        Create QR
      </PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: ClipboardData; onConfirm: () => void; onCancel: () => void }) {
  return (
    <PreviewCard
      title="Text Ready to Copy"
      riskLevel="LOW"
      onConfirm={() => {
        navigator.clipboard.writeText(data.text).catch(() => {});
        onConfirm();
      }}
      onCancel={onCancel}
      confirmLabel="Copy to Clipboard"
    >
      <p className="whitespace-pre-wrap break-words bg-[var(--lego-bg)] border-2 border-[var(--lego-border)] rounded-xl p-3 max-h-40 overflow-y-auto">{data.text}</p>
    </PreviewCard>
  );
}

const definition: ActionDefinition<ClipboardData> = {
  type: 'CLIPBOARD',
  label: 'Clipboard',
  description: 'Send text meant to be copied on the other device',
  category: 'Productivity',
  riskLevel: 'LOW',
  icon: Clipboard,
  actionName: 'clipboard_text',
  validate: (d) => {
    const data = d as ClipboardData;
    return typeof data?.text === 'string' && data.text.length > 0
      ? { valid: true, errors: [] }
      : { valid: false, errors: ['Text is required'] };
  },
  SenderForm,
  ReceiverPreview,
};

registerAction(definition);
export default definition;
