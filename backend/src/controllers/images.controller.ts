import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { QueueService } from '../services/queue.service';
import { storageService } from '../services/storage.service';
import { uploadMiddleware, normalizeHeicMime } from '../middleware/upload.middleware';
import { AppError, asyncHandler } from '../utils/async-handler';
import { logger } from '../utils/logger';
import {
  ApiResponse,
  ImageRecord,
  ImageStatus,
  ListImagesQuery,
  PaginatedResponse,
  UploadedImageResponse,
} from '../types';

export class ImagesController {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly queueService: QueueService
  ) {}

  upload = [
    (req: Request, res: Response, next: Function) => {
      uploadMiddleware(req, res, (err) => {
        if (err) return next(err);
        next();
      });
    },
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) {
        throw new AppError('No image file provided', 400);
      }

      const file = req.file;
      const mimeType = normalizeHeicMime(file);
      const imageId = uuidv4();

      const image = await this.prisma.image.create({
        data: {
          id: imageId,
          originalName: file.originalname,
          storedName: file.filename,
          mimeType,
          sizeBytes: file.size,
          status: 'PENDING',
        },
      });

      this.queueService.enqueue({
        imageId: image.id,
        tempFilePath: file.path,
        originalMimeType: mimeType,
      });

      logger.info('Image upload received', {
        imageId: image.id,
        originalName: file.originalname,
        size: file.size,
      });

      const response: ApiResponse<UploadedImageResponse> = {
        success: true,
        data: {
          id: image.id,
          originalName: image.originalName,
          status: ImageStatus.PENDING,
          message: 'Image received and queued for processing',
        },
      };
      res.status(202).json(response);
    }),
  ];

  getStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const image = await this.prisma.image.findUnique({
      where: { id },
      select: {
        id: true,
        originalName: true,
        status: true,
        rejectionReasons: true,
        processedAt: true,
        width: true,
        height: true,
        sizeBytes: true,
        storageUrl: true,
        thumbnailUrl: true,
        mimeType: true,
        createdAt: true,
      },
    });

    if (!image) throw new AppError('Image not found', 404);

    const response: ApiResponse<ImageRecord> = {
      success: true,
      data: image as ImageRecord,
    };
    res.json(response);
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListImagesQuery & { search?: string };
    const page = Math.max(1, parseInt(String(query.page ?? '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10)));
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {};
    if (query.status) whereClause.status = query.status;
    if (query.search?.trim()) {
      whereClause.originalName = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.image.findMany({
        where: whereClause as any,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          width: true,
          height: true,
          storageUrl: true,
          thumbnailUrl: true,
          status: true,
          rejectionReasons: true,
          processedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.image.count({ where: whereClause as any }),
    ]);

    const response: ApiResponse<PaginatedResponse<ImageRecord>> = {
      success: true,
      data: {
        items: items as ImageRecord[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
    res.json(response);
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const image = await this.prisma.image.findUnique({
      where: { id },
      select: { id: true, storageKey: true, status: true },
    });

    if (!image) throw new AppError('Image not found', 404);

    if (image.storageKey) {
      await storageService.delete(image.storageKey);
      const thumbnailKey = image.storageKey.replace('images/', 'thumbnails/');
      await storageService.delete(thumbnailKey);
    }

    await this.prisma.image.delete({ where: { id } });

    const response: ApiResponse = { success: true, message: 'Image deleted successfully' };
    res.json(response);
  });

  stats = asyncHandler(async (_req: Request, res: Response) => {
    const [accepted, rejected, pending, processing] = await this.prisma.$transaction([
      this.prisma.image.count({ where: { status: 'ACCEPTED' } }),
      this.prisma.image.count({ where: { status: 'REJECTED' } }),
      this.prisma.image.count({ where: { status: 'PENDING' } }),
      this.prisma.image.count({ where: { status: 'PROCESSING' } }),
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        accepted,
        rejected,
        pending,
        processing,
        total: accepted + rejected + pending + processing,
        queueLength: this.queueService.getQueueLength(),
      },
    };
    res.json(response);
  });
}
