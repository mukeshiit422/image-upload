import { PrismaClient } from '@prisma/client';
import { config } from '../../config';
import { logger } from '../utils/logger';
import { detectFaces, isFaceDetectionAvailable } from './face-detection.service';
import {
  computePerceptualHash,
  computeLaplacianVariance,
  hammingDistance,
} from '../utils/hash';
import { getImageMetadata } from './image-processor.service';
import { RejectionReason, ValidationResult } from '../types';

const BATCH_SIZE = 500;

export class ValidationService {
  constructor(private readonly prisma: PrismaClient) {}

  async validate(
    imageBuffer: Buffer,
    mimeType: string,
    fileSizeBytes: number,
    excludeId?: string
  ): Promise<ValidationResult> {
    const reasons: RejectionReason[] = [];

    // 1. Format check
    if (!(config.validation.allowedMimeTypes as readonly string[]).includes(mimeType)) {
      reasons.push(RejectionReason.FORMAT_INVALID);
      return { passed: false, reasons };
    }

    // 2. File size check
    if (fileSizeBytes < config.validation.minFileSizeBytes) {
      reasons.push(RejectionReason.FILE_TOO_SMALL);
    }

    // 3. Resolution check (get metadata from the processed buffer)
    let width = 0;
    let height = 0;
    try {
      const meta = await getImageMetadata(imageBuffer);
      width = meta.width;
      height = meta.height;

      if (
        width < config.validation.minDimensionPx ||
        height < config.validation.minDimensionPx
      ) {
        reasons.push(RejectionReason.RESOLUTION_TOO_LOW);
      }
    } catch (err) {
      logger.error('Failed to read image metadata', { error: (err as Error).message });
      reasons.push(RejectionReason.PROCESSING_FAILED);
      return { passed: false, reasons };
    }

    // Short-circuit: no point running expensive checks on clearly invalid images
    if (reasons.length > 0) {
      return { passed: false, reasons };
    }

    // 4. Blur detection
    try {
      const laplacianVariance = await computeLaplacianVariance(imageBuffer);
      logger.debug('Laplacian variance', { variance: laplacianVariance });

      if (laplacianVariance < config.validation.blurThreshold) {
        reasons.push(RejectionReason.IMAGE_TOO_BLURRY);
      }
    } catch (err) {
      logger.warn('Blur detection failed, skipping', { error: (err as Error).message });
    }

    // 5. Face detection
    if (isFaceDetectionAvailable()) {
      try {
        const faceResult = await detectFaces(imageBuffer);

        if (faceResult.faceCount === -1) {
          logger.warn('Face detection returned error, skipping face validation');
        } else if (faceResult.faceCount === 0) {
          // Only reject if a face is explicitly required (e.g. profile photo use case)
          if (config.validation.requireFace) {
            reasons.push(RejectionReason.NO_FACE_DETECTED);
          }
        } else if (faceResult.faceCount > 1) {
          reasons.push(RejectionReason.MULTIPLE_FACES);
        } else if (faceResult.largestFaceAreaRatio < config.validation.faceMinAreaRatio) {
          reasons.push(RejectionReason.FACE_TOO_SMALL);
        }
      } catch (err) {
        logger.warn('Face detection failed, skipping', { error: (err as Error).message });
      }
    } else {
      logger.debug('Face detection not available, skipping face validations');
    }

    // 6. Similarity detection (only if everything else passes)
    if (reasons.length === 0) {
      try {
        const hash = await computePerceptualHash(imageBuffer);
        const isSimilar = await this.checkSimilarity(hash, excludeId);

        if (isSimilar) {
          reasons.push(RejectionReason.TOO_SIMILAR_TO_EXISTING);
        }
      } catch (err) {
        logger.warn('Similarity check failed, skipping', { error: (err as Error).message });
      }
    }

    return {
      passed: reasons.length === 0,
      reasons,
    };
  }

  private async checkSimilarity(
    newHash: string,
    excludeId?: string
  ): Promise<boolean> {
    let cursor: string | undefined;

    while (true) {
      const batch = await this.prisma.image.findMany({
        where: {
          status: 'ACCEPTED',
          perceptualHash: { not: null },
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true, perceptualHash: true },
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { id: 'asc' },
      });

      for (const image of batch) {
        if (!image.perceptualHash) continue;
        const dist = hammingDistance(newHash, image.perceptualHash);
        if (dist <= config.validation.similarityHashDistance) {
          logger.debug('Similar image found', { imageId: image.id, distance: dist });
          return true;
        }
      }

      if (batch.length < BATCH_SIZE) break;
      cursor = batch[batch.length - 1].id;
    }

    return false;
  }

  async computeHash(imageBuffer: Buffer): Promise<string> {
    return computePerceptualHash(imageBuffer);
  }
}
