/**
 * UNIT TESTS — hash utilities
 * Pure functions, no mocks needed.
 */
import { hammingDistance, computePerceptualHash, computeLaplacianVariance } from '../../utils/hash';
import { createTestImage } from '../helpers/image-factory';

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
    const image = await createTestImage();
    const hash = await computePerceptualHash(image);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[01]+$/);
  });

  it('produces the same hash for the same image', async () => {
    const image = await createTestImage();
    const hash1 = await computePerceptualHash(image);
    const hash2 = await computePerceptualHash(image);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different images', async () => {
    const image1 = await createTestImage({ width: 400, height: 400 });
    const image2 = await createTestImage({ width: 500, height: 300 });
    const hash1 = await computePerceptualHash(image1);
    const hash2 = await computePerceptualHash(image2);
    expect(hash1).not.toBe(hash2);
  });
});

describe('computeLaplacianVariance', () => {
  it('returns a positive number for a normal image', async () => {
    const image = await createTestImage();
    const variance = await computeLaplacianVariance(image);
    expect(variance).toBeGreaterThan(0);
  });

  it('returns a low variance for a flat-color (blurry-like) image', async () => {
    const flatImage = await createTestImage({ width: 400, height: 400 });
    const variance = await computeLaplacianVariance(flatImage);
    // Flat color = very low laplacian = blurry detection would trigger
    expect(variance).toBeLessThan(50);
  });
});
