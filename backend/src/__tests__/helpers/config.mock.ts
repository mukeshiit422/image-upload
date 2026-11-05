import fs from 'fs';
import os from 'os';

// Set DATABASE_URL before Prisma client initialises (uses CI value or local fallback)
const testDbUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/image_upload_test';
process.env.DATABASE_URL = testDbUrl;

const testUploadDir = `${os.tmpdir()}/test-uploads`;
const testTempDir   = `${testUploadDir}/temp`;
fs.mkdirSync(testTempDir, { recursive: true });

export const config = {
  port: 3000,
  nodeEnv: 'test',
  isDevelopment: false,
  database: { host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', name: 'image_upload_test', url: '' },
  aws: {
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    region: 'ap-south-1',
    bucket: 'test-bucket',
    endpointUrl: undefined,
    imageBaseUrl: 'https://d3eks1vjagjqcv.cloudfront.net',
  },
  storage: {
    mode: 'local' as const,
    localUploadDir: testUploadDir,
    tempDir: testTempDir,
    modelsDir: '/tmp/models',
  },
  validation: {
    minFileSizeBytes: 10240,
    maxFileSizeBytes: 10 * 1024 * 1024,
    minDimensionPx: 200,
    blurThreshold: 100,
    faceMinAreaRatio: 0.05,
    similarityHashDistance: 10,
    faceConfidenceThreshold: 0.5,
    requireFace: true,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.heic', '.heif'],
  },
  cors: { origin: 'http://localhost:5173' },
  rateLimit: { windowMs: 900000, max: 100 },
} as const;
