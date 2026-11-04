import sharp from 'sharp';

const HASH_SIZE = 8;

/**
 * Computes a difference hash (dHash) from an image buffer.
 * Resizes to (HASH_SIZE+1) x HASH_SIZE, converts to grayscale,
 * and produces a binary string by comparing adjacent pixels.
 * Returns a 64-character binary string (64-bit hash).
 */
export async function computePerceptualHash(imageBuffer: Buffer): Promise<string> {
  const width = HASH_SIZE + 1;
  const height = HASH_SIZE;

  const { data } = await sharp(imageBuffer)
    .resize(width, height, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let hashBits = '';
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < HASH_SIZE; col++) {
      const leftPixel = data[row * width + col];
      const rightPixel = data[row * width + col + 1];
      hashBits += leftPixel > rightPixel ? '1' : '0';
    }
  }

  return hashBits;
}

/**
 * Computes the Hamming distance between two binary hash strings.
 * Lower distance means more similar images.
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return Infinity;

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
}

/**
 * Computes the Laplacian variance of an image to detect blur.
 * A low variance indicates a blurry image.
 */
export async function computeLaplacianVariance(imageBuffer: Buffer): Promise<number> {
  const { data, info } = await sharp(imageBuffer)
    .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const pixels = new Uint8Array(data);

  // Apply Laplacian kernel: [0,1,0,1,-4,1,0,1,0]
  const laplacianValues: number[] = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const lap =
        -4 * pixels[idx] +
        pixels[idx - 1] +
        pixels[idx + 1] +
        pixels[idx - width] +
        pixels[idx + width];
      laplacianValues.push(lap);
    }
  }

  if (laplacianValues.length === 0) return 0;

  const mean = laplacianValues.reduce((sum, v) => sum + v, 0) / laplacianValues.length;
  const variance = laplacianValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / laplacianValues.length;

  return variance;
}
