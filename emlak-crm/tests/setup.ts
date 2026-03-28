/**
 * Global test setup for Emlak CRM.
 * Executed before every test file via vitest setupFiles.
 */

import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// 1. Load .env from project root (fallback values for CI)
// ---------------------------------------------------------------------------
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Override critical environment variables for the test environment so tests
// never accidentally hit production resources.
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Let OS pick a free port
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-emlak-crm-2026';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-key-emlak-crm-2026';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Disable external services in tests
process.env.REDIS_ENABLED = 'false';
process.env.WHATSAPP_ENABLED = 'false';
process.env.SMS_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
process.env.SAHIBINDEN_ENABLED = 'false';
process.env.HEPSIEMLAK_ENABLED = 'false';
process.env.EMLAKJET_ENABLED = 'false';

// ---------------------------------------------------------------------------
// 2. Helper: create a signed JWT for tests
// ---------------------------------------------------------------------------
export interface TestTokenPayload {
  userId: string;
  email: string;
  role: string;
  officeId: string | null;
}

/**
 * Creates a valid access token for test requests.
 *
 * @example
 *   const token = createTestAccessToken({
 *     userId: 'user-1',
 *     email: 'ahmet@emlak.com',
 *     role: 'ADMIN',
 *     officeId: 'office-1',
 *   });
 */
export function createTestAccessToken(payload: TestTokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

/**
 * Creates a valid refresh token for test requests.
 */
export function createTestRefreshToken(payload: TestTokenPayload): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
}

// ---------------------------------------------------------------------------
// 3. Default test user data (Turkish names / addresses)
// ---------------------------------------------------------------------------
export const TEST_USER = {
  id: 'test-user-id-1',
  email: 'ahmet.yilmaz@emlak.com',
  firstName: 'Ahmet',
  lastName: 'Yilmaz',
  phone: '05321234567',
  role: 'ADMIN',
  officeId: 'test-office-id-1',
  isActive: true,
  passwordHash: '$2a$12$LJ3/W9Kh9R0pMfH6qXUHUO1mZMkxLHxE0GqS6v.mV0KMKEX/XRWG', // hashed "Test1234"
  createdAt: new Date('2025-01-15T10:30:00Z'),
  lastLoginAt: new Date('2026-03-28T08:00:00Z'),
  avatarUrl: null,
  notificationPreferences: null,
} as const;

export const TEST_OFFICE = {
  id: 'test-office-id-1',
  name: 'Yilmaz Emlak Ofisi',
  address: 'Bagdat Caddesi No:123, Kadikoy',
  city: 'Istanbul',
  district: 'Kadikoy',
  phone: '02161234567',
  logoUrl: null,
} as const;

/**
 * Returns a default Authorization header with a valid test token.
 */
export function getAuthHeader(overrides?: Partial<TestTokenPayload>): { Authorization: string } {
  const token = createTestAccessToken({
    userId: TEST_USER.id,
    email: TEST_USER.email,
    role: TEST_USER.role,
    officeId: TEST_USER.officeId,
    ...overrides,
  });
  return { Authorization: `Bearer ${token}` };
}
