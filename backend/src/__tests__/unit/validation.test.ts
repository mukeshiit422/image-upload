/**
 * UNIT TESTS — ValidationService
 * All external deps (face detection, sharp, prisma) are mocked.
 */
import { PrismaClient } from '@prisma/client';
import { ValidationService } from '../../services/validation.service';
import { RejectionReason } from '../../types';

jest.mock('../../services/face-detection.service');
jest.mock('../../utils/hash');
jest.mock('../../services/image-processor.service');

const mockFaceDetection = require('../../services/face-detection.service');
const mockHash = require('../../utils/hash');
const mockImageProcessor = require('../../services/image-processor.service');

const mockPrisma = {
  image: { findMany: jest.fn().mockResolvedValue([]) },
} as unknown as PrismaClient;

const VALID_MIME = 'image/jpeg';
const VALID_SIZE = 50_000; // 50KB

function setupDefaults() {
  mockFaceDetection.isFaceDetectionAvailable.mockReturnValue(true);
  mockFaceDetection.detectFaces.mockResolvedValue({ faceCount: 1, largestFaceAreaRatio: 0.15 });
  mockHash.computeLaplacianVariance.mockResolvedValue(200);
  mockHash.computePerceptualHash.mockResolvedValue('0'.repeat(64));
  mockHash.hammingDistance.mockReturnValue(100);
  mockImageProcessor.getImageMetadata.mockResolvedValue({ width: 400, height: 400 });
}

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(() => {
    service = new ValidationService(mockPrisma);
    setupDefaults();
  });

  // --- Format ---

  it('rejects unsupported MIME types', async () => {
    const result = await service.validate(Buffer.from(''), 'image/gif', VALID_SIZE);
    expect(result.passed).toBe(false);
    expect(result.reasons).toContain(RejectionReason.FORMAT_INVALID);
  });

  it('accepts jpeg, png, heic', async () => {
    for (const mime of ['image/jpeg', 'image/png', 'image/heic']) {
      const result = await service.validate(Buffer.alloc(100), mime, VALID_SIZE);
      expect(result.passed).toBe(true);
    }
  });

  // --- File size ---

  it('rejects files smaller than minimum', async () => {
    const result = await service.validate(Buffer.alloc(100), VALID_MIME, 100);
    expect(result.passed).toBe(false);
    expect(result.reasons).toContain(RejectionReason.FILE_TOO_SMALL);
  });

  // --- Resolution ---

  it('rejects images below minimum dimension', async () => {
    mockImageProcessor.getImageMetadata.mockResolvedValue({ width: 50, height: 50 });
    const result = await service.validate(Buffer.alloc(100), VALID_MIME, VALID_SIZE);
    expect(result.passed).toBe(false);
    expect(result.reasons).toContain(RejectionReason.RESOLUTION_TOO_LOW);
  });

  // --- Blur ---

  it('rejects blurry images', async () => {
    mockHash.computeLaplacianVariance.mockResolvedValue(10); // well below threshold of 100
    const result = await service.validate(Buffer.alloc(100), VALID_MIME, VALID_SIZE);
    expect(result.passed).toBe(false);
    expect(result.reasons).toContain(RejectionReason.IMAGE_TOO_BLURRY);
  });

  // --- Face detection ---

  it('rejects images with no face when requireFace is true', async () => {
    mockFaceDetection.detectFaces.mockResolvedValue({ faceCount: 0, largestFaceAreaRatio: 0 });
    const result = await service.validate(Buffer.alloc(100), VALID_MIME, VALID_SIZE);
    expect(result.passed).toBe(false);
    expect(result.reasons).toContain(RejectionReason.NO_FACE_DETECTED);
  });

  it('rejects images with multiple faces', async () => {
    mockFaceDetection.detectFaces.mockResolvedValue({ faceCount: 2, largestFaceAreaRatio: 0.1 });
    const result = await service.validate(Buffer.alloc(100), VALID_MIME, VALID_SIZE);
    expect(result.passed).toBe(false);
    expect(result.reasons).toContain(RejectionReason.MULTIPLE_FACES);
  });

  it('rejects images where face is too small', async () => {
    mockFaceDetection.detectFaces.mockResolvedValue({ faceCount: 1, largestFaceAreaRatio: 0.01 });
    const result = await service.validate(Buffer.alloc(100), VALID_MIME, VALID_SIZE);
    expect(result.passed).toBe(false);
    expect(result.reasons).toContain(RejectionReason.FACE_TOO_SMALL);
  });

  it('skips face check when face detection is unavailable', async () => {
    mockFaceDetection.isFaceDetectionAvailable.mockReturnValue(false);
    const result = await service.validate(Buffer.alloc(100), VALID_MIME, VALID_SIZE);
    expect(result.passed).toBe(true);
    expect(result.reasons).not.toContain(RejectionReason.NO_FACE_DETECTED);
  });

  // --- Similarity ---

  it('rejects duplicate images', async () => {
    mockPrisma.image.findMany = jest.fn().mockResolvedValue([
      { id: 'existing-id', perceptualHash: '0'.repeat(64) },
    ]);
    mockHash.hammingDistance.mockReturnValue(0); // identical hash
    const result = await service.validate(Buffer.alloc(100), VALID_MIME, VALID_SIZE);
    expect(result.passed).toBe(false);
    expect(result.reasons).toContain(RejectionReason.TOO_SIMILAR_TO_EXISTING);
  });

  it('passes all checks for a valid image', async () => {
    const result = await service.validate(Buffer.alloc(100), VALID_MIME, VALID_SIZE);
    expect(result.passed).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });
});
