/**
 * PERFORMANCE TESTS — response time assertions under light load.
 * Not a load test tool (use k6/autocannon for that), but catches regressions
 * where a simple endpoint suddenly takes seconds instead of milliseconds.
 */
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../app';
import { QueueService } from '../../services/queue.service';

jest.mock('../../services/face-detection.service', () => ({
  isFaceDetectionAvailable: () => false,
  detectFaces: jest.fn(),
}));

const prisma = new PrismaClient();
const app = createApp(prisma, new QueueService(prisma));

async function measureMs(fn: () => Promise<void>): Promise<number> {
  const start = process.hrtime.bigint();
  await fn();
  return Number(process.hrtime.bigint() - start) / 1_000_000;
}

beforeAll(async () => {
  // Seed 50 images for realistic list/search perf
  const data = Array.from({ length: 50 }, (_, i) => ({
    id: `perf-${i}`,
    originalName: `image-${i}.jpg`,
    storedName: `image-${i}.jpg`,
    mimeType: 'image/jpeg',
    sizeBytes: 50000,
    status: 'ACCEPTED' as const,
  }));
  await prisma.image.createMany({ data });
});

afterAll(async () => {
  await prisma.image.deleteMany({ where: { id: { startsWith: 'perf-' } } });
  await prisma.$disconnect();
});

describe('Performance: response time thresholds', () => {
  it('GET /health responds in under 100ms', async () => {
    const ms = await measureMs(() => request(app).get('/health').then());
    expect(ms).toBeLessThan(100);
  });

  it('GET /api/images/stats responds in under 500ms', async () => {
    const ms = await measureMs(() => request(app).get('/api/images/stats').then());
    expect(ms).toBeLessThan(500);
  });

  it('GET /api/images (list) responds in under 500ms', async () => {
    const ms = await measureMs(() => request(app).get('/api/images').then());
    expect(ms).toBeLessThan(500);
  });

  it('GET /api/images?search= responds in under 500ms', async () => {
    const ms = await measureMs(() => request(app).get('/api/images?search=image-1').then());
    expect(ms).toBeLessThan(500);
  });
});

describe('Performance: concurrent requests', () => {
  it('handles 10 concurrent stats requests without error', async () => {
    const requests = Array.from({ length: 10 }, () =>
      request(app).get('/api/images/stats')
    );
    const responses = await Promise.all(requests);
    expect(responses.every(r => r.status === 200)).toBe(true);
  });

  it('handles 10 concurrent list requests without error', async () => {
    const requests = Array.from({ length: 10 }, () =>
      request(app).get('/api/images?limit=10')
    );
    const responses = await Promise.all(requests);
    expect(responses.every(r => r.status === 200)).toBe(true);
  });
});
