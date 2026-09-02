import { describe, it, expect } from 'vitest';
import { MAX_COMPRESSED_BYTES, CHUNK_SIZE } from './dataUtils';

describe('legacy transport size budget', () => {
  it('MAX_COMPRESSED_BYTES / CHUNK_SIZE comfortably exceeds a real observed transfer size', () => {
    // Regression guard: a real user transfer needed 4395 packets and was
    // wrongly rejected by an earlier, inconsistent chunk-count cap. Make sure
    // the effective chunk ceiling derived from these two constants (see
    // ReceiveMode's MAX_LEGACY_CHUNKS) always has headroom above that.
    const effectiveChunkCeiling = Math.ceil(MAX_COMPRESSED_BYTES / CHUNK_SIZE);
    expect(effectiveChunkCeiling).toBeGreaterThan(4395 * 1.5);
  });
});
