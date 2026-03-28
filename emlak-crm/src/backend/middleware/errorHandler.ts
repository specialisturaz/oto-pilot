import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import logger from '../utils/logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    options: { isOperational?: boolean; code?: string; details?: unknown } = {}
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = options.isOperational ?? true;
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.details = options.details;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error factories
export const NotFoundError = (resource: string) =>
  new AppError(404, `${resource} bulunamadi`, { code: 'NOT_FOUND' });

export const UnauthorizedError = (message = 'Yetkisiz erisim') =>
  new AppError(401, message, { code: 'UNAUTHORIZED' });

export const ForbiddenError = (message = 'Bu islem icin yetkiniz yok') =>
  new AppError(403, message, { code: 'FORBIDDEN' });

export const BadRequestError = (message: string, details?: unknown) =>
  new AppError(400, message, { code: 'BAD_REQUEST', details });

export const ConflictError = (message: string) =>
  new AppError(409, message, { code: 'CONFLICT' });

/**
 * Wraps an async route handler so thrown errors are forwarded to Express error middleware.
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Formats a Zod validation error into a user-friendly structure.
 */
function formatZodError(error: ZodError) {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}

/**
 * Handles Prisma-specific errors and converts them to AppError.
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case 'P2002': {
      const fields = (error.meta?.target as string[]) || ['bilinmeyen'];
      return new AppError(409, `Bu ${fields.join(', ')} degeri zaten kullaniliyor`, {
        code: 'DUPLICATE_ENTRY',
        details: { fields },
      });
    }
    case 'P2025':
      return new AppError(404, 'Kayit bulunamadi', { code: 'NOT_FOUND' });
    case 'P2003':
      return new AppError(400, 'Iliskili kayit bulunamadi', {
        code: 'FOREIGN_KEY_VIOLATION',
      });
    case 'P2014':
      return new AppError(400, 'Bu islem iliskili kayitlari ihlal ediyor', {
        code: 'RELATION_VIOLATION',
      });
    default:
      return new AppError(500, 'Veritabani hatasi', { code: 'DATABASE_ERROR' });
  }
}

/**
 * Global error handler middleware. Must have 4 parameters for Express to recognize it.
 */
export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // ZodError -> 400 validation
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dogrulama hatasi',
        details: formatZodError(err),
      },
    });
    return;
  }

  // Prisma known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const appError = handlePrismaError(err);
    res.status(appError.statusCode).json({
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details,
      },
    });
    return;
  }

  // Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error('Prisma validation error:', err.message);
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Veritabani dogrulama hatasi',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      },
    });
    return;
  }

  // Our own AppError
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Non-operational error:', err);
    }
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Gecersiz token',
      },
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token suresi dolmus',
      },
    });
    return;
  }

  // Unexpected errors
  logger.error('Beklenmeyen hata:', err);

  const isProduction = process.env.NODE_ENV === 'production';
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'Sunucu hatasi' : err.message,
      ...(isProduction ? {} : { stack: err.stack }),
    },
  });
}
