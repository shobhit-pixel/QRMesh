// Integrity + optional encryption helpers built on Web Crypto (SubtleCrypto). No custom crypto.

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Fast, non-cryptographic 32-bit checksum for packet-level corruption detection (cheap, sync). */
export function crc32(str: string): string {
  let crc = 0xffffffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  crc = (crc ^ 0xffffffff) >>> 0;
  return crc.toString(16).padStart(8, '0');
}

/** Cryptographic SHA-256 for whole-payload integrity verification (async). */
export async function sha256Hex(str: string): Promise<string> {
  const bytes = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return toHex(digest);
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufToBase64(buf: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

const SALT = new TextEncoder().encode('qrmesh-v2-salt');

/** Encrypts plaintext JSON string with AES-GCM using a passphrase-derived key. Returns base64 ciphertext + base64 IV. */
export async function encryptString(
  plaintext: string,
  passphrase: string
): Promise<{ ciphertext: string; iv: string }> {
  const key = await deriveKey(passphrase, SALT);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return { ciphertext: bufToBase64(encrypted), iv: bufToBase64(iv.buffer) };
}

export async function decryptString(
  ciphertext: string,
  ivB64: string,
  passphrase: string
): Promise<string> {
  const key = await deriveKey(passphrase, SALT);
  const iv = new Uint8Array(base64ToBuf(ivB64));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    base64ToBuf(ciphertext)
  );
  return new TextDecoder().decode(decrypted);
}

export function generateSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
