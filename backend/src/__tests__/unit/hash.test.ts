/**
 * UNIT TESTS — hash utilities
 * Pure functions, no mocks needed.
 */
import { hammingDistance, computePerceptualHash, computeLaplacianVariance } from '../../utils/hash';
import { createTestImage, createGradientImage, createCheckerboardImage } from '../helpers/image-factory';

describe('hammingDistance', () => {
  it('returns 0 for identical hashes', () => {
    expect(hammingDistance('11001100', '11001100')).toBe(0);
  });

  it('returns correct bit difference', () => {
    expect(hammingDistance('11001100', '11001101')).toBe(1);
    expect(hammingDistance('11001100', '00110011')).toBe(8);
  });

  it('returns Infinity for different length hashes', () => {
    expect(hammingDistance('1100', '110011')).toBe(Infinity);
  });

  it('returns 0 for empty hashes', () => {
    expect(hammingDistance('', '')).toBe(0);
  });
});

describe('computePerceptualHash', () => {
  it('returns a 64-character binary string', async () => {
    const image = await createGradientImage();
    const hash = await computePerceptualHash(image);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[01]+$/);
  });

  it('produces the same hash for the same image', async () => {
    const image = await createGradientImage();
    const hash1 = await computePerceptualHash(image);
    const hash2 = await computePerceptualHash(image);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for visually different images', async () => {
    const gradient     = await createGradientImage();
    const checkerboard = await createCheckerboardImage();
    const hash1 = await computePerceptualHash(gradient);
    const hash2 = await computePerceptualHash(checkerboard);
    // These are visually very different — Hamming distance must be large
    expect(hammingDistance(hash1, hash2)).toBeGreaterThan(10);
  });
});

describe('computeLaplacianVariance', () => {
  it('returns a positive number for an image with edges', async () => {
    // Gradient image has pixel transitions → non-zero Laplacian variance
    const image = await createGradientImage();
    const variance = await computeLaplacianVariance(image);
    expect(variance).toBeGreaterThan(0);
  });

  it('returns near-zero variance for a flat-color image', async () => {
    // Flat color has no edges → Laplacian ≈ 0 → detected as blurry
    const flatImage = await createTestImage({ width: 400, height: 400 });
    const variance = await computeLaplacianVariance(flatImage);
    expect(variance).toBeLessThan(50);
  });
});
