import { shareOrDownloadFile } from './fileShare';

export interface VCardFields {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  website?: string;
  notes?: string;
  photoBase64?: string; // raw base64, no data: prefix, PNG — used for QRMesh Transfer / .vcf export
  /** Same photo pre-compressed at several sizes, largest first — lets a single
   * Universal QR pick the biggest one that still fits alongside this card's
   * text fields, instead of guessing one fixed size for every card. */
  photoVariants?: string[];
}

/** RFC 2426 §5.8.4 escaping: backslash, comma, semicolon, and newline are structural. */
export function escapeVCardValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

/** Splits a structured field (N, ADR) on ';' — but not on a backslash-escaped ';' — then unescapes each part. */
function splitVCardComponents(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '\\' && i + 1 < value.length) {
      current += value[i] + value[i + 1];
      i++;
      continue;
    }
    if (value[i] === ';') {
      parts.push(current);
      current = '';
      continue;
    }
    current += value[i];
  }
  parts.push(current);
  return parts.map(unescapeVCardValue);
}

export function unescapeVCardValue(value: string): string {
  let out = '';
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '\\' && i + 1 < value.length) {
      const next = value[i + 1];
      if (next === 'n' || next === 'N') { out += '\n'; i++; continue; }
      if (next === ',' || next === ';' || next === '\\') { out += next; i++; continue; }
    }
    out += value[i];
  }
  return out;
}

/**
 * Builds a vCard 3.0 payload. Pass `includePhoto: false` when generating a
 * Universal QR — a full photo turns the QR into a dense, unreliable mess, so
 * the standard-scanner-compatible QR is text-only. QRMesh's own receiver
 * carries the photo separately in its structured payload, not in this string.
 */
export function buildVCard(c: VCardFields, options: { includePhoto?: boolean } = {}): string {
  const includePhoto = options.includePhoto ?? true;
  const esc = escapeVCardValue;
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  const fn = c.displayName || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown';
  lines.push(`N:${esc(c.lastName || '')};${esc(c.firstName || '')};;;`);
  lines.push(`FN:${esc(fn)}`);
  if (c.company) lines.push(`ORG:${esc(c.company)}`);
  if (c.jobTitle) lines.push(`TITLE:${esc(c.jobTitle)}`);
  if (c.phone) lines.push(`TEL;TYPE=CELL:${esc(c.phone)}`);
  if (c.phone2) lines.push(`TEL;TYPE=WORK:${esc(c.phone2)}`);
  if (c.email) lines.push(`EMAIL:${esc(c.email)}`);
  if (c.website) lines.push(`URL:${esc(c.website)}`);
  if (c.address || c.city || c.state || c.country) {
    lines.push(`ADR:;;${esc(c.address || '')};${esc(c.city || '')};${esc(c.state || '')};;${esc(c.country || '')}`);
  }
  if (c.notes) lines.push(`NOTE:${esc(c.notes)}`);
  if (includePhoto && c.photoBase64) lines.push(`PHOTO;ENCODING=b;TYPE=PNG:${c.photoBase64}`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

/** Parses a vCard 3.0 (or close-enough 2.1) block back into fields, for the receiver. */
export function parseVCard(raw: string): VCardFields | null {
  if (!/BEGIN:VCARD/i.test(raw)) return null;

  // Unfold: a line starting with a space/tab is a continuation of the previous line.
  const unfolded: string[] = [];
  for (const line of raw.split(/\r\n|\r|\n/)) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }

  const fields: VCardFields = {};
  for (const line of unfolded) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const keyPart = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1);
    const [key, ...params] = keyPart.split(';');
    const keyUpper = key.toUpperCase();

    if (keyUpper === 'N') {
      const parts = splitVCardComponents(value);
      if (parts[0]) fields.lastName = parts[0];
      if (parts[1]) fields.firstName = parts[1];
    } else if (keyUpper === 'FN') {
      fields.displayName = unescapeVCardValue(value);
    } else if (keyUpper === 'ORG') {
      fields.company = unescapeVCardValue(value);
    } else if (keyUpper === 'TITLE') {
      fields.jobTitle = unescapeVCardValue(value);
    } else if (keyUpper === 'TEL') {
      const isWork = params.some((p) => /WORK/i.test(p));
      if (isWork && !fields.phone2) fields.phone2 = unescapeVCardValue(value);
      else if (!fields.phone) fields.phone = unescapeVCardValue(value);
      else if (!fields.phone2) fields.phone2 = unescapeVCardValue(value);
    } else if (keyUpper === 'EMAIL') {
      if (!fields.email) fields.email = unescapeVCardValue(value);
    } else if (keyUpper === 'URL') {
      fields.website = unescapeVCardValue(value);
    } else if (keyUpper === 'ADR') {
      const parts = splitVCardComponents(value);
      // ADR: POBox;Extended;Street;City;Region;PostalCode;Country
      if (parts[2]) fields.address = parts[2];
      if (parts[3]) fields.city = parts[3];
      if (parts[4]) fields.state = parts[4];
      if (parts[6]) fields.country = parts[6];
    } else if (keyUpper === 'NOTE') {
      fields.notes = unescapeVCardValue(value);
    } else if (keyUpper === 'PHOTO') {
      fields.photoBase64 = value;
    }
  }

  return fields;
}

