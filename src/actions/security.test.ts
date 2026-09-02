// Regression tests for the two real vulnerabilities found and fixed during
// verification: (1) App Link's deepLink/fallbackUrl were attacker-controlled
// strings handed straight to window.location.href / <a href>, allowing a
// scanned QR with a javascript: URI to execute in-page; (2) mailto header
// injection via an unescaped "to" field.
import { describe, it, expect } from 'vitest';
import { isSafeDeepLink } from './appLink';
import { sanitizeMailtoRecipient } from './email';
import { isSafeHttpUrl } from '../utils/urlSafety';

describe('isSafeDeepLink (App Link)', () => {
  it('allows custom app schemes and http(s)', () => {
    expect(isSafeDeepLink('myapp://open')).toBe(true);
    expect(isSafeDeepLink('https://example.com')).toBe(true);
    expect(isSafeDeepLink('http://example.com')).toBe(true);
  });

  it('blocks javascript/data/vbscript/file schemes', () => {
    expect(isSafeDeepLink('javascript:alert(document.cookie)')).toBe(false);
    expect(isSafeDeepLink('JAVASCRIPT:alert(1)')).toBe(false); // case-insensitive
    expect(isSafeDeepLink('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeDeepLink('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeDeepLink('file:///etc/passwd')).toBe(false);
  });

  it('rejects schemeless strings', () => {
    expect(isSafeDeepLink('not-a-uri-at-all')).toBe(false);
    expect(isSafeDeepLink('')).toBe(false);
  });
});

describe('sanitizeMailtoRecipient (mailto header-injection guard)', () => {
  it('leaves a normal address untouched', () => {
    expect(sanitizeMailtoRecipient('person@example.com')).toBe('person@example.com');
  });

  it('strips characters that could inject extra mailto params', () => {
    expect(sanitizeMailtoRecipient('victim@example.com?bcc=attacker@evil.com')).toBe('victim@example.combcc=attacker@evil.com');
    expect(sanitizeMailtoRecipient('victim@example.com&bcc=attacker@evil.com')).not.toContain('&');
    expect(sanitizeMailtoRecipient('victim@example.com\r\nBcc:attacker@evil.com')).not.toMatch(/[\r\n]/);
  });
});

describe('isSafeHttpUrl (Business Card website, App Link fallback, URL action)', () => {
  it('allows only http/https', () => {
    expect(isSafeHttpUrl('https://example.com')).toBe(true);
    expect(isSafeHttpUrl('http://example.com')).toBe(true);
  });

  it('blocks dangerous schemes on links rendered as clickable <a href>', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,x')).toBe(false);
    expect(isSafeHttpUrl(undefined)).toBe(false);
    expect(isSafeHttpUrl('')).toBe(false);
  });
});
