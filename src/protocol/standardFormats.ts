// Encoders/decoders for interoperable QR standards — the payloads these
// produce are the RAW QR content (no QRMesh/QM2 wrapper), so any standard
// camera/QR scanner can read them without QRMesh installed. Decoders are used
// by QRMesh's own receiver to recognize QR codes it didn't generate itself.
import { isSafeHttpUrl } from '../utils/urlSafety';

/** Strips characters that could inject extra mailto header params (e.g. "?bcc=..."). */
export function sanitizeMailtoRecipient(to: string): string {
  return to.replace(/[\r\n?&]/g, '');
}

// ---------- tel: (Call) ----------

export function encodeTel(phone: string): string {
  return `tel:${phone.trim()}`;
}

export function decodeTel(raw: string): { phone: string } | null {
  if (!/^tel:/i.test(raw)) return null;
  const phone = raw.slice(4).trim();
  return phone ? { phone } : null;
}

// ---------- SMSTO: / sms: (SMS) ----------

export function encodeSms(phone: string, message?: string): string {
  // SMSTO:phone:message is the most broadly recognized format across QR
  // scanner implementations (Nokia-originated, still widely honored).
  return message ? `SMSTO:${phone.trim()}:${message}` : `SMSTO:${phone.trim()}`;
}

export function decodeSms(raw: string): { phone: string; message?: string } | null {
  if (/^SMSTO:/i.test(raw)) {
    const rest = raw.slice(6);
    const sep = rest.indexOf(':');
    if (sep === -1) return rest.trim() ? { phone: rest.trim() } : null;
    return { phone: rest.slice(0, sep).trim(), message: rest.slice(sep + 1) || undefined };
  }
  if (/^sms:/i.test(raw)) {
    const rest = raw.slice(4);
    const [phone, query] = rest.split('?');
    const params = new URLSearchParams(query || '');
    return phone.trim() ? { phone: phone.trim(), message: params.get('body') || undefined } : null;
  }
  return null;
}

// ---------- mailto: (Email) ----------

export function encodeMailto(to: string, opts: { cc?: string; bcc?: string; subject?: string; body?: string } = {}): string {
  const safeTo = sanitizeMailtoRecipient(to);
  const params = [
    opts.cc && `cc=${encodeURIComponent(opts.cc)}`,
    opts.bcc && `bcc=${encodeURIComponent(opts.bcc)}`,
    opts.subject && `subject=${encodeURIComponent(opts.subject)}`,
    opts.body && `body=${encodeURIComponent(opts.body)}`,
  ].filter(Boolean);
  return params.length ? `mailto:${safeTo}?${params.join('&')}` : `mailto:${safeTo}`;
}

export function decodeMailto(raw: string): { to: string; cc?: string; bcc?: string; subject?: string; body?: string } | null {
  if (!/^mailto:/i.test(raw)) return null;
  const rest = raw.slice(7);
  const [to, query] = rest.split('?');
  if (!to) return null;
  const params = new URLSearchParams(query || '');
  return {
    to: decodeURIComponent(to),
    cc: params.get('cc') || undefined,
    bcc: params.get('bcc') || undefined,
    subject: params.get('subject') || undefined,
    body: params.get('body') || undefined,
  };
}

// ---------- geo: (Location) ----------

export function encodeGeo(lat: number, lng: number, name?: string): string {
  const base = `geo:${lat},${lng}`;
  return name ? `${base}?q=${lat},${lng}(${encodeURIComponent(name)})` : base;
}

export function decodeGeo(raw: string): { lat: number; lng: number; name?: string } | null {
  if (!/^geo:/i.test(raw)) return null;
  const rest = raw.slice(4);
  const [coordsPart, query] = rest.split('?');
  const [latStr, lngStr] = coordsPart.split(',');
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (Number.isNaN(lat) || Number.isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  let name: string | undefined;
  if (query) {
    const params = new URLSearchParams(query);
    const q = params.get('q');
    const match = q?.match(/\(([^)]+)\)$/);
    if (match) name = decodeURIComponent(match[1]);
  }
  return { lat, lng, name };
}

// ---------- WIFI: (Wi-Fi) ----------

function escapeWifiField(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/"/g, '\\"').replace(/:/g, '\\:');
}

export function encodeWifi(ssid: string, password: string | undefined, security: 'WPA' | 'WEP' | 'nopass', hidden?: boolean): string {
  const t = security === 'nopass' ? 'nopass' : security;
  return `WIFI:T:${t};S:${escapeWifiField(ssid)};${password ? `P:${escapeWifiField(password)};` : ''}H:${hidden ? 'true' : 'false'};;`;
}

