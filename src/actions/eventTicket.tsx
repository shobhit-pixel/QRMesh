import { useState } from 'react';
import { Ticket } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextInput, PrimaryButton } from '../components/common/Field';
import { PreviewCard, PreviewRow } from '../components/common/PreviewCard';

export interface EventTicketData {
  eventName: string;
  ticketId: string;
  attendee?: string;
  when?: string; // ISO
  venue?: string;
  seat?: string;
  issuer?: string;
}

function SenderForm({ onCreate }: { onCreate: (d: EventTicketData) => void }) {
  const [d, setD] = useState<Partial<EventTicketData>>({});
  const valid = !!(d.eventName?.trim() && d.ticketId?.trim());
  const set = (k: keyof EventTicketData) => (e: React.ChangeEvent<HTMLInputElement>) => setD((p) => ({ ...p, [k]: e.target.value }));
  return (
    <div className="w-full max-w-md">
      <Field label="Event name" required><TextInput value={d.eventName || ''} onChange={set('eventName')} /></Field>
      <Field label="Ticket ID" required><TextInput value={d.ticketId || ''} onChange={set('ticketId')} /></Field>
      <Field label="Attendee"><TextInput value={d.attendee || ''} onChange={set('attendee')} /></Field>
      <Field label="Date & time"><TextInput type="datetime-local" value={d.when || ''} onChange={set('when')} /></Field>
      <Field label="Venue"><TextInput value={d.venue || ''} onChange={set('venue')} /></Field>
      <Field label="Seat"><TextInput value={d.seat || ''} onChange={set('seat')} /></Field>
      <Field label="Issuer"><TextInput value={d.issuer || ''} onChange={set('issuer')} /></Field>
      <PrimaryButton disabled={!valid} onClick={() => onCreate({ ...d, when: d.when ? new Date(d.when).toISOString() : undefined } as EventTicketData)}>
        Create QR
      </PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: EventTicketData; onConfirm: () => void; onCancel: () => void }) {
  return (
    <PreviewCard title="Event Ticket" riskLevel="MEDIUM" confirmLabel="Save Ticket" onConfirm={onConfirm} onCancel={onCancel}>
      <div className="rounded-xl border-4 border-dashed border-[var(--lego-border)] p-4 bg-[var(--lego-bg)]">
        <div className="flex items-center gap-2 font-black text-lg"><Ticket className="w-5 h-5 text-[#FFD500]" fill="#FFD500" />{data.eventName}</div>
        <PreviewRow label="Ticket ID" value={data.ticketId} />
        <PreviewRow label="Attendee" value={data.attendee} />
        <PreviewRow label="When" value={data.when ? new Date(data.when).toLocaleString() : undefined} />
        <PreviewRow label="Venue" value={data.venue} />
        <PreviewRow label="Seat" value={data.seat} />
        <PreviewRow label="Issued by" value={data.issuer} />
      </div>
    </PreviewCard>
  );
}

const definition: ActionDefinition<EventTicketData> = {
  type: 'EVENT_TICKET',
  label: 'Event Ticket',
  description: 'Share an event ticket',
  category: 'Events & Identity',
  riskLevel: 'MEDIUM',
  icon: Ticket,
  actionName: 'share_event_ticket',
  validate: (d) => {
    const data = d as EventTicketData;
    return data?.eventName?.trim() && data?.ticketId?.trim()
      ? { valid: true, errors: [] }
      : { valid: false, errors: ['Event name and ticket ID are required'] };
  },
  SenderForm,
  ReceiverPreview,
};

registerAction(definition);
export default definition;
