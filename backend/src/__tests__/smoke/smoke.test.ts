/**
 * SMOKE TESTS — is the server alive and DB connected?
 * These run first in CI to catch total failures fast.
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

afterAll(() => prisma.$disconnect());

describe('Smoke Tests', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('database is reachable', async () => {
    await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeDefined();
  });

  it('GET /api/images returns 200 (not 500)', async () => {
    const res = await request(app).get('/api/images');
    expect(res.status).toBe(200);
  });

  it('GET /api/images/stats returns 200', async () => {
    const res = await request(app).get('/api/images/stats');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('total');
  });

  it('unknown routes return 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});
