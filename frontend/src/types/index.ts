export enum ImageStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export const REJECTION_REASON_LABELS: Record<string, string> = {
  FORMAT_INVALID: 'Invalid file format',
  FILE_TOO_SMALL: 'File size too small (min 10KB)',
  RESOLUTION_TOO_LOW: 'Resolution too low (min 200×200px)',
  IMAGE_TOO_BLURRY: 'Image is too blurry',
  NO_FACE_DETECTED: 'No face detected',
  MULTIPLE_FACES: 'Multiple faces detected',
  FACE_TOO_SMALL: 'Detected face is too small',
  TOO_SIMILAR_TO_EXISTING: 'Too similar to an existing image',
  PROCESSING_FAILED: 'Processing error',
};

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
  processedAt: string | null;
  createdAt: string;
}

export interface UploadedImageResponse {
  id: string;
  originalName: string;
  status: ImageStatus;
  message: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UploadItem {
  localId: string;
  file: File;
  previewUrl: string;
  uploadProgress: number;
  status: 'pending' | 'uploading' | 'processing' | 'done' | 'error';
  imageRecord: ImageRecord | null;
  error: string | null;
}
