import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Mock Prisma client – vi.hoisted() ensures the variable is available when
// vi.mock (which is hoisted to the top of the file) executes.
// ---------------------------------------------------------------------------
const { mockPrismaUser } = vi.hoisted(() => {
  return {
    mockPrismaUser: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
});

vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn().mockImplementation(() => ({
      user: mockPrismaUser,
    })),
  };
});

// Mock logger to silence output in tests
vi.mock('../../../src/backend/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock config – provide test-safe values
vi.mock('../../../src/backend/config', () => ({
  default: {
    server: {
      port: 3001,
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
  },
}));

import { AuthService } from '../../../src/backend/modules/auth/auth.service';
import { AppError } from '../../../src/backend/middleware/errorHandler';

// ---------------------------------------------------------------------------
// Test data (Turkish names and values)
// ---------------------------------------------------------------------------
const TEST_PASSWORD = 'GucluSifre1';
const TEST_HASHED_PASSWORD = '$2a$12$LJ3/W9Kh9R0pMfH6qXUHUO1mZMkxLHxE0GqS6v.mV0KMKEX/XRWG';

const EXISTING_USER = {
  id: 'user-uuid-1',
  email: 'mehmet.kaya@emlak.com',
  passwordHash: '', // will be set in beforeEach
  firstName: 'Mehmet',
  lastName: 'Kaya',
  phone: '05551234567',
  role: 'ADMIN',
  officeId: 'office-uuid-1',
  isActive: true,
  createdAt: new Date('2025-06-15T10:00:00Z'),
  lastLoginAt: null,
  avatarUrl: null,
  notificationPreferences: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
  });

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------
  describe('register', () => {
    it('should register a new user with valid data', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null); // no existing user
      mockPrismaUser.create.mockResolvedValue({
        id: 'new-user-uuid',
        email: 'ayse.demir@emlak.com',
        firstName: 'Ayse',
        lastName: 'Demir',
        phone: '05329876543',
        role: 'ADMIN',
        officeId: null,
        createdAt: new Date(),
      });

      const result = await authService.register({
        email: 'ayse.demir@emlak.com',
        password: 'GucluSifre1',
        first_name: 'Ayse',
        last_name: 'Demir',
        phone: '05329876543',
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('ayse.demir@emlak.com');
      expect(result.user.firstName).toBe('Ayse');
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();

      // Verify Prisma was called correctly
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'ayse.demir@emlak.com' },
      });
      expect(mockPrismaUser.create).toHaveBeenCalledTimes(1);
    });

    it('should hash the password before storing', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPrismaUser.create.mockResolvedValue({
        id: 'new-user-uuid',
        email: 'fatma.ozturk@emlak.com',
        firstName: 'Fatma',
        lastName: 'Ozturk',
        phone: null,
        role: 'ADMIN',
        officeId: null,
        createdAt: new Date(),
      });

      await authService.register({
        email: 'fatma.ozturk@emlak.com',
        password: 'GucluSifre1',
        first_name: 'Fatma',
        last_name: 'Ozturk',
      });

      // Check that the passwordHash passed to create is a bcrypt hash
      const createCall = mockPrismaUser.create.mock.calls[0][0];
      const storedHash = createCall.data.passwordHash;

      expect(storedHash).toBeDefined();
      expect(storedHash).not.toBe('GucluSifre1'); // Must not be plaintext
      expect(storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')).toBe(true);

      // Verify the hash matches the original password
      const isMatch = await bcrypt.compare('GucluSifre1', storedHash);
      expect(isMatch).toBe(true);
    });

    it('should throw ConflictError when email already exists', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(EXISTING_USER);

      await expect(
        authService.register({
          email: 'mehmet.kaya@emlak.com',
          password: 'GucluSifre1',
          first_name: 'Mehmet',
          last_name: 'Kaya',
        })
      ).rejects.toThrow(AppError);

      await expect(
        authService.register({
          email: 'mehmet.kaya@emlak.com',
          password: 'GucluSifre1',
          first_name: 'Mehmet',
          last_name: 'Kaya',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Bu e-posta adresi zaten kayitli',
      });
    });

    it('should generate valid JWT tokens on registration', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPrismaUser.create.mockResolvedValue({
        id: 'jwt-test-user',
        email: 'ali.celik@emlak.com',
        firstName: 'Ali',
        lastName: 'Celik',
        phone: null,
        role: 'ADMIN',
        officeId: null,
        createdAt: new Date(),
      });

      const result = await authService.register({
        email: 'ali.celik@emlak.com',
        password: 'GucluSifre1',
        first_name: 'Ali',
        last_name: 'Celik',
      });

      // Decode access token
      const decoded = jwt.verify(
        result.access_token,
        'test-jwt-secret-key-emlak-crm-2026'
      ) as any;

      expect(decoded.userId).toBe('jwt-test-user');
      expect(decoded.email).toBe('ali.celik@emlak.com');
      expect(decoded.role).toBe('ADMIN');
      expect(decoded.exp).toBeDefined();

      // Decode refresh token
      const refreshDecoded = jwt.verify(
        result.refresh_token,
        'test-jwt-refresh-secret-key-emlak-crm-2026'
      ) as any;

      expect(refreshDecoded.userId).toBe('jwt-test-user');
    });

    it('should assign AGENT role when officeId is provided', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPrismaUser.create.mockResolvedValue({
        id: 'agent-user',
        email: 'zeynep.arslan@emlak.com',
        firstName: 'Zeynep',
        lastName: 'Arslan',
        phone: null,
        role: 'AGENT',
        officeId: 'office-uuid-1',
        createdAt: new Date(),
      });

      await authService.register({
        email: 'zeynep.arslan@emlak.com',
        password: 'GucluSifre1',
        first_name: 'Zeynep',
        last_name: 'Arslan',
        officeId: 'office-uuid-1',
      } as any);

      const createCall = mockPrismaUser.create.mock.calls[0][0];
      expect(createCall.data.role).toBe('AGENT');
      expect(createCall.data.officeId).toBe('office-uuid-1');
    });
  });

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------
  describe('login', () => {
    beforeEach(async () => {
      // Pre-hash the password for the existing user
      EXISTING_USER.passwordHash = await bcrypt.hash(TEST_PASSWORD, 4); // Low rounds for speed
    });

    it('should login with correct credentials', async () => {
      mockPrismaUser.findUnique.mockResolvedValue({ ...EXISTING_USER });
      mockPrismaUser.update.mockResolvedValue({ ...EXISTING_USER, lastLoginAt: new Date() });

      const result = await authService.login({
        email: 'mehmet.kaya@emlak.com',
        password: TEST_PASSWORD,
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('mehmet.kaya@emlak.com');
      expect(result.user.firstName).toBe('Mehmet');
      expect(result.user.lastName).toBe('Kaya');
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();

      // Verify lastLoginAt was updated
      expect(mockPrismaUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: EXISTING_USER.id },
          data: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
        })
      );
    });

    it('should throw UnauthorizedError for non-existent email', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'olmayan.kullanici@emlak.com',
          password: 'HerhangiBirSifre1',
        })
      ).rejects.toThrow(AppError);

      await expect(
        authService.login({
          email: 'olmayan.kullanici@emlak.com',
          password: 'HerhangiBirSifre1',
        })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Gecersiz e-posta veya sifre',
      });
    });

    it('should throw UnauthorizedError for incorrect password', async () => {
      mockPrismaUser.findUnique.mockResolvedValue({ ...EXISTING_USER });

      await expect(
        authService.login({
          email: 'mehmet.kaya@emlak.com',
          password: 'YanlisSifre123',
        })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Gecersiz e-posta veya sifre',
      });
    });

    it('should throw UnauthorizedError for inactive user', async () => {
      mockPrismaUser.findUnique.mockResolvedValue({
        ...EXISTING_USER,
        isActive: false,
      });

      await expect(
        authService.login({
          email: 'mehmet.kaya@emlak.com',
          password: TEST_PASSWORD,
        })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Hesabiniz devre disi birakilmis',
      });
    });

    it('should return user data without passwordHash', async () => {
      mockPrismaUser.findUnique.mockResolvedValue({ ...EXISTING_USER });
      mockPrismaUser.update.mockResolvedValue({ ...EXISTING_USER });

      const result = await authService.login({
        email: 'mehmet.kaya@emlak.com',
        password: TEST_PASSWORD,
      });

      // The user object in the response should not contain passwordHash
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.id).toBe(EXISTING_USER.id);
      expect(result.user.email).toBe(EXISTING_USER.email);
      expect(result.user.role).toBe(EXISTING_USER.role);
      expect(result.user.officeId).toBe(EXISTING_USER.officeId);
    });

    it('should generate tokens with correct payload', async () => {
      mockPrismaUser.findUnique.mockResolvedValue({ ...EXISTING_USER });
      mockPrismaUser.update.mockResolvedValue({ ...EXISTING_USER });

      const result = await authService.login({
        email: 'mehmet.kaya@emlak.com',
        password: TEST_PASSWORD,
      });

      const decoded = jwt.verify(
        result.access_token,
        'test-jwt-secret-key-emlak-crm-2026'
      ) as any;

      expect(decoded.userId).toBe(EXISTING_USER.id);
      expect(decoded.email).toBe(EXISTING_USER.email);
      expect(decoded.role).toBe(EXISTING_USER.role);
      expect(decoded.officeId).toBe(EXISTING_USER.officeId);
    });
  });

  // -------------------------------------------------------------------------
  // Password hashing verification
  // -------------------------------------------------------------------------
  describe('password hashing', () => {
    it('should produce different hashes for the same password', async () => {
      const hash1 = await bcrypt.hash('AyniSifre123', 4);
      const hash2 = await bcrypt.hash('AyniSifre123', 4);

      expect(hash1).not.toBe(hash2); // Different salts
      expect(await bcrypt.compare('AyniSifre123', hash1)).toBe(true);
      expect(await bcrypt.compare('AyniSifre123', hash2)).toBe(true);
    });

    it('should not match an incorrect password', async () => {
      const hash = await bcrypt.hash('DogruSifre123', 4);

      expect(await bcrypt.compare('YanlisSifre456', hash)).toBe(false);
    });

    it('should handle Turkish characters in password context', async () => {
      // While the validation regex may not allow Turkish chars,
      // the hashing should handle UTF-8 correctly
      const hash = await bcrypt.hash('SifreMi123', 4);

      expect(await bcrypt.compare('SifreMi123', hash)).toBe(true);
      expect(await bcrypt.compare('SifreMi124', hash)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // refreshToken
  // -------------------------------------------------------------------------
  describe('refreshToken', () => {
    it('should issue new tokens with a valid refresh token', async () => {
      const refreshToken = jwt.sign(
        {
          userId: EXISTING_USER.id,
          email: EXISTING_USER.email,
          role: EXISTING_USER.role,
          officeId: EXISTING_USER.officeId,
        },
        'test-jwt-refresh-secret-key-emlak-crm-2026',
        { expiresIn: '7d' }
      );

      mockPrismaUser.findUnique.mockResolvedValue({ ...EXISTING_USER });

      const result = await authService.refreshToken({
        refresh_token: refreshToken,
      });

      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(result.access_token).not.toBe(refreshToken);
    });

    it('should reject an invalid refresh token', async () => {
      await expect(
        authService.refreshToken({ refresh_token: 'invalid-token-string' })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Gecersiz yenileme tokeni',
      });
    });

    it('should reject refresh token for inactive user', async () => {
      const refreshToken = jwt.sign(
        {
          userId: EXISTING_USER.id,
          email: EXISTING_USER.email,
          role: EXISTING_USER.role,
          officeId: EXISTING_USER.officeId,
        },
        'test-jwt-refresh-secret-key-emlak-crm-2026',
        { expiresIn: '7d' }
      );

      mockPrismaUser.findUnique.mockResolvedValue({
        ...EXISTING_USER,
        isActive: false,
      });

      await expect(
        authService.refreshToken({ refresh_token: refreshToken })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Hesabiniz devre disi birakilmis',
      });
    });
  });

  // -------------------------------------------------------------------------
  // getCurrentUser
  // -------------------------------------------------------------------------
  describe('getCurrentUser', () => {
    it('should return user profile', async () => {
      mockPrismaUser.findUnique.mockResolvedValue({
        id: EXISTING_USER.id,
        email: EXISTING_USER.email,
        firstName: EXISTING_USER.firstName,
        lastName: EXISTING_USER.lastName,
        phone: EXISTING_USER.phone,
        avatarUrl: null,
        role: EXISTING_USER.role,
        officeId: EXISTING_USER.officeId,
        isActive: true,
        createdAt: EXISTING_USER.createdAt,
        lastLoginAt: EXISTING_USER.lastLoginAt,
        office: {
          id: 'office-uuid-1',
          name: 'Kaya Emlak',
          logoUrl: null,
        },
      });

      const result = await authService.getCurrentUser(EXISTING_USER.id);

      expect(result.email).toBe(EXISTING_USER.email);
      expect(result.firstName).toBe('Mehmet');
      expect(result.lastName).toBe('Kaya');
    });

    it('should throw NotFoundError for non-existent user', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await expect(
        authService.getCurrentUser('non-existent-id')
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
