import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ImagesController } from '../controllers/images.controller';
import { QueueService } from '../services/queue.service';

export function createImagesRouter(
  prisma: PrismaClient,
  queueService: QueueService
): Router {
  const router = Router();
  const controller = new ImagesController(prisma, queueService);

  router.post('/upload', ...controller.upload);
  router.get('/', controller.list);
  router.get('/stats', controller.stats);
  router.get('/:id', controller.getStatus);
  router.delete('/:id', controller.delete);

  return router;
}
