import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { storageService } from './storage.service';
import { processImage, createThumbnail } from './image-processor.service';
import { ValidationService } from './validation.service';
import { ImageStatus } from '../types';

interface QueueJob {
  imageId: string;
  tempFilePath: string;
  originalMimeType: string;
}

export class QueueService {
  private readonly queue: QueueJob[] = [];
  private processing = false;
  private readonly validationService: ValidationService;

  constructor(private readonly prisma: PrismaClient) {
    this.validationService = new ValidationService(prisma);
  }

  enqueue(job: QueueJob): void {
    this.queue.push(job);
    if (!this.processing) {
      setImmediate(() => this.processNext());
    }
  }

  private async processNext(): Promise<void> {
    const job = this.queue.shift();
    if (!job) {
      this.processing = false;
      return;
    }

    this.processing = true;

    try {
      await this.processJob(job);
    } catch (err) {
      logger.error('Queue job failed', { imageId: job.imageId, error: (err as Error).message });
      await this.markFailed(job.imageId, job.tempFilePath);
    } finally {
      setImmediate(() => this.processNext());
    }
  }

  private async processJob(job: QueueJob): Promise<void> {
    const { imageId, tempFilePath, originalMimeType } = job;

    logger.info('Processing image', { imageId });

    await this.prisma.image.update({
      where: { id: imageId },
      data: { status: 'PROCESSING' },
    });

    let rawBuffer: Buffer;
    try {
      rawBuffer = fs.readFileSync(tempFilePath);
    } catch {
      throw new Error(`Temp file not found: ${tempFilePath}`);
    }

    let processedInfo;
    try {
      processedInfo = await processImage(rawBuffer, originalMimeType);
    } catch (err) {
      throw new Error(`Image processing failed: ${(err as Error).message}`);
    }

    const validationResult = await this.validationService.validate(
      processedInfo.buffer,
      processedInfo.mimeType,
      processedInfo.sizeBytes
    );

    if (!validationResult.passed) {
      logger.info('Image rejected', { imageId, reasons: validationResult.reasons });

      await this.prisma.image.update({
        where: { id: imageId },
        data: {
          status: 'REJECTED',
          rejectionReasons: validationResult.reasons,
          width: processedInfo.width,
          height: processedInfo.height,
          processedAt: new Date(),
        },
      });

      this.cleanupTempFile(tempFilePath);
      return;
    }

    const fileExt = processedInfo.mimeType === 'image/png' ? '.png' : '.jpg';
    const storageKey = `images/${imageId}${fileExt}`;
    const thumbnailKey = `thumbnails/${imageId}${fileExt}`;

    const [storageResult, thumbnailBuffer] = await Promise.all([
      storageService.upload(processedInfo.buffer, storageKey, processedInfo.mimeType),
      createThumbnail(processedInfo.buffer),
    ]);

    const thumbnailResult = await storageService.upload(
      thumbnailBuffer,
      thumbnailKey,
      'image/jpeg'
    );

    const perceptualHash = await this.validationService.computeHash(processedInfo.buffer);

    await this.prisma.image.update({
      where: { id: imageId },
      data: {
        status: 'ACCEPTED',
        storageKey: storageResult.key,
        storageUrl: storageResult.url,
        thumbnailUrl: thumbnailResult.url,
        width: processedInfo.width,
        height: processedInfo.height,
        sizeBytes: processedInfo.sizeBytes,
        mimeType: processedInfo.mimeType,
        perceptualHash,
        processedAt: new Date(),
      },
    });

    this.cleanupTempFile(tempFilePath);
    logger.info('Image accepted', { imageId });
  }

  private async markFailed(imageId: string, tempFilePath: string): Promise<void> {
    try {
      await this.prisma.image.update({
        where: { id: imageId },
        data: {
          status: 'REJECTED',
          rejectionReasons: ['PROCESSING_FAILED'],
          processedAt: new Date(),
        },
      });
    } catch (dbErr) {
      logger.error('Failed to mark image as failed in DB', {
        imageId,
        error: (dbErr as Error).message,
      });
    }
    this.cleanupTempFile(tempFilePath);
  }

  private cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      logger.warn('Failed to delete temp file', { filePath, error: (err as Error).message });
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}