export function decodeWifi(raw: string): { ssid: string; password?: string; security: 'WPA' | 'WEP' | 'nopass'; hidden?: boolean } | null {
  if (!/^WIFI:/i.test(raw)) return null;
  const body = raw.slice(5);
  const fields: Record<string, string> = {};
  let key = '';
  let value = '';
  let inKey = true;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '\\' && i + 1 < body.length) {
      value += body[i + 1];
      i++;
      continue;
    }
    if (inKey && ch === ':') {
      inKey = false;
      continue;
    }
    if (ch === ';') {
      if (key) fields[key] = value;
      key = '';
      value = '';
      inKey = true;
      continue;
    }
    if (inKey) key += ch;
    else value += ch;
  }
  if (!fields.S) return null;
  const security = fields.T === 'WEP' ? 'WEP' : fields.T === 'nopass' ? 'nopass' : 'WPA';
  // fields.S/fields.P are already unescaped by the character-level loop above
  // (it resolves backslash-escapes as it walks the string to find field
  // boundaries) — unescaping again here would double-process sequences like
  // an escaped backslash and corrupt them.
  return {
    ssid: fields.S,
    password: fields.P || undefined,
    security,
    hidden: fields.H === 'true',
  };
}

// ---------- upi://pay (Payment) ----------

export function encodeUpi(opts: { payeeVpa?: string; payeeName?: string; amount: number; currency: string; reference?: string; description?: string }): string {
  const params = [
    opts.payeeVpa && `pa=${encodeURIComponent(opts.payeeVpa)}`,
    opts.payeeName && `pn=${encodeURIComponent(opts.payeeName)}`,
    `am=${opts.amount}`,
    `cu=${opts.currency}`,
    opts.reference && `tr=${encodeURIComponent(opts.reference)}`,
    opts.description && `tn=${encodeURIComponent(opts.description)}`,
  ].filter(Boolean);
  return `upi://pay?${params.join('&')}`;
}

export function decodeUpi(raw: string): { payeeVpa?: string; payeeName?: string; amount: number; currency: string; reference?: string; description?: string } | null {
  if (!/^upi:\/\/pay/i.test(raw)) return null;
  const query = raw.split('?')[1] || '';
  const params = new URLSearchParams(query);
  const amount = parseFloat(params.get('am') || '');
  if (Number.isNaN(amount) || !Number.isFinite(amount) || amount <= 0) return null;
  return {
    payeeVpa: params.get('pa') || undefined,
    payeeName: params.get('pn') || undefined,
    amount,
    currency: params.get('cu') || 'INR',
    reference: params.get('tr') || undefined,
    description: params.get('tn') || undefined,
  };
}

// ---------- URL ----------

export function decodeUrl(raw: string): { url: string } | null {
  return isSafeHttpUrl(raw) ? { url: raw } : null;
}

// ---------- Auto-detection for QRMesh's receiver ----------

export type StandardFormatMatch =
  | { type: 'CONTACT'; raw: string }
  | { type: 'URL'; data: { url: string } }
  | { type: 'CALL'; data: { phone: string } }
  | { type: 'SMS'; data: { phone: string; message?: string } }
  | { type: 'EMAIL'; data: { to: string; cc?: string; bcc?: string; subject?: string; body?: string } }
  | { type: 'LOCATION'; data: { lat: number; lng: number; name?: string } }
  | { type: 'WIFI'; data: { ssid: string; password?: string; security: 'WPA' | 'WEP' | 'nopass'; hidden?: boolean } }
  | { type: 'PAYMENT_REQUEST'; data: ReturnType<typeof decodeUpi> }
  | { type: 'TEXT'; data: { text: string } };

/** Tries each known standard format in order; unknown content always falls back to TEXT. */
export function detectStandardFormat(raw: string): StandardFormatMatch | null {
  if (!raw) return null;
  if (/^BEGIN:VCARD/i.test(raw.trim())) return { type: 'CONTACT', raw };

  const wifi = decodeWifi(raw);
  if (wifi) return { type: 'WIFI', data: wifi };

  const geo = decodeGeo(raw);
  if (geo) return { type: 'LOCATION', data: geo };

  const upi = decodeUpi(raw);
  if (upi) return { type: 'PAYMENT_REQUEST', data: upi };

  const tel = decodeTel(raw);
  if (tel) return { type: 'CALL', data: tel };

  const mailto = decodeMailto(raw);
  if (mailto) return { type: 'EMAIL', data: mailto };

  const sms = decodeSms(raw);
  if (sms) return { type: 'SMS', data: sms };

  const url = decodeUrl(raw);
  if (url) return { type: 'URL', data: url };

  return { type: 'TEXT', data: { text: raw } };
}
