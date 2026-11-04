/**
 * REGRESSION TESTS — guard against bugs that were fixed before.
 * Each test documents a specific bug that was found and fixed.
 */
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../app';
import { QueueService } from '../../services/queue.service';
import { hammingDistance } from '../../utils/hash';

jest.mock('../../services/face-detection.service', () => ({
  isFaceDetectionAvailable: () => false,
  detectFaces: jest.fn(),
}));

const prisma = new PrismaClient();
const app = createApp(prisma, new QueueService(prisma));

beforeAll(async () => {
  await prisma.$connect();
  await prisma.image.deleteMany(); // wipe stale data from interrupted previous runs
});

afterAll(async () => {
  await prisma.image.deleteMany();
  await prisma.$disconnect();
});

afterEach(async () => {
  await prisma.image.deleteMany();
});

describe('Regression: S3 URLs must be rewritten to CloudFront in API responses', () => {
  // Bug: search/list was returning raw S3 URLs instead of CloudFront URLs.
  it('list endpoint returns CloudFront URLs, not S3 URLs', async () => {
    await prisma.image.create({
      data: {
        id: 'reg-url-1',
        originalName: 'test.jpg',
        storedName: 'test.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 50000,
        status: 'ACCEPTED',
        storageUrl: 'https://test-bucket.s3.ap-south-1.amazonaws.com/images/test.jpg',
        thumbnailUrl: 'https://test-bucket.s3.ap-south-1.amazonaws.com/thumbnails/test.jpg',
      },
    });

    const res = await request(app).get('/api/images');
    const item = res.body.data.items[0];
    expect(item.storageUrl).toContain('cloudfront.net');
    expect(item.thumbnailUrl).toContain('cloudfront.net');
    expect(item.storageUrl).not.toContain('s3.amazonaws.com');
  });

  it('search results also return CloudFront URLs', async () => {
    await prisma.image.create({
      data: {
        id: 'reg-url-2',
        originalName: 'portrait.jpg',
        storedName: 'portrait.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 50000,
        status: 'ACCEPTED',
        storageUrl: 'https://test-bucket.s3.ap-south-1.amazonaws.com/images/portrait.jpg',
      },
    });

    const res = await request(app).get('/api/images?search=portrait');
    expect(res.body.data.items[0].storageUrl).toContain('cloudfront.net');
  });
});

describe('Regression: multipart upload must not set Content-Type manually', () => {
  // Bug: explicitly setting Content-Type: multipart/form-data stripped the boundary,
  // causing the backend to not parse the file. Fix: let browser/axios set it automatically.
  it('upload with auto Content-Type is accepted', async () => {
    const { createTestImage } = require('../helpers/image-factory');
    const image = await createTestImage();

    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', image, { filename: 'test.jpg', contentType: 'image/jpeg' });
    // supertest sets boundary correctly, so this must succeed
    expect(res.status).toBe(202);
  });
});

describe('Regression: hammingDistance returns Infinity for mismatched hash lengths', () => {
  // Bug: if two hashes had different lengths, the comparison would silently give wrong results.
  it('returns Infinity instead of a number', () => {
    expect(hammingDistance('11', '1100')).toBe(Infinity);
  });
});

describe('Regression: search is case-insensitive', () => {
  // Bug: searching "Alice" did not find "alice.jpg" on some DB collations.
  it('finds images regardless of case', async () => {
    await prisma.image.create({
      data: { id: 'reg-case', originalName: 'Alice.jpg', storedName: 'Alice.jpg', mimeType: 'image/jpeg', sizeBytes: 50000, status: 'ACCEPTED' },
    });

    const lower = await request(app).get('/api/images?search=alice');
    const upper = await request(app).get('/api/images?search=ALICE');
    expect(lower.body.data.total).toBe(1);
    expect(upper.body.data.total).toBe(1);
  });
});
