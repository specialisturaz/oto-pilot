import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import config from '../../config';
import { AppError, ConflictError, NotFoundError, UnauthorizedError, BadRequestError } from '../../middleware/errorHandler';
import { JwtPayload } from '../../middleware/auth';
import logger from '../../utils/logger';
import type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.validation';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
}

export class AuthService {
  /**
   * Register a new user. Optionally join an office via invitation code.
   */
  async register(data: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw ConflictError('Bu e-posta adresi zaten kayitli');
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    // If an office ID is provided, use it directly
    const officeId: string | null = (data as any).officeId || null;

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: hashedPassword,
        firstName: (data as any).first_name || (data as any).firstName || '',
        lastName: (data as any).last_name || (data as any).lastName || '',
        phone: data.phone || null,
        role: officeId ? 'AGENT' : 'ADMIN',
        officeId: officeId!,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        officeId: true,
        createdAt: true,
      },
    });

    const tokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      officeId: user.officeId,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    logger.info(`Yeni kullanici kaydi: ${user.email} (${user.id})`);

    return {
      user,
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /**
   * Authenticate user with email and password.
   */
  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw UnauthorizedError('Gecersiz e-posta veya sifre');
    }

    if (!user.isActive) {
      throw UnauthorizedError('Hesabiniz devre disi birakilmis');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

    if (!isPasswordValid) {
      throw UnauthorizedError('Gecersiz e-posta veya sifre');
    }

    const tokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      officeId: user.officeId,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info(`Kullanici girisi: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        officeId: user.officeId,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /**
   * Issue a new access token using a valid refresh token.
   */
  async refreshToken(data: RefreshTokenInput) {
    // Verify the JWT signature of the refresh token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(data.refresh_token, config.jwt.refreshSecret) as JwtPayload;
    } catch {
      throw UnauthorizedError('Gecersiz yenileme tokeni');
    }

    // Verify the user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw UnauthorizedError('Gecersiz yenileme tokeni');
    }

    if (!user.isActive) {
      throw UnauthorizedError('Hesabiniz devre disi birakilmis');
    }

    const tokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      officeId: user.officeId,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  /**
   * Logout the user (no-op since we use stateless JWT refresh tokens).
   */
  async logout(userId: string) {
    // With stateless JWT refresh tokens, logout is handled client-side
    // by discarding the tokens. No server-side revocation needed.
    logger.info(`Kullanici cikisi: ${userId}`);
  }

  /**
   * Generate a password reset token and send it via email.
   */
  async forgotPassword(data: ForgotPasswordInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      logger.warn(`Sifre sifirlama istegi - kayitli olmayan e-posta: ${data.email}`);
      return { message: 'Eger bu e-posta adresi kayitliysa, sifre sifirlama baglantisi gonderilecektir' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store reset token in a way compatible with the schema
    // Using notificationPreferences as a temporary store since there's no dedicated field
    // In production, use a dedicated password reset table or Redis
    await prisma.user.update({
      where: { id: user.id },
      data: {
        notificationPreferences: {
          passwordResetToken: resetTokenHash,
          passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
      },
    });

    // TODO: Send password reset email
    // In production, send this via email service
    logger.info(`Sifre sifirlama tokeni olusturuldu: ${user.email}`);

    return {
      message: 'Eger bu e-posta adresi kayitliysa, sifre sifirlama baglantisi gonderilecektir',
      // Only include reset_token in development for testing
      ...(config.server.isProduction ? {} : { reset_token: resetToken }),
    };
  }

  /**
   * Reset user password with a valid reset token.
   */
  async resetPassword(data: ResetPasswordInput) {
    const tokenHash = crypto.createHash('sha256').update(data.token).digest('hex');

    // Find user with matching reset token in notificationPreferences
    const users = await prisma.user.findMany({
      where: { isActive: true },
    });

    const user = users.find((u) => {
      const prefs = u.notificationPreferences as Record<string, any> | null;
      if (!prefs) return false;
      if (prefs.passwordResetToken !== tokenHash) return false;
      const expires = new Date(prefs.passwordResetExpires);
      return expires > new Date();
    });

    if (!user) {
      throw BadRequestError('Gecersiz veya suresi dolmus sifre sifirlama tokeni');
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        notificationPreferences: {},
      },
    });

    logger.info(`Sifre sifirlandi: ${user.email}`);

    return { message: 'Sifreniz basariyla guncellendi' };
  }

  /**
   * Get the currently authenticated user's profile.
   */
  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        officeId: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        office: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!user) {
      throw NotFoundError('Kullanici');
    }

    return user;
  }
}

export const authService = new AuthService();
