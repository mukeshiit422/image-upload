import sharp from 'sharp';
import path from 'path';
import { ProcessedImageInfo } from '../types';
import { logger } from '../utils/logger';

const THUMBNAIL_SIZE = 300;

/**
 * Converts HEIC/HEIF buffers to JPEG and normalises orientation.
 * Returns the original buffer if the format is already JPEG/PNG.
 */
export async function processImage(
  buffer: Buffer,
  originalMimeType: string
): Promise<ProcessedImageInfo> {
  const isHeic = ['image/heic', 'image/heif'].includes(originalMimeType);
  let pipeline = sharp(buffer, { failOn: 'truncated' }).rotate();

  if (isHeic) {
    logger.debug('Converting HEIC to JPEG');
    pipeline = pipeline.jpeg({ quality: 90, mozjpeg: true });
  } else if (originalMimeType === 'image/png') {
    pipeline = pipeline.png({ compressionLevel: 6 });
  } else {
    pipeline = pipeline.jpeg({ quality: 90, mozjpeg: true });
  }

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  const outputMimeType = isHeic
    ? 'image/jpeg'
    : originalMimeType === 'image/png'
    ? 'image/png'
    : 'image/jpeg';

  return {
    buffer: data,
    mimeType: outputMimeType,
    width: info.width,
    height: info.height,
    sizeBytes: data.byteLength,
  };
}

/**
 * Creates a thumbnail (≤300px on the longest side, JPEG).
 */
export async function createThumbnail(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer();
}

/**
 * Returns image metadata without loading the full pixel data.
 */
export async function getImageMetadata(buffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
  sizeBytes: number;
}> {
  const meta = await sharp(buffer).metadata();
  return {
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    format: meta.format ?? 'unknown',
    sizeBytes: buffer.byteLength,
  };
}
