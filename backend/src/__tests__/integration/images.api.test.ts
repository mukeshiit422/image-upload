/**
 * INTEGRATION TESTS — Images API
 * Uses a real PostgreSQL test DB. Mocks only S3 and face detection.
 * Requires: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME=image_upload_test
 */
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../app';
import { QueueService } from '../../services/queue.service';
import { createTestImage } from '../helpers/image-factory';

jest.mock('../../services/face-detection.service', () => ({
  isFaceDetectionAvailable: () => false,
  detectFaces: jest.fn(),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  PutObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
}));

const prisma = new PrismaClient();
const queueService = new QueueService(prisma);
const app = createApp(prisma, queueService);

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.image.deleteMany();
  await prisma.$disconnect();
});

afterEach(async () => {
  await prisma.image.deleteMany();
});

describe('POST /api/images/upload', () => {
  it('returns 400 when no file is attached', async () => {
    const res = await request(app).post('/api/images/upload');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for unsupported file type', async () => {
    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', Buffer.from('fake gif'), { filename: 'test.gif', contentType: 'image/gif' });
    expect(res.status).toBe(400);
  });

  it('returns 202 and queues the image for a valid upload', async () => {
    const image = await createTestImage();
    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', image, { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('PENDING');
  });

  it('creates a database record on successful upload', async () => {
    const image = await createTestImage();
    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', image, { filename: 'portrait.jpg', contentType: 'image/jpeg' });

    const record = await prisma.image.findUnique({ where: { id: res.body.data.id } });
    expect(record).not.toBeNull();
    expect(record?.originalName).toBe('portrait.jpg');
    expect(record?.status).toBe('PENDING');
  });
});

describe('GET /api/images/:id', () => {
  it('returns 404 for non-existent image', async () => {
    const res = await request(app).get('/api/images/non-existent-id');
    expect(res.status).toBe(404);
  });

  it('returns image record for existing image', async () => {
    const image = await prisma.image.create({
      data: {
        id: 'test-id-123',
        originalName: 'face.jpg',
        storedName: 'face.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 50000,
        status: 'ACCEPTED',
        storageUrl: 'https://test-bucket.s3.ap-south-1.amazonaws.com/images/face.jpg',
      },
    });

    const res = await request(app).get(`/api/images/${image.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(image.id);
    expect(res.body.data.originalName).toBe('face.jpg');
  });

  it('normalizes S3 URLs to CloudFront URLs in response', async () => {
    await prisma.image.create({
      data: {
        id: 'url-test-id',
        originalName: 'test.jpg',
        storedName: 'test.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 50000,
        status: 'ACCEPTED',
        storageUrl: 'https://test-bucket.s3.ap-south-1.amazonaws.com/images/test.jpg',
        thumbnailUrl: 'https://test-bucket.s3.ap-south-1.amazonaws.com/thumbnails/test.jpg',
      },
    });

    const res = await request(app).get('/api/images/url-test-id');
    expect(res.body.data.storageUrl).toContain('cloudfront.net');
    expect(res.body.data.thumbnailUrl).toContain('cloudfront.net');
  });
});

describe('GET /api/images', () => {
  beforeEach(async () => {
    await prisma.image.createMany({
      data: [
        { id: 'img-1', originalName: 'alice.jpg', storedName: 'alice.jpg', mimeType: 'image/jpeg', sizeBytes: 50000, status: 'ACCEPTED' },
        { id: 'img-2', originalName: 'bob.png', storedName: 'bob.png', mimeType: 'image/png', sizeBytes: 30000, status: 'REJECTED' },
        { id: 'img-3', originalName: 'alice-2.jpg', storedName: 'alice-2.jpg', mimeType: 'image/jpeg', sizeBytes: 60000, status: 'ACCEPTED' },
      ],
    });
  });

  it('returns paginated list of images', async () => {
    const res = await request(app).get('/api/images');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(3);
    expect(res.body.data.total).toBe(3);
  });

  it('filters by status', async () => {
    const res = await request(app).get('/api/images?status=ACCEPTED');
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items.every((i: any) => i.status === 'ACCEPTED')).toBe(true);
  });

  it('searches by filename (case-insensitive)', async () => {
    const res = await request(app).get('/api/images?search=alice');
    expect(res.body.data.items).toHaveLength(2);
  });

  it('respects limit and page parameters', async () => {
    const res = await request(app).get('/api/images?limit=2&page=1');
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.totalPages).toBe(2);
  });
});

describe('DELETE /api/images/:id', () => {
  it('returns 404 when deleting non-existent image', async () => {
    const res = await request(app).delete('/api/images/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('deletes image and returns success', async () => {
    await prisma.image.create({
      data: { id: 'del-id', originalName: 'del.jpg', storedName: 'del.jpg', mimeType: 'image/jpeg', sizeBytes: 50000, status: 'ACCEPTED' },
    });

    const res = await request(app).delete('/api/images/del-id');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const record = await prisma.image.findUnique({ where: { id: 'del-id' } });
    expect(record).toBeNull();
  });
});

describe('GET /api/images/stats', () => {
  it('returns correct counts by status', async () => {
    await prisma.image.createMany({
      data: [
        { id: 's1', originalName: 'a.jpg', storedName: 'a.jpg', mimeType: 'image/jpeg', sizeBytes: 1000, status: 'ACCEPTED' },
        { id: 's2', originalName: 'b.jpg', storedName: 'b.jpg', mimeType: 'image/jpeg', sizeBytes: 1000, status: 'REJECTED' },
        { id: 's3', originalName: 'c.jpg', storedName: 'c.jpg', mimeType: 'image/jpeg', sizeBytes: 1000, status: 'PENDING' },
      ],
    });

    const res = await request(app).get('/api/images/stats');
    expect(res.status).toBe(200);
    expect(res.body.data.accepted).toBe(1);
    expect(res.body.data.rejected).toBe(1);
    expect(res.body.data.pending).toBe(1);
    expect(res.body.data.total).toBe(3);
  });
});
