import { describe, it, expect } from 'vitest';
import { crc32, sha256Hex, encryptString, decryptString, generateSessionId } from './security';

describe('crc32', () => {
  it('is deterministic', () => {
    expect(crc32('hello world')).toBe(crc32('hello world'));
  });

  it('changes when input changes by one byte', () => {
    expect(crc32('hello world')).not.toBe(crc32('hello worlD'));
  });

  it('returns 8 hex chars', () => {
    expect(crc32('x')).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('sha256Hex', () => {
  it('is deterministic and 64 hex chars', async () => {
    const a = await sha256Hex('hello');
    const b = await sha256Hex('hello');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes with input', async () => {
    const a = await sha256Hex('hello');
    const b = await sha256Hex('Hello');
    expect(a).not.toBe(b);
  });
});

describe('AES-GCM encrypt/decrypt', () => {
  it('round-trips plaintext', async () => {
    const plaintext = JSON.stringify({ secret: 'value', n: 42 });
    const { ciphertext, iv } = await encryptString(plaintext, 'my-passphrase');
    const decrypted = await decryptString(ciphertext, iv, 'my-passphrase');
    expect(decrypted).toBe(plaintext);
  });

  it('fails to decrypt with the wrong passphrase', async () => {
    const { ciphertext, iv } = await encryptString('secret data', 'correct');
    await expect(decryptString(ciphertext, iv, 'wrong')).rejects.toThrow();
  });

  it('produces different ciphertext each time (random IV)', async () => {
    const a = await encryptString('same input', 'pw');
    const b = await encryptString('same input', 'pw');
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });
});

describe('generateSessionId', () => {
  it('produces unique-looking ids', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateSessionId()));
    expect(ids.size).toBe(50);
  });
});
