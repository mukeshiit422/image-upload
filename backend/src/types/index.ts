export enum ImageStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum RejectionReason {
  FORMAT_INVALID = 'FORMAT_INVALID',
  FILE_TOO_SMALL = 'FILE_TOO_SMALL',
  RESOLUTION_TOO_LOW = 'RESOLUTION_TOO_LOW',
  IMAGE_TOO_BLURRY = 'IMAGE_TOO_BLURRY',
  NO_FACE_DETECTED = 'NO_FACE_DETECTED',
  MULTIPLE_FACES = 'MULTIPLE_FACES',
  FACE_TOO_SMALL = 'FACE_TOO_SMALL',
  TOO_SIMILAR_TO_EXISTING = 'TOO_SIMILAR_TO_EXISTING',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
}

export interface ValidationResult {
  passed: boolean;
  reasons: RejectionReason[];
}

export interface FaceDetectionResult {
  faceCount: number;
  largestFaceAreaRatio: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ProcessedImageInfo {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface StorageUploadResult {
  key: string;
  url: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface UploadedImageResponse {
  id: string;
  originalName: string;
  status: ImageStatus;
  message: string;
}

export interface ImageRecord {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  storageUrl: string | null;
  thumbnailUrl: string | null;
  status: ImageStatus;
  rejectionReasons: string[];
  processedAt: Date | null;
  createdAt: Date;
}

export interface ListImagesQuery {
  status?: ImageStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
