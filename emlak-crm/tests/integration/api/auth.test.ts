import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Mock Prisma before importing anything that depends on it
// ---------------------------------------------------------------------------
const { mockPrismaUser } = vi.hoisted(() => ({
  mockPrismaUser: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    user: mockPrismaUser,
  })),
}));

vi.mock('../../../src/backend/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  requestLogFormat: vi.fn().mockReturnValue(''),
}));

vi.mock('../../../src/backend/config', () => ({
  default: {
    server: {
      port: 0,
      nodeEnv: 'test',
      frontendUrl: 'http://localhost:3000',
      isProduction: false,
    },
    jwt: {
      secret: 'test-jwt-secret-key-emlak-crm-2026',
      expiresIn: '15m',
      refreshSecret: 'test-jwt-refresh-secret-key-emlak-crm-2026',
      refreshExpiresIn: '7d',
    },
    upload: {
      uploadsDir: '/tmp/test-uploads',
      maxFileSize: 10485760,
      allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
      allowedDocumentTypes: ['application/pdf'],
    },
  },
}));

// ---------------------------------------------------------------------------
// Build a test Express app using the real auth routes
// ---------------------------------------------------------------------------
import authRoutes from '../../../src/backend/modules/auth/auth.routes';
import { globalErrorHandler } from '../../../src/backend/middleware/errorHandler';

let app: express.Express;

const TEST_USER_PASSWORD = 'GucluSifre1';
let testPasswordHash: string;

const TEST_USER = {
  id: 'integration-user-1',
  email: 'burak.sahin@emlak.com',
  firstName: 'Burak',
  lastName: 'Sahin',
  phone: '05421234567',
  role: 'ADMIN',
  officeId: 'integration-office-1',
  isActive: true,
  createdAt: new Date('2025-01-15T10:00:00Z'),
  lastLoginAt: null,
  avatarUrl: null,
  notificationPreferences: null,
  passwordHash: '', // set in beforeAll
};

beforeAll(async () => {
  testPasswordHash = await bcrypt.hash(TEST_USER_PASSWORD, 4);
  TEST_USER.passwordHash = testPasswordHash;

  app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  app.use(globalErrorHandler);
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/login
// ---------------------------------------------------------------------------
describe('POST /api/v1/auth/login', () => {
  it('should return 200 with tokens for valid credentials', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({ ...TEST_USER });
    mockPrismaUser.update.mockResolvedValue({ ...TEST_USER, lastLoginAt: new Date() });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'burak.sahin@emlak.com',
        password: TEST_USER_PASSWORD,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.user).toBeDefined();
    expect(response.body.data.user.email).toBe('burak.sahin@emlak.com');
    expect(response.body.data.user.firstName).toBe('Burak');
    expect(response.body.data.access_token).toBeDefined();
    expect(response.body.data.refresh_token).toBeDefined();
  });

  it('should return valid JWT in access_token', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({ ...TEST_USER });
    mockPrismaUser.update.mockResolvedValue({ ...TEST_USER });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'burak.sahin@emlak.com',
        password: TEST_USER_PASSWORD,
      })
      .expect(200);

    const decoded = jwt.verify(
      response.body.data.access_token,
      'test-jwt-secret-key-emlak-crm-2026'
    ) as any;

    expect(decoded.userId).toBe(TEST_USER.id);
    expect(decoded.email).toBe(TEST_USER.email);
    expect(decoded.role).toBe('ADMIN');
    expect(decoded.officeId).toBe(TEST_USER.officeId);
  });

  it('should return 401 for incorrect password', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({ ...TEST_USER });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'burak.sahin@emlak.com',
        password: 'YanlisSifre999',
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(response.body.error.message).toBe('Gecersiz e-posta veya sifre');
  });

  it('should return 401 for non-existent email', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'yok@emlak.com',
        password: 'HerhangiBirSifre1',
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 for inactive user', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({
      ...TEST_USER,
      isActive: false,
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'burak.sahin@emlak.com',
        password: TEST_USER_PASSWORD,
      })
      .expect(401);

    expect(response.body.error.message).toBe('Hesabiniz devre disi birakilmis');
  });

  it('should return 400 for missing email', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        password: 'GucluSifre1',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for missing password', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'burak.sahin@emlak.com',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for invalid email format', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'gecersiz-email',
        password: 'GucluSifre1',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should not include passwordHash in user response', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({ ...TEST_USER });
    mockPrismaUser.update.mockResolvedValue({ ...TEST_USER });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'burak.sahin@emlak.com',
        password: TEST_USER_PASSWORD,
      })
      .expect(200);

    expect(response.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('should have correct response format', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({ ...TEST_USER });
    mockPrismaUser.update.mockResolvedValue({ ...TEST_USER });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'burak.sahin@emlak.com',
        password: TEST_USER_PASSWORD,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        user: {
          id: expect.any(String),
          email: expect.any(String),
          firstName: expect.any(String),
          lastName: expect.any(String),
          role: expect.any(String),
        },
        access_token: expect.any(String),
        refresh_token: expect.any(String),
      },
    });
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/register
// ---------------------------------------------------------------------------
describe('POST /api/v1/auth/register', () => {
  it('should return 201 for valid registration', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);
    mockPrismaUser.create.mockResolvedValue({
      id: 'new-user-uuid',
      email: 'yeni.kullanici@emlak.com',
      firstName: 'Yeni',
      lastName: 'Kullanici',
      phone: '05331112233',
      role: 'ADMIN',
      officeId: null,
      createdAt: new Date(),
    });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'yeni.kullanici@emlak.com',
        password: 'GucluSifre1',
        first_name: 'Yeni',
        last_name: 'Kullanici',
        phone: '05331112233',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('yeni.kullanici@emlak.com');
    expect(response.body.data.access_token).toBeDefined();
    expect(response.body.data.refresh_token).toBeDefined();
  });

  it('should return 400 for weak password', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@emlak.com',
        password: '123', // too short, no uppercase, no lowercase
        first_name: 'Test',
        last_name: 'Kullanici',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 409 for duplicate email', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({ ...TEST_USER });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'burak.sahin@emlak.com',
        password: 'GucluSifre1',
        first_name: 'Burak',
        last_name: 'Sahin',
      })
      .expect(409);

    expect(response.body.error.code).toBe('CONFLICT');
  });
});
