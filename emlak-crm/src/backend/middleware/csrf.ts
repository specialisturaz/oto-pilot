import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = '__csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure CSRF token.
 */
function generateToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * CSRF protection middleware.
 *
 * - Sets an httpOnly CSRF cookie on every response if one is not already present.
 * - On state-changing methods (POST, PUT, PATCH, DELETE), validates that the
 *   X-CSRF-Token request header matches the cookie value.
 * - Skips validation for routes that already use JWT bearer-token authentication
 *   (Authorization header present), since those are not vulnerable to CSRF.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // -----------------------------------------------------------------------
  // 1. Ensure a CSRF token cookie exists
  // -----------------------------------------------------------------------
  let cookieToken: string | undefined = req.cookies?.[CSRF_COOKIE_NAME];

  if (!cookieToken) {
    cookieToken = generateToken();
    res.cookie(CSRF_COOKIE_NAME, cookieToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  // -----------------------------------------------------------------------
  // 2. Skip CSRF check for safe (read-only) methods
  // -----------------------------------------------------------------------
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // -----------------------------------------------------------------------
  // 3. Skip CSRF check when JWT auth is used (bearer token in header)
  //    JWT-authenticated API requests are not vulnerable to CSRF because
  //    the browser does not automatically attach the Authorization header.
  // -----------------------------------------------------------------------
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // -----------------------------------------------------------------------
  // 4. Validate CSRF token for state-changing requests without JWT
  // -----------------------------------------------------------------------
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!headerToken || headerToken !== cookieToken) {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'Gecersiz veya eksik CSRF tokeni. Lutfen sayfayi yenileyip tekrar deneyin.',
      },
    });
    return;
  }

  next();
}

/**
 * Endpoint to fetch a fresh CSRF token for SPA clients.
 * The client can call GET /api/v1/csrf-token and read the token from the
 * response body, then send it back via the X-CSRF-Token header.
 */
export function csrfTokenEndpoint(_req: Request, res: Response): void {
  const token = generateToken();

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  res.json({ success: true, data: { csrfToken: token } });
}
