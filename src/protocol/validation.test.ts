import { describe, it, expect } from 'vitest';
import { validatePayloadShape, validateRawSize } from './validation';
import { PROTOCOL_VERSION } from './types';

const base = {
  protocol: 'QRMesh' as const,
  version: PROTOCOL_VERSION,
  id: 'abc',
  type: 'TEXT' as const,
  action: 'share_text',
  createdAt: Date.now(),
  data: { text: 'hi' },
};

describe('validatePayloadShape', () => {
  it('accepts a well-formed payload', () => {
    expect(validatePayloadShape(base).valid).toBe(true);
  });

  it('rejects null/non-object candidates', () => {
    expect(validatePayloadShape(null).valid).toBe(false);
    expect(validatePayloadShape('a string').valid).toBe(false);
    expect(validatePayloadShape(42).valid).toBe(false);
    expect(validatePayloadShape(undefined).valid).toBe(false);
  });

  it('rejects an empty object', () => {
    const result = validatePayloadShape({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects wrong protocol string', () => {
    expect(validatePayloadShape({ ...base, protocol: 'NotQRMesh' }).valid).toBe(false);
  });

  it('rejects missing type', () => {
    const { type, ...rest } = base;
    expect(validatePayloadShape(rest).valid).toBe(false);
  });

  it('rejects missing action string but action is not strictly checked as required type — data missing IS required', () => {
    const { data, ...rest } = base;
    expect(validatePayloadShape(rest).valid).toBe(false);
  });

  it('rejects a version newer than this build supports', () => {
    expect(validatePayloadShape({ ...base, version: PROTOCOL_VERSION + 1 }).valid).toBe(false);
  });

  it('accepts an older (still-supported) version', () => {
    expect(validatePayloadShape({ ...base, version: 1 }).valid).toBe(true);
  });

  it('rejects an expired payload', () => {
    const result = validatePayloadShape({ ...base, expiresAt: Date.now() - 1000 });
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/expired/i);
  });

  it('accepts a payload that has not expired yet', () => {
    expect(validatePayloadShape({ ...base, expiresAt: Date.now() + 60_000 }).valid).toBe(true);
  });
});

describe('validateRawSize', () => {
  it('accepts small strings', () => {
    expect(validateRawSize('{"a":1}').valid).toBe(true);
  });

  it('rejects strings over the safety ceiling (decompression-bomb guard)', () => {
    const huge = 'x'.repeat(2_000_001);
    expect(validateRawSize(huge).valid).toBe(false);
  });
});
