import { describe, it, expect } from 'vitest';
import { buildIcs } from './ics';

describe('buildIcs', () => {
  it('produces a well-formed VCALENDAR/VEVENT block', () => {
    const ics = buildIcs({
      title: 'Team Sync',
      start: '2026-01-01T10:00:00.000Z',
      end: '2026-01-01T11:00:00.000Z',
      location: 'Room 5',
      description: 'Quarterly planning',
    });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Team Sync');
    expect(ics).toContain('LOCATION:Room 5');
    expect(ics).toContain('DESCRIPTION:Quarterly planning');
    expect(ics).toContain('DTSTART:20260101T100000Z');
    expect(ics).toContain('DTEND:20260101T110000Z');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('generates a unique UID per call when not provided', () => {
    const a = buildIcs({ title: 'A', start: '2026-01-01T00:00:00.000Z', end: '2026-01-01T01:00:00.000Z' });
    const b = buildIcs({ title: 'A', start: '2026-01-01T00:00:00.000Z', end: '2026-01-01T01:00:00.000Z' });
    const uidOf = (s: string) => s.match(/UID:(.+)/)?.[1];
    expect(uidOf(a)).not.toBe(uidOf(b));
  });
});
