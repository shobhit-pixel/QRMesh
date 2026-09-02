import { describe, it, expect } from 'vitest';
import { buildVCard } from './vcard';

describe('buildVCard', () => {
  it('produces a well-formed vCard 3.0 block', () => {
    const vcard = buildVCard({ firstName: 'Ada', lastName: 'Lovelace', phone: '+1234567890', email: 'ada@example.com' });
    expect(vcard).toMatch(/^BEGIN:VCARD/);
    expect(vcard).toMatch(/END:VCARD$/);
    expect(vcard).toContain('VERSION:3.0');
    expect(vcard).toContain('FN:Ada Lovelace');
    expect(vcard).toContain('N:Lovelace;Ada;;;');
    expect(vcard).toContain('TEL;TYPE=CELL:+1234567890');
    expect(vcard).toContain('EMAIL:ada@example.com');
  });

  it('falls back to displayName when first/last are absent', () => {
    const vcard = buildVCard({ displayName: 'The Foundation' });
    expect(vcard).toContain('FN:The Foundation');
  });

  it('handles special characters in names without crashing', () => {
    const vcard = buildVCard({ firstName: "O'Brien-Müller", lastName: '中村' });
    expect(vcard).toContain("FN:O'Brien-Müller 中村");
  });

  it('escapes newlines in notes', () => {
    const vcard = buildVCard({ displayName: 'X', notes: 'line1\nline2' });
    expect(vcard).toContain('NOTE:line1\\nline2');
    expect(vcard).not.toContain('NOTE:line1\nline2');
  });

  it('omits optional fields that were not provided', () => {
    const vcard = buildVCard({ displayName: 'Solo' });
    expect(vcard).not.toContain('ORG:');
    expect(vcard).not.toContain('TEL');
    expect(vcard).not.toContain('EMAIL:');
  });
});
