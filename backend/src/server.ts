import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createApp } from './app';
import { QueueService } from './services/queue.service';
import { config } from '../config';
import { logger } from './utils/logger';
import fs from 'fs';

async function bootstrap(): Promise<void> {
  // Ensure required directories exist
  [config.storage.tempDir, config.storage.localUploadDir, config.storage.modelsDir].forEach(
    (dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  );

  const prisma = new PrismaClient({
    log: config.isDevelopment ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (err) {
    logger.error('Database connection failed', { error: (err as Error).message });
    process.exit(1);
  }

  const queueService = new QueueService(prisma);
  const app = createApp(prisma, queueService);

  const server = app.listen(config.port, () => {
    logger.info(`Server running on http://localhost:${config.port}`, {
      env: config.nodeEnv,
      storage: config.storage.mode,
    });
  });

  async function shutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Shutdown complete');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
    process.exit(1);
  });
}

bootstrap();
