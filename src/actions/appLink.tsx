import { useState } from 'react';
import { AppWindow } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextInput, PrimaryButton } from '../components/common/Field';
import { PreviewCard, PreviewRow } from '../components/common/PreviewCard';
import { isSafeHttpUrl } from '../utils/urlSafety';

export interface AppLinkData {
  appName: string;
  deepLink: string;
  fallbackUrl?: string;
}

const DANGEROUS_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:'];

export function isSafeDeepLink(link: string): boolean {
  const normalized = link.trim().toLowerCase();
  if (DANGEROUS_SCHEMES.some((scheme) => normalized.startsWith(scheme))) return false;
  // Require an explicit scheme (custom app scheme like myapp://, or http/https) —
  // reject schemeless strings that browsers could reinterpret unexpectedly.
  return /^[a-z][a-z0-9+.-]*:/.test(normalized);
}

function SenderForm({ onCreate }: { onCreate: (d: AppLinkData) => void }) {
  const [d, setD] = useState<Partial<AppLinkData>>({});
  const valid = !!(d.appName?.trim() && d.deepLink?.trim());
  return (
    <div className="w-full max-w-md">
      <Field label="App name" required><TextInput value={d.appName || ''} onChange={(e) => setD((p) => ({ ...p, appName: e.target.value }))} /></Field>
      <Field label="Deep link" required hint="e.g. myapp://open"><TextInput value={d.deepLink || ''} onChange={(e) => setD((p) => ({ ...p, deepLink: e.target.value }))} /></Field>
      <Field label="Fallback website"><TextInput value={d.fallbackUrl || ''} onChange={(e) => setD((p) => ({ ...p, fallbackUrl: e.target.value }))} /></Field>
      <PrimaryButton disabled={!valid} onClick={() => onCreate(d as AppLinkData)}>Create QR</PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: AppLinkData; onConfirm: () => void; onCancel: () => void }) {
  const [failed, setFailed] = useState(false);
  const safe = isSafeDeepLink(data.deepLink);
  return (
    <PreviewCard
      title="Open App"
      riskLevel="HIGH"
      confirmLabel={`Open ${data.appName}`}
      onConfirm={() => {
        if (safe) {
          try {
            window.location.href = data.deepLink;
            setTimeout(() => setFailed(true), 1500);
          } catch {
            setFailed(true);
          }
        } else {
          setFailed(true);
        }
        onConfirm();
      }}
      onCancel={onCancel}
    >
      <div className="flex items-center gap-2 font-black"><AppWindow className="w-5 h-5" />{data.appName}</div>
      <PreviewRow label="Link" value={data.deepLink} />
      {!safe && <p className="text-[#D01012] text-sm font-bold">This link uses an unsafe or unrecognized scheme and will not be opened.</p>}
      <p className="text-xs text-[var(--lego-muted)]">Requesting to open an external app. QRMesh never launches anything without your confirmation.</p>
      {(failed || !safe) && isSafeHttpUrl(data.fallbackUrl) && (
        <a href={data.fallbackUrl} target="_blank" rel="noopener noreferrer" className="block text-center px-4 py-2 rounded-xl bg-[#0057A6] text-white font-black uppercase mt-2">
          Open Website Instead
        </a>
      )}
    </PreviewCard>
  );
}

const definition: ActionDefinition<AppLinkData> = {
  type: 'APP_LINK',
  label: 'App Link',
  description: 'Open another app via deep link',
  category: 'Apps & Devices',
  riskLevel: 'HIGH',
  icon: AppWindow,
  actionName: 'open_app_link',
  validate: (d) => {
    const data = d as AppLinkData;
    if (!data?.appName?.trim() || !data?.deepLink?.trim()) {
      return { valid: false, errors: ['App name and deep link are required'] };
    }
    return { valid: true, errors: [] };
  },
  SenderForm,
  ReceiverPreview,
};

registerAction(definition);
export default definition;
