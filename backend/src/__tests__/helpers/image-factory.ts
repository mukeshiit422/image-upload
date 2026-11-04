import sharp from 'sharp';

export async function createTestImage(options: {
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png';
} = {}): Promise<Buffer> {
  const { width = 400, height = 400, format = 'jpeg' } = options;

  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  })
    [format]({ quality: 90 })
    .toBuffer();

  return buffer;
}

/** Image with smooth gradient — has edges, non-zero Laplacian variance */
export async function createGradientImage(width = 400, height = 400): Promise<Buffer> {
  const channels = 3;
  const data = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      data[idx]     = Math.floor((x / width) * 255);
      data[idx + 1] = Math.floor((y / height) * 255);
      data[idx + 2] = Math.floor(((x + y) / (width + height)) * 255);
    }
  }
  return sharp(data, { raw: { width, height, channels } }).jpeg({ quality: 90 }).toBuffer();
}

/** High-contrast checkerboard — very different dHash from gradient */
export async function createCheckerboardImage(width = 400, height = 400, squareSize = 20): Promise<Buffer> {
  const channels = 3;
  const data = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const isWhite = (Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2 === 0;
      const val = isWhite ? 255 : 0;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
    }
  }
  return sharp(data, { raw: { width, height, channels } }).jpeg({ quality: 90 }).toBuffer();
}

export async function createTinyImage(): Promise<Buffer> {
  return createTestImage({ width: 50, height: 50 });
}

export function createSmallBuffer(sizeBytes: number): Buffer {
  return Buffer.alloc(sizeBytes, 'x');
}
