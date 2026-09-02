import { shareOrDownloadFile } from './fileShare';

function toIcsDate(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function buildIcs(opts: {
  title: string;
  description?: string;
  location?: string;
  start: string; // ISO string
  end: string; // ISO string
  uid?: string;
}): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//QRMesh//EN',
    'BEGIN:VEVENT',
    `UID:${opts.uid || crypto.randomUUID()}`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(opts.start)}`,
    `DTEND:${toIcsDate(opts.end)}`,
    `SUMMARY:${opts.title}`,
  ];
  if (opts.description) lines.push(`DESCRIPTION:${opts.description.replace(/\n/g, '\\n')}`);
  if (opts.location) lines.push(`LOCATION:${opts.location}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\n');
}

export async function downloadIcs(ics: string, filename: string): Promise<void> {
  const name = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  await shareOrDownloadFile(ics, name, 'text/calendar');
}
