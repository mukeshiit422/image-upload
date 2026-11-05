import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { createImagesRouter } from './routes/images.routes';
import { QueueService } from './services/queue.service';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import { logger } from './utils/logger';

export function createApp(prisma: PrismaClient, queueService: QueueService): express.Application {
  const app = express();

  // Trust CloudFront/ALB proxy — required for rate limiting behind a reverse proxy
  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(
    cors({
      origin: config.cors.origin,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later.' },
  });
  app.use('/api', limiter);

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Serve locally stored images
  if (config.storage.mode !== 's3') {
    app.use(
      '/uploads',
      express.static(config.storage.localUploadDir, {
        maxAge: '7d',
        etag: true,
      })
    );
  }

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      storageMode: config.storage.mode,
    });
  });

  app.use('/api/images', createImagesRouter(prisma, queueService));

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
