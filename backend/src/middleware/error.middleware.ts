import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { logger } from '../utils/logger';
import { AppError } from '../utils/async-handler';
import { ApiResponse } from '../types';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Unhandled error', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  // Multer errors
  if (err instanceof multer.MulterError) {
    const statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File too large. Maximum size is ${Math.round(10 * 1024 * 1024 / 1024 / 1024)}MB`
        : `Upload error: ${err.message}`;

    const response: ApiResponse = { success: false, error: message };
    res.status(statusCode).json(response);
    return;
  }

  // Operational errors (AppError)
  if (err instanceof AppError) {
    const response: ApiResponse = { success: false, error: err.message };
    res.status(err.statusCode).json(response);
    return;
  }

  // Unknown errors
  const response: ApiResponse = {
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  };
  res.status(500).json(response);
}

export function notFoundMiddleware(req: Request, res: Response): void {
  const response: ApiResponse = { success: false, error: `Route ${req.path} not found` };
  res.status(404).json(response);
}
