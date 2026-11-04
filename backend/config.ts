import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

function getEnvFloat(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) return fallback;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
}

const dbHost     = requireEnv('DB_HOST', 'localhost');
const dbPort     = getEnvNumber('DB_PORT', 5432);
const dbUser     = requireEnv('DB_USER', 'postgres');
const dbPassword = requireEnv('DB_PASSWORD', 'password');
const dbName     = requireEnv('DB_NAME', 'image_upload_db');

// Prisma reads DATABASE_URL from process.env — construct it from individual parts
const databaseUrl = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
process.env.DATABASE_URL = databaseUrl;

export const config = {
  port: getEnvNumber('PORT', 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDevelopment: (process.env.NODE_ENV ?? 'development') === 'development',

  database: {
    host:     dbHost,
    port:     dbPort,
    user:     dbUser,
    password: dbPassword,
    name:     dbName,
    url:      databaseUrl,
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION ?? 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET,
    endpointUrl: process.env.AWS_ENDPOINT_URL,
  },

  storage: {
    mode: (process.env.STORAGE_MODE ?? 'local') as 'local' | 's3',
    localUploadDir: path.join(__dirname, 'uploads'),
    tempDir: path.join(__dirname, 'uploads/temp'),
    modelsDir: path.join(__dirname, 'models'),
  },

  validation: {
    minFileSizeBytes: getEnvNumber('MIN_FILE_SIZE_BYTES', 1024),
    maxFileSizeBytes: getEnvNumber('MAX_FILE_SIZE_BYTES', 10 * 1024 * 1024),
    minDimensionPx: getEnvNumber('MIN_DIMENSION_PX', 200),
    blurThreshold: getEnvNumber('BLUR_THRESHOLD', 100),
    faceMinAreaRatio: getEnvFloat('FACE_MIN_AREA_RATIO', 0.05),
    similarityHashDistance: getEnvNumber('SIMILARITY_HASH_DISTANCE', 10),
    faceConfidenceThreshold: getEnvFloat('FACE_CONFIDENCE_THRESHOLD', 0.5),
    requireFace: (process.env.REQUIRE_FACE ?? 'false') === 'true',
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.heic', '.heif'],
  },

  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  },

  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    max: getEnvNumber('RATE_LIMIT_MAX', 100),
  },
} as const;