export async function downloadVCard(vcard: string, filename: string): Promise<void> {
  const name = filename.endsWith('.vcf') ? filename : `${filename}.vcf`;
  await shareOrDownloadFile(vcard, name, 'text/vcard');
}

// A generous byte budget (like the old 2200) produces a QR version dense
// enough that a phone camera photographing a screen often can't lock onto it
// at all — that's exactly what broke. This keeps the QR around version
// ~20-21 at error-correction L, still reliably scannable at normal distance,
// while giving the adaptive photo-fitting below real room to work with.
export const MAX_SINGLE_QR_VCARD_LENGTH = 850;

// PNG, not JPEG. JPEG carries a fixed ~300-500 byte floor per file (quantization
// tables, Huffman tables, markers) no matter how tiny the image — at the sizes
// here (14-64px) that floor dominates the output, which is exactly what made a
// "tiny" photo balloon the vCard past budget. PNG has no such per-file table
// overhead, and at these sizes/detail levels it reliably comes out smaller.

async function loadImage(file: File): Promise<{ img: HTMLImageElement; revoke: () => void }> {
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
  return { img, revoke: () => URL.revokeObjectURL(url) };
}

function drawResized(img: HTMLImageElement, canvas: HTMLCanvasElement, maxSize: number): void {
  let width = img.width;
  let height = img.height;
  if (width > height) {
    height = (height / width) * maxSize;
    width = maxSize;
  } else {
    width = (width / height) * maxSize;
    height = maxSize;
  }
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

/** Downscales an image file to a small square PNG and returns raw base64 (no data: prefix). */
export async function compressPhotoToBase64(file: File, maxSize = 64): Promise<string> {
  const { img, revoke } = await loadImage(file);
  const canvas = document.createElement('canvas');
  drawResized(img, canvas, maxSize);
  revoke();
  return canvas.toDataURL('image/png').split(',')[1];
}

// Largest first — buildUniversalVCard/buildContactUniversalVCard walk this
// list and use the biggest variant that still fits the remaining space in a
// single QR.
const PHOTO_VARIANT_SIZES = [64, 48, 36, 28, 20, 14];

/** Pre-compresses one photo at several sizes so a Universal QR can later pick
 * whichever fits, instead of guessing one fixed size for every card. */
export async function compressPhotoVariants(file: File): Promise<string[]> {
  const { img, revoke } = await loadImage(file);
  const canvas = document.createElement('canvas');
  const variants: string[] = [];
  for (const maxSize of PHOTO_VARIANT_SIZES) {
    drawResized(img, canvas, maxSize);
    variants.push(canvas.toDataURL('image/png').split(',')[1]);
  }
  revoke();
  return variants;
}

/**
 * Builds the best single-QR vCard this data can produce: tries the
 * highest-quality photo variant first and backs off to smaller ones (then no
 * photo at all) until the whole card fits `maxLength`. Returns '' only if
 * even the bare text fields don't fit — the caller should fall back to
 * QRMesh Transfer in that case.
 */
export function buildUniversalVCard(c: VCardFields, maxLength: number): string {
  const candidates = c.photoVariants && c.photoVariants.length > 0 ? c.photoVariants : c.photoBase64 ? [c.photoBase64] : [];
  for (const photoBase64 of candidates) {
    const vcard = buildVCard({ ...c, photoBase64 }, { includePhoto: true });
    if (vcard.length <= maxLength) return vcard;
  }
  const textOnly = buildVCard(c, { includePhoto: false });
  return textOnly.length <= maxLength ? textOnly : '';
}
