import { useState } from 'react';
import { Wifi, Copy, Check } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextInput, Select, PrimaryButton } from '../components/common/Field';
import { PreviewCard, PreviewRow } from '../components/common/PreviewCard';
import { encodeWifi } from '../protocol/standardFormats';

export interface WifiData {
  ssid: string;
  password?: string;
  security: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
}

function SenderForm({ onCreate }: { onCreate: (d: WifiData) => void }) {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [security, setSecurity] = useState<WifiData['security']>('WPA');
  const [hidden, setHidden] = useState(false);
  const valid = ssid.trim().length > 0 && (security === 'nopass' || password.length > 0);
  return (
    <div className="w-full max-w-md">
      <Field label="Network name (SSID)" required>
        <TextInput value={ssid} onChange={(e) => setSsid(e.target.value)} />
      </Field>
      <Field label="Security type">
        <Select value={security} onChange={(e) => setSecurity(e.target.value as WifiData['security'])}>
          <option value="WPA">WPA/WPA2</option>
          <option value="WEP">WEP</option>
          <option value="nopass">Open (no password)</option>
        </Select>
      </Field>
      {security !== 'nopass' && (
        <Field label="Password" required>
          <TextInput type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
      )}
      <label className="flex items-center gap-2 mb-4 font-bold text-sm">
        <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
        Hidden network
      </label>
      <PrimaryButton disabled={!valid} onClick={() => onCreate({ ssid: ssid.trim(), password: security === 'nopass' ? undefined : password, security, hidden })}>
        Create QR
      </PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: WifiData; onConfirm: () => void; onCancel: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <PreviewCard title="Wi-Fi Network" riskLevel="MEDIUM" onConfirm={onConfirm} onCancel={onCancel} confirmLabel="Got it">
      <div className="flex items-center gap-2">
        <Wifi className="w-5 h-5 text-[#0057A6] shrink-0" />
        <span className="font-black">{data.ssid}</span>
      </div>
      <PreviewRow label="Security" value={data.security === 'nopass' ? 'Open' : data.security} />
      {data.password && (
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(data.password!);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-2 text-sm font-bold text-[#0057A6]"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Password copied' : 'Copy password'}
        </button>
      )}
      <p className="text-xs text-[var(--lego-muted)]">
        Browsers can't join Wi-Fi networks automatically. Open your device's Wi-Fi settings, select "{data.ssid}", and paste the password.
      </p>
    </PreviewCard>
  );
}

const definition: ActionDefinition<WifiData> = {
  type: 'WIFI',
  label: 'Wi-Fi',
  description: 'Share network credentials',
  category: 'Connectivity',
  riskLevel: 'MEDIUM',
  icon: Wifi,
  actionName: 'share_wifi',
  validate: (d) => {
    const data = d as WifiData;
    return typeof data?.ssid === 'string' && data.ssid.length > 0
      ? { valid: true, errors: [] }
      : { valid: false, errors: ['SSID is required'] };
  },
  SenderForm,
  ReceiverPreview,
  universal: { format: 'WIFI:', encode: (data) => encodeWifi(data.ssid, data.password, data.security, data.hidden) },
};

registerAction(definition);
export default definition;
