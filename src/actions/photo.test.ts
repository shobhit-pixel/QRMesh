// A small embedded avatar photo should still produce a single static
// Universal QR (any standard scanner can read it) — only an oversized
// combined vCard (huge photo/fields) falls back to QRMesh Transfer.
import { describe, it, expect } from 'vitest';
import { getAction } from './registry';
import './index';
import { MAX_SINGLE_QR_VCARD_LENGTH, buildUniversalVCard } from '../utils/vcard';

// A ~150-char base64 blob, representative of a tiny compressed PNG avatar —
// small enough that the whole vCard still fits a single, reliably scannable QR.
const SMALL_PHOTO_B64 = 'A'.repeat(150);
// Deliberately oversized, to force the combined vCard past the single-QR budget.
const HUGE_PHOTO_B64 = 'A'.repeat(MAX_SINGLE_QR_VCARD_LENGTH + 500);

describe('Contact/Business Card photo embedding', () => {
  it('CONTACT: a small photo still fits a single Universal QR', () => {
    const def = getAction('CONTACT')!;
    const encoded = def.universal!.encode({ firstName: 'A', photoBase64: SMALL_PHOTO_B64 });
    expect(encoded).not.toBe('');
    expect(encoded).toContain('PHOTO');
    expect(encoded.length).toBeLessThanOrEqual(MAX_SINGLE_QR_VCARD_LENGTH);
  });

  it('CONTACT: a single oversized photo (no smaller variants available) with no room even at the hard cap falls back to text-only', () => {
    const def = getAction('CONTACT')!;
    const encoded = def.universal!.encode({ firstName: 'A', photoBase64: HUGE_PHOTO_B64 });
    expect(encoded).not.toBe('');
    expect(encoded).not.toContain('PHOTO');
  });

  it('CONTACT: forces the smallest photo variant in rather than dropping it, once soft budget is exceeded but the hard cap still allows it', () => {
    const def = getAction('CONTACT')!;
    // Largest variant blows the preferred budget; smallest is small enough to
    // still fit under the hard cap — the photo must survive, not disappear.
    const encoded = def.universal!.encode({
      firstName: 'A',
      // Both variants exceed the ~850-char soft budget, but the smaller one
      // is still well under the 1400-char hard cap.
      photoVariants: ['E'.repeat(2000), 'E'.repeat(900)],
    });
    expect(encoded).not.toBe('');
    expect(encoded).toContain('PHOTO');
    expect(encoded).toContain('E'.repeat(900));
  });

  it('CONTACT: falls back to QRMesh Transfer only when even the text does not fit', () => {
    const def = getAction('CONTACT')!;
    expect(def.universal!.encode({ firstName: 'A'.repeat(2000), photoBase64: HUGE_PHOTO_B64 })).toBe('');
  });

  it('BUSINESS_CARD: a small photo still fits a single Universal QR', () => {
    const def = getAction('BUSINESS_CARD')!;
    const encoded = def.universal!.encode({ name: 'A', photoBase64: SMALL_PHOTO_B64 });
    expect(encoded).not.toBe('');
    expect(encoded).toContain('PHOTO');
  });

  it('BUSINESS_CARD: an oversized photo falls back to a text-only Universal QR when the text alone still fits', () => {
    const def = getAction('BUSINESS_CARD')!;
    const encoded = def.universal!.encode({ name: 'A', photoBase64: HUGE_PHOTO_B64 });
    expect(encoded).not.toBe('');
    expect(encoded).not.toContain('PHOTO');
  });
});

describe('buildUniversalVCard adaptive photo fitting', () => {
  it('picks the largest variant that fits, not just the first or smallest', () => {
    // Variants ordered largest-first, as compressPhotoVariants produces them.
    // Large gaps between sizes so the exact per-field vCard overhead doesn't matter.
    const variants = ['B'.repeat(2000), 'B'.repeat(300), 'B'.repeat(50)];
    const result = buildUniversalVCard({ firstName: 'A', photoVariants: variants }, 500);
    // The 2000-char variant makes the vCard far too big; the 300-char one should fit.
    expect(result).toContain('B'.repeat(300));
    expect(result).not.toContain('B'.repeat(2000));
  });

  it('falls back to no photo when even the smallest variant does not fit, but text does', () => {
    const variants = ['C'.repeat(2000)];
    const result = buildUniversalVCard({ firstName: 'A', photoVariants: variants }, 200);
    expect(result).not.toBe('');
    expect(result).not.toContain('PHOTO');
  });

  it('returns empty string when even bare text does not fit', () => {
    const result = buildUniversalVCard({ firstName: 'A'.repeat(1000) }, 50);
    expect(result).toBe('');
  });

  it('works with a plain photoBase64 and no variants array (backward compatible)', () => {
    const result = buildUniversalVCard({ firstName: 'A', photoBase64: 'D'.repeat(50) }, 500);
    expect(result).toContain('PHOTO');
  });
});
