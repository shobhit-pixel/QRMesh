import { describe, it, expect } from 'vitest';
import {
  encodeTel, decodeTel,
  encodeSms, decodeSms,
  encodeMailto, decodeMailto, sanitizeMailtoRecipient,
  encodeGeo, decodeGeo,
  encodeWifi, decodeWifi,
  encodeUpi, decodeUpi,
  decodeUrl,
  detectStandardFormat,
} from './standardFormats';
import { buildVCard, parseVCard } from '../utils/vcard';

describe('tel: round trip', () => {
  it('encodes and decodes a phone number', () => {
    const encoded = encodeTel('+91 98765 43210');
    expect(encoded).toBe('tel:+91 98765 43210');
    expect(decodeTel(encoded)).toEqual({ phone: '+91 98765 43210' });
  });

  it('rejects non-tel strings', () => {
    expect(decodeTel('mailto:x@example.com')).toBeNull();
    expect(decodeTel('not a phone')).toBeNull();
  });
});

describe('SMSTO:/sms: round trip', () => {
  it('encodes as SMSTO and decodes both SMSTO and sms: variants', () => {
    const encoded = encodeSms('+911234567890', 'Hello there');
    expect(encoded).toBe('SMSTO:+911234567890:Hello there');
    expect(decodeSms(encoded)).toEqual({ phone: '+911234567890', message: 'Hello there' });
    expect(decodeSms('sms:+911234567890?body=Hi')).toEqual({ phone: '+911234567890', message: 'Hi' });
  });

  it('handles no message', () => {
    expect(decodeSms('SMSTO:+911234567890')).toEqual({ phone: '+911234567890' });
  });

  it('rejects malformed input', () => {
    expect(decodeSms('not sms at all')).toBeNull();
    expect(decodeSms('SMSTO:')).toBeNull();
  });
});

describe('mailto: round trip + injection guard', () => {
  it('encodes and decodes subject/body/cc/bcc', () => {
    const encoded = encodeMailto('person@example.com', { subject: 'Hi there', body: 'Line1\nLine2', cc: 'cc@example.com' });
    const decoded = decodeMailto(encoded)!;
    expect(decoded.to).toBe('person@example.com');
    expect(decoded.subject).toBe('Hi there');
    expect(decoded.body).toBe('Line1\nLine2');
    expect(decoded.cc).toBe('cc@example.com');
  });

  it('strips CRLF/header-injection characters from the recipient', () => {
    expect(sanitizeMailtoRecipient('victim@example.com\r\nBcc:attacker@evil.com')).not.toMatch(/[\r\n]/);
    expect(encodeMailto('victim@example.com?bcc=attacker@evil.com')).not.toContain('?bcc=attacker');
  });

  it('rejects non-mailto strings', () => {
    expect(decodeMailto('tel:12345')).toBeNull();
  });
});

describe('geo: round trip', () => {
  it('encodes and decodes coordinates with a label', () => {
    const encoded = encodeGeo(23.0225, 72.5714, 'Ahmedabad');
    const decoded = decodeGeo(encoded)!;
    expect(decoded.lat).toBeCloseTo(23.0225);
    expect(decoded.lng).toBeCloseTo(72.5714);
    expect(decoded.name).toBe('Ahmedabad');
  });

  it('encodes without a label', () => {
    expect(decodeGeo(encodeGeo(0, 0))).toEqual({ lat: 0, lng: 0, name: undefined });
  });

  it('rejects invalid/out-of-range coordinates', () => {
    expect(decodeGeo('geo:91,0')).toBeNull(); // lat > 90
    expect(decodeGeo('geo:0,181')).toBeNull(); // lng > 180
    expect(decodeGeo('geo:not,numbers')).toBeNull();
    expect(decodeGeo('geo:23.0')).toBeNull(); // missing lng entirely
  });

  it('rejects non-geo strings', () => {
    expect(decodeGeo('https://example.com')).toBeNull();
  });
});

