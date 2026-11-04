import sharp from 'sharp';

export async function createTestImage(options: {
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png';
  sizeBytes?: number;
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

export async function createTinyImage(): Promise<Buffer> {
  return createTestImage({ width: 50, height: 50 });
}

export function createSmallBuffer(sizeBytes: number): Buffer {
  return Buffer.alloc(sizeBytes, 'x');
}
