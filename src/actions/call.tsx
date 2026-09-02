import { useState } from 'react';
import { PhoneCall } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextInput, PrimaryButton } from '../components/common/Field';
import { PreviewCard } from '../components/common/PreviewCard';
import { encodeTel } from '../protocol/standardFormats';

export interface CallData {
  phone: string;
}

function SenderForm({ onCreate }: { onCreate: (d: CallData) => void }) {
  const [phone, setPhone] = useState('');
  return (
    <div className="w-full max-w-md">
      <Field label="Phone number" required>
        <TextInput type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
      </Field>
      <PrimaryButton disabled={!phone.trim()} onClick={() => onCreate({ phone: phone.trim() })}>Create QR</PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: CallData; onConfirm: () => void; onCancel: () => void }) {
  return (
    <PreviewCard
      title={`Call ${data.phone}?`}
      riskLevel="HIGH"
      confirmLabel="Call"
      onConfirm={() => {
        window.location.href = encodeTel(data.phone);
        onConfirm();
      }}
      onCancel={onCancel}
    >
      <div className="flex items-center gap-2 justify-center text-2xl font-black py-4">
        <PhoneCall className="w-6 h-6 text-[#00A650]" /> {data.phone}
      </div>
      <p className="text-xs text-[var(--lego-muted)] text-center">This will open your phone app's dialer — nothing is called until you confirm there too.</p>
    </PreviewCard>
  );
}

const definition: ActionDefinition<CallData> = {
  type: 'CALL',
  label: 'Phone Call',
  description: 'Request a call to a number',
  category: 'Communication',
  riskLevel: 'HIGH',
  icon: PhoneCall,
  actionName: 'request_call',
  validate: (d) => {
    const data = d as CallData;
    return typeof data?.phone === 'string' && data.phone.trim().length > 0
      ? { valid: true, errors: [] }
      : { valid: false, errors: ['Phone number is required'] };
  },
  SenderForm,
  ReceiverPreview,
  universal: { format: 'tel:', encode: (data) => encodeTel(data.phone) },
};

registerAction(definition);
export default definition;
