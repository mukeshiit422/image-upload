/**
 * SECURITY TESTS
 * SQL injection, XSS via filename, oversized files, CORS, rate limiting.
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

afterAll(async () => {
  await prisma.image.deleteMany();
  await prisma.$disconnect();
});

afterEach(() => prisma.image.deleteMany());

describe('Security: SQL injection via search parameter', () => {
  it("ignores SQL payload in search and returns empty results safely", async () => {
    const res = await request(app)
      .get("/api/images?search=' OR '1'='1");
    // Must not throw 500 — Prisma parameterises all queries
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });

  it('handles UNION-based injection attempts without error', async () => {
    const res = await request(app)
      .get('/api/images?search=test UNION SELECT * FROM "Image"--');
    expect(res.status).toBe(200);
  });
});

describe('Security: XSS via filename', () => {
  it('stores malicious filename as plain text, not executed', async () => {
    const { createTestImage } = require('../helpers/image-factory');
    const image = await createTestImage();
    const xssName = '<script>alert(1)</script>.jpg';

    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', image, { filename: xssName, contentType: 'image/jpeg' });

    expect(res.status).toBe(202);
    // originalName is returned as-is in JSON — the browser/frontend must escape it
    expect(res.body.data.originalName).toBe(xssName);

    // Verify stored in DB as plain text
    const record = await prisma.image.findUnique({ where: { id: res.body.data.id } });
    expect(record?.originalName).toBe(xssName);
  });
});

describe('Security: oversized file upload', () => {
  it('rejects files larger than MAX_FILE_SIZE_BYTES (10MB)', async () => {
    const bigBuffer = Buffer.alloc(11 * 1024 * 1024, 'a'); // 11MB
    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', bigBuffer, { filename: 'huge.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(400);
  });
});

describe('Security: file type spoofing', () => {
  it('rejects a text file renamed as .jpg', async () => {
    const fakeImage = Buffer.from('this is not an image');
    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', fakeImage, { filename: 'fake.jpg', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  it('rejects PDF file with image MIME type', async () => {
    const pdfHeader = Buffer.from('%PDF-1.4 fake pdf content');
    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', pdfHeader, { filename: 'doc.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
  });
});

describe('Security: CORS headers', () => {
  it('responds with correct Access-Control-Allow-Origin', async () => {
    const res = await request(app)
      .options('/api/images')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('does not allow arbitrary origins', async () => {
    const res = await request(app)
      .get('/api/images')
      .set('Origin', 'https://evil.com');
    expect(res.headers['access-control-allow-origin']).not.toBe('https://evil.com');
  });
});

describe('Security: response headers (Helmet)', () => {
  it('sets X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('does not expose X-Powered-By header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('Security: path traversal in image ID', () => {
  it('returns 404 for path traversal attempts', async () => {
    const res = await request(app).get('/api/images/../../../etc/passwd');
    expect([404, 400]).toContain(res.status);
  });
});