describe('WIFI: round trip', () => {
  it('encodes and decodes WPA network', () => {
    const encoded = encodeWifi('MyNetwork', 'p@ssw;rd', 'WPA', false);
    const decoded = decodeWifi(encoded)!;
    expect(decoded.ssid).toBe('MyNetwork');
    expect(decoded.password).toBe('p@ssw;rd');
    expect(decoded.security).toBe('WPA');
    expect(decoded.hidden).toBe(false);
  });

  it('properly escapes special characters (semicolon, comma, colon, backslash) in SSID/password', () => {
    const encoded = encodeWifi('Weird;SSID,Name:Here\\', 'p;a,s:s\\w', 'WPA');
    const decoded = decodeWifi(encoded)!;
    expect(decoded.ssid).toBe('Weird;SSID,Name:Here\\');
    expect(decoded.password).toBe('p;a,s:s\\w');
  });

  it('encodes an open hidden network', () => {
    const encoded = encodeWifi('OpenNet', undefined, 'nopass', true);
    const decoded = decodeWifi(encoded)!;
    expect(decoded.security).toBe('nopass');
    expect(decoded.hidden).toBe(true);
    expect(decoded.password).toBeUndefined();
  });

  it('rejects malformed WIFI: strings', () => {
    expect(decodeWifi('WIFI:T:WPA;P:pass;;')).toBeNull(); // missing S (ssid)
    expect(decodeWifi('not wifi at all')).toBeNull();
  });
});

describe('upi://pay round trip', () => {
  it('encodes and decodes a payment request', () => {
    const encoded = encodeUpi({ payeeVpa: 'merchant@upi', payeeName: 'Merchant', amount: 499.5, currency: 'INR', reference: 'ORDER123' });
    const decoded = decodeUpi(encoded)!;
    expect(decoded.payeeVpa).toBe('merchant@upi');
    expect(decoded.payeeName).toBe('Merchant');
    expect(decoded.amount).toBe(499.5);
    expect(decoded.currency).toBe('INR');
    expect(decoded.reference).toBe('ORDER123');
  });

  it('rejects non-finite, zero, or negative amounts', () => {
    expect(decodeUpi('upi://pay?pa=x@y&am=0&cu=INR')).toBeNull();
    expect(decodeUpi('upi://pay?pa=x@y&am=-5&cu=INR')).toBeNull();
    expect(decodeUpi('upi://pay?pa=x@y&am=abc&cu=INR')).toBeNull();
  });

  it('rejects non-upi strings', () => {
    expect(decodeUpi('https://example.com')).toBeNull();
  });
});

describe('URL decode', () => {
  it('accepts http/https', () => {
    expect(decodeUrl('https://example.com')).toEqual({ url: 'https://example.com' });
  });

  it('blocks dangerous schemes', () => {
    expect(decodeUrl('javascript:alert(1)')).toBeNull();
    expect(decodeUrl('data:text/html,x')).toBeNull();
    expect(decodeUrl('vbscript:x')).toBeNull();
    expect(decodeUrl('file:///etc/passwd')).toBeNull();
  });
});

