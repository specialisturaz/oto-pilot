import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
  asyncHandler,
  globalErrorHandler,
} from '../../../src/backend/middleware/errorHandler';

// ---------------------------------------------------------------------------
// Helper: create mock Express req/res/next
// ---------------------------------------------------------------------------
function createMocks() {
  const req = {} as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

// ---------------------------------------------------------------------------
// AppError class
// ---------------------------------------------------------------------------
describe('AppError', () => {
  it('should create an error with correct statusCode and message', () => {
    const error = new AppError(400, 'Gecersiz istek');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Gecersiz istek');
    expect(error.isOperational).toBe(true);
    expect(error.code).toBe('INTERNAL_ERROR');
  });

  it('should accept custom options', () => {
    const error = new AppError(422, 'Dogrulama hatasi', {
      isOperational: false,
      code: 'CUSTOM_CODE',
      details: { field: 'email' },
    });

    expect(error.statusCode).toBe(422);
    expect(error.isOperational).toBe(false);
    expect(error.code).toBe('CUSTOM_CODE');
    expect(error.details).toEqual({ field: 'email' });
  });

  it('should have a proper stack trace', () => {
    const error = new AppError(500, 'Sunucu hatasi');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('Sunucu hatasi');
  });

  it('should default isOperational to true', () => {
    const error = new AppError(503, 'Servis kullanim disi');

    expect(error.isOperational).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Error factory functions
// ---------------------------------------------------------------------------
describe('Error factory functions', () => {
  it('NotFoundError should create a 404 error', () => {
    const error = NotFoundError('Musteri');

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Musteri bulunamadi');
    expect(error.code).toBe('NOT_FOUND');
  });

  it('UnauthorizedError should create a 401 error with default message', () => {
    const error = UnauthorizedError();

    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Yetkisiz erisim');
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('UnauthorizedError should accept a custom message', () => {
    const error = UnauthorizedError('Gecersiz e-posta veya sifre');

    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Gecersiz e-posta veya sifre');
  });

  it('ForbiddenError should create a 403 error with default message', () => {
    const error = ForbiddenError();

    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Bu islem icin yetkiniz yok');
    expect(error.code).toBe('FORBIDDEN');
  });

  it('ForbiddenError should accept a custom message', () => {
    const error = ForbiddenError('Bu musteriye erisim yetkiniz yok');

    expect(error.message).toBe('Bu musteriye erisim yetkiniz yok');
  });

  it('BadRequestError should create a 400 error', () => {
    const error = BadRequestError('Gecersiz veri formati');

    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Gecersiz veri formati');
    expect(error.code).toBe('BAD_REQUEST');
  });

  it('BadRequestError should accept details', () => {
    const error = BadRequestError('Dogrulama hatasi', { fields: ['email', 'phone'] });

    expect(error.details).toEqual({ fields: ['email', 'phone'] });
  });

  it('ConflictError should create a 409 error', () => {
    const error = ConflictError('Bu e-posta adresi zaten kayitli');

    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('Bu e-posta adresi zaten kayitli');
    expect(error.code).toBe('CONFLICT');
  });
});

// ---------------------------------------------------------------------------
// asyncHandler
// ---------------------------------------------------------------------------
describe('asyncHandler', () => {
  it('should call the wrapped function and pass through on success', async () => {
    const { req, res, next } = createMocks();
    const handler = vi.fn().mockResolvedValue(undefined);

    const wrapped = asyncHandler(handler);
    await wrapped(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('should catch errors and forward them to next()', async () => {
    const { req, res, next } = createMocks();
    const error = new AppError(500, 'Test hatasi');
    const handler = vi.fn().mockRejectedValue(error);

    const wrapped = asyncHandler(handler);
    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should forward unexpected errors to next()', async () => {
    const { req, res, next } = createMocks();
    const error = new Error('Beklenmeyen hata');
    const handler = vi.fn().mockRejectedValue(error);

    const wrapped = asyncHandler(handler);
    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

// ---------------------------------------------------------------------------
// globalErrorHandler
// ---------------------------------------------------------------------------
describe('globalErrorHandler', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    const mocks = createMocks();
    req = mocks.req;
    res = mocks.res;
    next = mocks.next;
  });

  it('should handle AppError with correct status and response', () => {
    const error = new AppError(404, 'Emlak ilani bulunamadi', { code: 'NOT_FOUND' });

    globalErrorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Emlak ilani bulunamadi',
      },
    });
  });

  it('should include details when AppError has them', () => {
    const error = new AppError(400, 'Dogrulama hatasi', {
      code: 'VALIDATION_ERROR',
      details: { field: 'price', issue: 'Fiyat negatif olamaz' },
    });

    globalErrorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dogrulama hatasi',
        details: { field: 'price', issue: 'Fiyat negatif olamaz' },
      },
    });
  });

  it('should handle ZodError as 400 validation error', () => {
    // Use the same ZodError imported via ESM at the top of this file
    const zodError = new ZodError([
      {
        code: 'too_small',
        minimum: 2,
        type: 'string',
        inclusive: true,
        exact: false,
        message: 'Ad en az 2 karakter olmali',
        path: ['first_name'],
      },
    ]);

    globalErrorHandler(zodError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Dogrulama hatasi',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'first_name',
              message: 'Ad en az 2 karakter olmali',
            }),
          ]),
        }),
      })
    );
  });

  it('should handle JWT JsonWebTokenError as 401', () => {
    const error = new Error('invalid signature');
    error.name = 'JsonWebTokenError';

    globalErrorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Gecersiz token',
      },
    });
  });

  it('should handle JWT TokenExpiredError as 401', () => {
    const error = new Error('jwt expired');
    error.name = 'TokenExpiredError';

    globalErrorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token suresi dolmus',
      },
    });
  });

  it('should handle unexpected errors as 500 in non-production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    const error = new Error('Bilinmeyen bir hata olustu');

    globalErrorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Bilinmeyen bir hata olustu',
        }),
      })
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('should hide error details in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const error = new Error('Hassas hata bilgisi');

    globalErrorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Sunucu hatasi',
      },
    });

    process.env.NODE_ENV = originalEnv;
  });
});
