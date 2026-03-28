import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import logger from '../utils/logger';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  officeId: string | null;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  officeId: string | null;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Extracts and verifies the JWT from the Authorization header.
 * Attaches the decoded user to req.user.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw UnauthorizedError('Erisim tokeni gerekli');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw UnauthorizedError('Erisim tokeni gerekli');
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      officeId: decoded.officeId,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(UnauthorizedError('Gecersiz token'));
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      next(UnauthorizedError('Token suresi dolmus'));
      return;
    }
    next(error);
  }
}

/**
 * Middleware factory that checks if the authenticated user has one of the required roles.
 * Must be used after requireAuth.
 */
export function requireRole(roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(UnauthorizedError('Kimlik dogrulamasi gerekli'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        `Yetkisiz erisim denemesi: Kullanici ${req.user.id} (rol: ${req.user.role}) gereken roller: ${roles.join(', ')}`
      );
      next(ForbiddenError('Bu islem icin yetkiniz yok'));
      return;
    }

    next();
  };
}

/**
 * Optional auth: attaches user if token is present, but does not reject if missing.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      next();
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      officeId: decoded.officeId,
    };
  } catch {
    // Token invalid/expired - continue without user
  }

  next();
}