describe('vCard round trip (universal Contact format)', () => {
  it('the QR payload contains a raw vCard with no QRMesh wrapper', () => {
    const vcard = buildVCard({ firstName: 'Shobhit', lastName: 'Tripathi', phone: '+911234567890', email: 'test@example.com', company: 'Example Co', jobTitle: 'Developer' }, { includePhoto: false });
    expect(vcard).toMatch(/^BEGIN:VCARD/);
    expect(vcard).not.toContain('QM2');
    expect(vcard).not.toContain('QRMesh');
    expect(vcard).not.toContain('{'); // no JSON wrapper
  });

  it('round-trips all core fields', () => {
    const original = {
      firstName: 'Shobhit', lastName: 'Tripathi', phone: '+911234567890', email: 'test@example.com',
      company: 'Example Co', jobTitle: 'Developer', website: 'https://example.com',
      address: 'Street 1', city: 'Ahmedabad', state: 'Gujarat', country: 'India', notes: 'Met at conference',
    };
    const vcard = buildVCard(original, { includePhoto: false });
    const parsed = parseVCard(vcard)!;
    expect(parsed.firstName).toBe(original.firstName);
    expect(parsed.lastName).toBe(original.lastName);
    expect(parsed.phone).toBe(original.phone);
    expect(parsed.email).toBe(original.email);
    expect(parsed.company).toBe(original.company);
    expect(parsed.jobTitle).toBe(original.jobTitle);
    expect(parsed.website).toBe(original.website);
    expect(parsed.address).toBe(original.address);
    expect(parsed.city).toBe(original.city);
    expect(parsed.state).toBe(original.state);
    expect(parsed.country).toBe(original.country);
    expect(parsed.notes).toBe(original.notes);
  });

  it('round-trips names/values containing vCard structural characters', () => {
    const original = { firstName: 'John; Smith', lastName: "O'Brien, Jr.", company: 'Company \\ Name', notes: 'Multi-line\nnote here' };
    const vcard = buildVCard(original, { includePhoto: false });
    const parsed = parseVCard(vcard)!;
    expect(parsed.firstName).toBe('John; Smith');
    expect(parsed.lastName).toBe("O'Brien, Jr.");
    expect(parsed.company).toBe('Company \\ Name');
    expect(parsed.notes).toBe('Multi-line\nnote here');
  });

  it('round-trips Unicode names across multiple scripts', () => {
    const original = { firstName: 'ગુજરાતી', lastName: 'हिन्दी', company: '中文公司', notes: '日本語のメモ' };
    const vcard = buildVCard(original, { includePhoto: false });
    const parsed = parseVCard(vcard)!;
    expect(parsed.firstName).toBe('ગુજરાતી');
    expect(parsed.lastName).toBe('हिन्दी');
    expect(parsed.company).toBe('中文公司');
    expect(parsed.notes).toBe('日本語のメモ');
  });

  it('omits photo when includePhoto is false, even if provided', () => {
    const vcard = buildVCard({ displayName: 'X', photoBase64: 'ZmFrZWJhc2U2NA==' }, { includePhoto: false });
    expect(vcard).not.toContain('PHOTO');
  });

  it('includes photo when includePhoto is true (QRMesh-enhanced / local .vcf export)', () => {
    const vcard = buildVCard({ displayName: 'X', photoBase64: 'ZmFrZWJhc2U2NA==' }, { includePhoto: true });
    expect(vcard).toContain('PHOTO');
  });

  it('parseVCard rejects non-vCard content', () => {
    expect(parseVCard('just some random text')).toBeNull();
    expect(parseVCard('https://example.com')).toBeNull();
  });

  it('parseVCard does not crash on a malformed/truncated vCard', () => {
    expect(() => parseVCard('BEGIN:VCARD\nVERSION:3.0\nFN')).not.toThrow();
    expect(() => parseVCard('BEGIN:VCARD')).not.toThrow();
  });
});

describe('detectStandardFormat (QRMesh receiver auto-detection)', () => {
  it('detects vCard, URL, tel, mailto, geo, WIFI, and UPI', () => {
    expect(detectStandardFormat('BEGIN:VCARD\nVERSION:3.0\nFN:X\nEND:VCARD').type).toBe('CONTACT');
    expect(detectStandardFormat('https://example.com').type).toBe('URL');
    expect(detectStandardFormat('tel:+911234567890').type).toBe('CALL');
    expect(detectStandardFormat('mailto:x@example.com').type).toBe('EMAIL');
    expect(detectStandardFormat('geo:23.0225,72.5714').type).toBe('LOCATION');
    expect(detectStandardFormat('WIFI:T:WPA;S:Net;P:pass;;').type).toBe('WIFI');
    expect(detectStandardFormat('upi://pay?pa=x@y&am=10&cu=INR').type).toBe('PAYMENT_REQUEST');
    expect(detectStandardFormat('SMSTO:+911234567890:hi').type).toBe('SMS');
  });

  it('falls back to TEXT for unrecognized content instead of erroring', () => {
    const result = detectStandardFormat('just some random scanned text');
    expect(result?.type).toBe('TEXT');
    expect((result as { type: 'TEXT'; data: { text: string } }).data.text).toBe('just some random scanned text');
  });

  it('never crashes on empty or bizarre input', () => {
    expect(() => detectStandardFormat('')).not.toThrow();
    expect(() => detectStandardFormat(' garbage')).not.toThrow();
  });
});
