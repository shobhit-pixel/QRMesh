import { useState } from 'react';
import { ShieldAlert, Info } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextInput, PrimaryButton } from '../components/common/Field';
import { PreviewCard, PreviewRow } from '../components/common/PreviewCard';
import { generateSessionId } from '../protocol/security';

export interface AuthorizationData {
  requester: string;
  action: string;
  sessionId: string;
}

function SenderForm({ onCreate }: { onCreate: (d: AuthorizationData) => void }) {
  const [requester, setRequester] = useState('');
  const [action, setAction] = useState('');
  const valid = requester.trim() && action.trim();
  return (
    <div className="w-full max-w-md">
      <Field label="Requesting device/app" required><TextInput value={requester} onChange={(e) => setRequester(e.target.value)} placeholder="e.g. Desktop App" /></Field>
      <Field label="What is being requested" required><TextInput value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g. Sign in to your account" /></Field>
      <PrimaryButton disabled={!valid} onClick={() => onCreate({ requester: requester.trim(), action: action.trim(), sessionId: generateSessionId() })}>
        Create Authorization QR
      </PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: AuthorizationData; onConfirm: () => void; onCancel: () => void }) {
  return (
    <PreviewCard title={`${data.requester} wants to:`} riskLevel="HIGH" confirmLabel="Approve" onConfirm={onConfirm} onCancel={onCancel}>
      <div className="flex items-center gap-2 font-black text-lg"><ShieldAlert className="w-5 h-5 text-[#D01012]" />{data.action}</div>
      <PreviewRow label="Session" value={data.sessionId} />
      <div className="flex items-start gap-2 bg-[var(--lego-bg)] border-2 border-[var(--lego-border)] rounded-xl p-3 text-xs">
        <Info className="w-4 h-4 shrink-0" />
        QRMesh has no channel back to "{data.requester}" — approving only records your decision on this device. Only proceed if you trust the source and expected this request.
      </div>
    </PreviewCard>
  );
}

const definition: ActionDefinition<AuthorizationData> = {
  type: 'AUTHORIZATION',
  label: 'Authorization',
  description: 'Approve or reject a request',
  category: 'Apps & Devices',
  riskLevel: 'HIGH',
  icon: ShieldAlert,
  actionName: 'authorization_request',
  validate: (d) => {
    const data = d as AuthorizationData;
    return data?.requester?.trim() && data?.action?.trim()
      ? { valid: true, errors: [] }
      : { valid: false, errors: ['Requester and action are required'] };
  },
  SenderForm,
  ReceiverPreview,
};

registerAction(definition);
export default definition;
