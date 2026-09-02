import { useState } from 'react';
import { BellRing } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextInput, TextArea, PrimaryButton } from '../components/common/Field';
import { PreviewCard, PreviewRow } from '../components/common/PreviewCard';
import { downloadIcs } from '../utils/ics';

export interface ReminderData {
  title: string;
  description?: string;
  when: string; // ISO
}

function SenderForm({ onCreate }: { onCreate: (d: ReminderData) => void }) {
  const [d, setD] = useState<Partial<ReminderData>>({});
  const valid = !!(d.title && d.when);
  return (
    <div className="w-full max-w-md">
      <Field label="Title" required><TextInput value={d.title || ''} onChange={(e) => setD((p) => ({ ...p, title: e.target.value }))} /></Field>
      <Field label="Date & time" required><TextInput type="datetime-local" value={d.when || ''} onChange={(e) => setD((p) => ({ ...p, when: e.target.value }))} /></Field>
      <Field label="Description"><TextArea rows={3} value={d.description || ''} onChange={(e) => setD((p) => ({ ...p, description: e.target.value }))} /></Field>
      <PrimaryButton disabled={!valid} onClick={() => onCreate({ title: d.title!, when: new Date(d.when!).toISOString(), description: d.description })}>
        Create QR
      </PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: ReminderData; onConfirm: () => void; onCancel: () => void }) {
  return (
    <PreviewCard
      title="Reminder"
      riskLevel="LOW"
      confirmLabel="Create Reminder"
      onConfirm={() => {
        // Browsers have no native reminders API — the honest fallback is a calendar
        // event file the OS reminder/calendar app can import.
        const start = data.when;
        const end = new Date(new Date(data.when).getTime() + 15 * 60 * 1000).toISOString();
        downloadIcs(
          `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//QRMesh//EN\nBEGIN:VEVENT\nUID:${crypto.randomUUID()}\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z\nDTSTART:${start.replace(/[-:]/g, '').split('.')[0]}Z\nDTEND:${end.replace(/[-:]/g, '').split('.')[0]}Z\nSUMMARY:${data.title}\n${data.description ? `DESCRIPTION:${data.description}\n` : ''}END:VEVENT\nEND:VCALENDAR`,
          data.title
        );
        onConfirm();
      }}
      onCancel={onCancel}
    >
      <div className="flex items-center gap-2 font-black"><BellRing className="w-5 h-5" />{data.title}</div>
      <PreviewRow label="When" value={new Date(data.when).toLocaleString()} />
      {data.description && <p className="text-sm text-[var(--lego-muted)]">{data.description}</p>}
      <p className="text-xs text-[var(--lego-muted)]">Browsers can't create native reminders directly — this downloads a calendar file your Reminders/Calendar app can import.</p>
    </PreviewCard>
  );
}

const definition: ActionDefinition<ReminderData> = {
  type: 'REMINDER',
  label: 'Reminder',
  description: 'Share a reminder',
  category: 'Productivity',
  riskLevel: 'LOW',
  icon: BellRing,
  actionName: 'share_reminder',
  validate: (d) => {
    const data = d as ReminderData;
    return data?.title && data?.when ? { valid: true, errors: [] } : { valid: false, errors: ['Title and time are required'] };
  },
  SenderForm,
  ReceiverPreview,
};

registerAction(definition);
export default definition;
