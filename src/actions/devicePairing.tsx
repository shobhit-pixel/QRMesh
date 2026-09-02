import { useState } from 'react';
import { Link, Info } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextInput, PrimaryButton } from '../components/common/Field';
import { PreviewCard, PreviewRow } from '../components/common/PreviewCard';
import { generateSessionId } from '../protocol/security';

export interface DevicePairingData {
  deviceName: string;
  sessionId: string;
  purpose?: string;
}

function SenderForm({ onCreate }: { onCreate: (d: DevicePairingData) => void }) {
  const [deviceName, setDeviceName] = useState('');
  const [purpose, setPurpose] = useState('');
  return (
    <div className="w-full max-w-md">
      <Field label="This device's name" required><TextInput value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="e.g. My Laptop" /></Field>
      <Field label="Purpose (optional)"><TextInput value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Sync settings" /></Field>
      <PrimaryButton disabled={!deviceName.trim()} onClick={() => onCreate({ deviceName: deviceName.trim(), sessionId: generateSessionId(), purpose: purpose || undefined })}>
        Create Pairing QR
      </PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: DevicePairingData; onConfirm: () => void; onCancel: () => void }) {
  return (
    <PreviewCard title="Device Pairing Request" riskLevel="HIGH" confirmLabel="Confirm Pairing" onConfirm={onConfirm} onCancel={onCancel}>
      <div className="flex items-center gap-2 font-black"><Link className="w-5 h-5" />{data.deviceName}</div>
      <PreviewRow label="Session" value={data.sessionId} />
      <PreviewRow label="Purpose" value={data.purpose} />
      <div className="flex items-start gap-2 bg-[var(--lego-bg)] border-2 border-[var(--lego-border)] rounded-xl p-3 text-xs">
        <Info className="w-4 h-4 shrink-0" />
        QRMesh has no network channel back to "{data.deviceName}" — confirming here records the pairing on this device only. The other device won't be notified automatically.
      </div>
    </PreviewCard>
  );
}

const definition: ActionDefinition<DevicePairingData> = {
  type: 'DEVICE_PAIRING',
  label: 'Device Pairing',
  description: 'Start a secure pairing session',
  category: 'Apps & Devices',
  riskLevel: 'HIGH',
  icon: Link,
  actionName: 'device_pairing',
  validate: (d) => {
    const data = d as DevicePairingData;
    return data?.deviceName?.trim() && data?.sessionId
      ? { valid: true, errors: [] }
      : { valid: false, errors: ['Device name is required'] };
  },
  SenderForm,
  ReceiverPreview,
};

registerAction(definition);
export default definition;
