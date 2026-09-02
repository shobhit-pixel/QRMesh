import { useState } from 'react';
import { Link2, ExternalLink, Copy } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextInput, PrimaryButton } from '../components/common/Field';
import { PreviewCard } from '../components/common/PreviewCard';
import { isSafeHttpUrl as isSafeUrl } from '../utils/urlSafety';

export interface UrlData {
  url: string;
  title?: string;
  description?: string;
}

function SenderForm({ onCreate }: { onCreate: (d: UrlData) => void }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const valid = isSafeUrl(url);
  return (
    <div className="w-full max-w-md">
      <Field label="URL" required hint="Must start with http:// or https://">
        <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
      </Field>
      <Field label="Title (optional)">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Description (optional)">
        <TextInput value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <PrimaryButton disabled={!valid} onClick={() => onCreate({ url, title: title || undefined, description: description || undefined })}>
        Create QR
      </PrimaryButton>
      {url && !valid && <p className="text-[#D01012] text-sm font-bold mt-2">Only http:// and https:// links are supported.</p>}
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: UrlData; onConfirm: () => void; onCancel: () => void }) {
  const safe = isSafeUrl(data.url);
  return (
    <PreviewCard title="Website Received" riskLevel="LOW" onConfirm={() => { if (safe) window.open(data.url, '_blank', 'noopener,noreferrer'); onConfirm(); }} onCancel={onCancel} confirmLabel="Open">
      {data.title && <p className="font-black">{data.title}</p>}
      {data.description && <p className="text-sm text-[var(--lego-muted)]">{data.description}</p>}
      <div className="flex items-center gap-2 bg-[var(--lego-bg)] border-2 border-[var(--lego-border)] rounded-xl p-3 text-sm break-all">
        <ExternalLink className="w-4 h-4 shrink-0" />
        {data.url}
      </div>
      {!safe && <p className="text-[#D01012] text-sm font-bold">Unsupported or unsafe URL scheme — will not open automatically.</p>}
      <button onClick={() => navigator.clipboard.writeText(data.url)} className="flex items-center gap-2 text-sm font-bold text-[#0057A6]">
        <Copy className="w-4 h-4" /> Copy link
      </button>
    </PreviewCard>
  );
}

const definition: ActionDefinition<UrlData> = {
  type: 'URL',
  label: 'Website Link',
  description: 'Share a link to open',
  category: 'Navigation',
  riskLevel: 'LOW',
  icon: Link2,
  actionName: 'open_url',
  validate: (d) => {
    const data = d as UrlData;
    return isSafeUrl(data?.url) ? { valid: true, errors: [] } : { valid: false, errors: ['A valid http(s) URL is required'] };
  },
  SenderForm,
  ReceiverPreview,
  universal: { format: 'HTTP/HTTPS URL', encode: (data) => data.url },
};

registerAction(definition);
export default definition;
