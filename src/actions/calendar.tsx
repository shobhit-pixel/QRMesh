import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextInput, TextArea, PrimaryButton } from '../components/common/Field';
import { PreviewCard, PreviewRow } from '../components/common/PreviewCard';
import { buildIcs, downloadIcs } from '../utils/ics';

export interface CalendarEventData {
  title: string;
  description?: string;
  location?: string;
  start: string; // ISO
  end: string; // ISO
}

function SenderForm({ onCreate }: { onCreate: (d: CalendarEventData) => void }) {
  const [d, setD] = useState<Partial<CalendarEventData>>({});
  const set = (k: keyof CalendarEventData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setD((prev) => ({ ...prev, [k]: e.target.value }));
  const valid = !!(d.title && d.start && d.end);
  return (
    <div className="w-full max-w-md">
      <Field label="Title" required><TextInput value={d.title || ''} onChange={set('title')} /></Field>
      <div className="flex gap-3">
        <Field label="Start" required><TextInput type="datetime-local" value={d.start || ''} onChange={set('start')} /></Field>
        <Field label="End" required><TextInput type="datetime-local" value={d.end || ''} onChange={set('end')} /></Field>
      </div>
      <Field label="Location"><TextInput value={d.location || ''} onChange={set('location')} /></Field>
      <Field label="Description"><TextArea rows={3} value={d.description || ''} onChange={set('description')} /></Field>
      <PrimaryButton
        disabled={!valid}
        onClick={() => onCreate({ title: d.title!, start: new Date(d.start!).toISOString(), end: new Date(d.end!).toISOString(), location: d.location, description: d.description })}
      >
        Create QR
      </PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: CalendarEventData; onConfirm: () => void; onCancel: () => void }) {
  return (
    <PreviewCard
      title="Calendar Event"
      riskLevel="MEDIUM"
      confirmLabel="Add to Calendar"
      onConfirm={() => {
        downloadIcs(buildIcs(data), data.title);
        onConfirm();
      }}
      onCancel={onCancel}
    >
      <div className="flex items-center gap-2 font-black"><CalendarPlus className="w-5 h-5" />{data.title}</div>
      <PreviewRow label="Starts" value={new Date(data.start).toLocaleString()} />
      <PreviewRow label="Ends" value={new Date(data.end).toLocaleString()} />
      <PreviewRow label="Location" value={data.location} />
      {data.description && <p className="text-sm text-[var(--lego-muted)]">{data.description}</p>}
    </PreviewCard>
  );
}

const definition: ActionDefinition<CalendarEventData> = {
  type: 'CALENDAR_EVENT',
  label: 'Calendar Event',
  description: 'Share an event to add to a calendar',
  category: 'Productivity',
  riskLevel: 'MEDIUM',
  icon: CalendarPlus,
  actionName: 'share_calendar_event',
  validate: (d) => {
    const data = d as CalendarEventData;
    return data?.title && data?.start && data?.end
      ? { valid: true, errors: [] }
      : { valid: false, errors: ['Title, start, and end are required'] };
  },
  SenderForm,
  ReceiverPreview,
};

registerAction(definition);
export default definition;
