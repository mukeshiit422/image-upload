import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { config } from '../../config';
import { AppError } from '../utils/async-handler';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.storage.tempDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = (config.validation.allowedMimeTypes as readonly string[]).includes(file.mimetype);
  const extOk = (config.validation.allowedExtensions as readonly string[]).includes(ext);

  // Accept if either the MIME type or the extension is valid (HEIC browsers often send application/octet-stream)
  if (mimeOk || extOk) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type. Allowed formats: JPEG, PNG, HEIC. Got: ${file.mimetype} (${ext})`,
        400
      )
    );
  }
}

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.validation.maxFileSizeBytes,
    files: 1,
  },
}).single('image');

export function normalizeHeicMime(file: Express.Multer.File): string {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.heic' || ext === '.heif') return 'image/heic';
  if (ext === '.png') return 'image/png';
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') return 'image/jpeg';
  return file.mimetype;
}
