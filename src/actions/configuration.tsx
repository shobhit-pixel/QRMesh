import { useState } from 'react';
import { Settings2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextInput, PrimaryButton } from '../components/common/Field';
import { PreviewCard, PreviewRow } from '../components/common/PreviewCard';

export interface ConfigurationData {
  appName?: string;
  settings: { key: string; value: string }[];
}

const SECRET_PATTERN = /(key|token|secret|password|pwd|credential|private)/i;

function SenderForm({ onCreate }: { onCreate: (d: ConfigurationData) => void }) {
  const [appName, setAppName] = useState('');
  const [settings, setSettings] = useState([{ key: '', value: '' }]);
  const blocked = settings.filter((s) => SECRET_PATTERN.test(s.key));
  const usable = settings.filter((s) => s.key.trim() && s.value.trim() && !SECRET_PATTERN.test(s.key));
  const valid = usable.length > 0;

  const update = (i: number, k: 'key' | 'value', v: string) =>
    setSettings((prev) => prev.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));

  return (
    <div className="w-full max-w-md">
      <Field label="App / config name"><TextInput value={appName} onChange={(e) => setAppName(e.target.value)} /></Field>
      {settings.map((s, i) => (
        <div key={i} className="flex gap-2 mb-3">
          <TextInput placeholder="Setting" value={s.key} onChange={(e) => update(i, 'key', e.target.value)} />
          <TextInput placeholder="Value" value={s.value} onChange={(e) => update(i, 'value', e.target.value)} />
          <button onClick={() => setSettings((prev) => prev.filter((_, idx) => idx !== i))} className="shrink-0 text-[#D01012]"><Trash2 className="w-5 h-5" /></button>
        </div>
      ))}
      <button onClick={() => setSettings((prev) => [...prev, { key: '', value: '' }])} className="flex items-center gap-2 text-sm font-bold text-[#0057A6] mb-4">
        <Plus className="w-4 h-4" /> Add setting
      </button>
      {blocked.length > 0 && (
        <div className="flex items-start gap-2 bg-[#FFF7D6] border-2 border-[var(--lego-border)] rounded-xl p-3 mb-4 text-xs font-bold">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#B29500]" />
          Fields named like "{blocked[0].key}" look like secrets and are blocked from export — configuration transfer never carries API keys, tokens, or passwords.
        </div>
      )}
      <PrimaryButton disabled={!valid} onClick={() => onCreate({ appName: appName || undefined, settings: usable })}>Create QR</PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: ConfigurationData; onConfirm: () => void; onCancel: () => void }) {
  return (
    <PreviewCard title={data.appName ? `${data.appName} Configuration` : 'Configuration Received'} riskLevel="MEDIUM" confirmLabel="Apply" onConfirm={onConfirm} onCancel={onCancel}>
      <Settings2 className="w-5 h-5 text-[#0057A6]" />
      {data.settings.map((s, i) => (
        <PreviewRow key={i} label={s.key} value={s.value} />
      ))}
    </PreviewCard>
  );
}

const definition: ActionDefinition<ConfigurationData> = {
  type: 'CONFIGURATION',
  label: 'Configuration',
  description: 'Share non-secret app settings',
  category: 'Apps & Devices',
  riskLevel: 'MEDIUM',
  icon: Settings2,
  actionName: 'share_configuration',
  validate: (d) => {
    const data = d as ConfigurationData;
    if (!Array.isArray(data?.settings) || data.settings.length === 0) return { valid: false, errors: ['At least one setting is required'] };
    const leaked = data.settings.filter((s) => SECRET_PATTERN.test(s.key));
    if (leaked.length > 0) return { valid: false, errors: ['Payload contains fields that look like secrets and was rejected'] };
    return { valid: true, errors: [] };
  },
  SenderForm,
  ReceiverPreview,
};

registerAction(definition);

// SETTINGS is a distinct action type in the registry (user-facing preferences,
// e.g. theme/language) but shares configuration's non-secret-only pipeline.
registerAction({
  ...definition,
  type: 'SETTINGS',
  label: 'Settings',
  description: 'Share app preferences (theme, language, etc.)',
  actionName: 'share_settings',
});

export default definition;
