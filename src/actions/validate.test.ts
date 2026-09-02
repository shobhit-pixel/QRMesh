import { describe, it, expect } from 'vitest';
import { allActions, getAction } from './registry';
import './index'; // registers every action type as a side effect

describe('action registry', () => {
  it('registers all 25 documented action types', () => {
    const types = allActions().map((a) => a.type).sort();
    expect(types.length).toBeGreaterThanOrEqual(25);
    expect(new Set(types).size).toBe(types.length); // no duplicate registrations
  });

  it('every action has a non-empty risk level, label, and validate fn', () => {
    for (const def of allActions()) {
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(def.riskLevel);
      expect(def.label.length).toBeGreaterThan(0);
      expect(typeof def.validate).toBe('function');
    }
  });
});

describe('TEXT validation', () => {
  it('accepts non-empty text', () => {
    expect(getAction('TEXT')!.validate({ text: 'hello' }).valid).toBe(true);
  });
  it('rejects empty text', () => {
    expect(getAction('TEXT')!.validate({ text: '' }).valid).toBe(false);
  });
  it('rejects missing text field', () => {
    expect(getAction('TEXT')!.validate({}).valid).toBe(false);
  });
});

describe('URL validation', () => {
  const validate = (url: string) => getAction('URL')!.validate({ url }).valid;
  it('accepts http/https', () => {
    expect(validate('https://example.com')).toBe(true);
    expect(validate('http://example.com')).toBe(true);
  });
  it('rejects dangerous schemes', () => {
    expect(validate('javascript:alert(1)')).toBe(false);
    expect(validate('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(validate('vbscript:msgbox(1)')).toBe(false);
    expect(validate('file:///etc/passwd')).toBe(false);
  });
  it('rejects garbage input', () => {
    expect(validate('not a url')).toBe(false);
    expect(validate('')).toBe(false);
  });
});

describe('LOCATION validation', () => {
  const validate = (data: unknown) => getAction('LOCATION')!.validate(data).valid;
  it('accepts valid coordinates', () => {
    expect(validate({ lat: 23.0225, lng: 72.5714 })).toBe(true);
  });
  it('accepts boundary coordinates', () => {
    expect(validate({ lat: 90, lng: 180 })).toBe(true);
    expect(validate({ lat: -90, lng: -180 })).toBe(true);
  });
  it('rejects missing coordinates', () => {
    expect(validate({})).toBe(false);
    expect(validate({ lat: 12 })).toBe(false);
  });
});

describe('CALL / SMS validation', () => {
  it('requires a phone number', () => {
    expect(getAction('CALL')!.validate({ phone: '+911234567890' }).valid).toBe(true);
    expect(getAction('CALL')!.validate({ phone: '' }).valid).toBe(false);
    expect(getAction('SMS')!.validate({ phone: '' }).valid).toBe(false);
  });
});

describe('EMAIL validation', () => {
  const validate = (to: string) => getAction('EMAIL')!.validate({ to }).valid;
  it('requires an @ in the recipient', () => {
    expect(validate('person@example.com')).toBe(true);
    expect(validate('not-an-email')).toBe(false);
  });
});

describe('PAYMENT_REQUEST validation', () => {
  const validate = (amount: unknown) => getAction('PAYMENT_REQUEST')!.validate({ amount }).valid;
  it('accepts a positive amount', () => {
    expect(validate(499.5)).toBe(true);
  });
  it('rejects zero, negative, NaN, and Infinity', () => {
    expect(validate(0)).toBe(false);
    expect(validate(-10)).toBe(false);
    expect(validate(NaN)).toBe(false);
    expect(validate(Infinity)).toBe(false);
  });
  it('rejects missing/non-numeric amount', () => {
    expect(validate(undefined)).toBe(false);
    expect(validate('100')).toBe(false);
  });
});

describe('CONFIGURATION secret-field blocking', () => {
  const validate = (settings: { key: string; value: string }[]) => getAction('CONFIGURATION')!.validate({ settings }).valid;
  it('accepts ordinary settings', () => {
    expect(validate([{ key: 'theme', value: 'dark' }])).toBe(true);
  });
  it('rejects fields that look like secrets', () => {
    expect(validate([{ key: 'apiKey', value: 'sk-123' }])).toBe(false);
    expect(validate([{ key: 'password', value: 'hunter2' }])).toBe(false);
    expect(validate([{ key: 'auth_token', value: 'abc' }])).toBe(false);
  });
});

describe('CONTACT validation', () => {
  it('requires at least one name field', () => {
    expect(getAction('CONTACT')!.validate({ firstName: 'A' }).valid).toBe(true);
    expect(getAction('CONTACT')!.validate({}).valid).toBe(false);
  });
});

describe('CALENDAR_EVENT validation', () => {
  it('requires title, start, and end', () => {
    const now = new Date().toISOString();
    expect(getAction('CALENDAR_EVENT')!.validate({ title: 'Meetup', start: now, end: now }).valid).toBe(true);
    expect(getAction('CALENDAR_EVENT')!.validate({ title: 'Meetup' }).valid).toBe(false);
  });
});

describe('MULTI_ACTION validation', () => {
  it('requires at least one bundled item', () => {
    expect(getAction('MULTI_ACTION')!.validate({ items: [{ type: 'TEXT', data: { text: 'x' } }] }).valid).toBe(true);
    expect(getAction('MULTI_ACTION')!.validate({ items: [] }).valid).toBe(false);
  });
});
