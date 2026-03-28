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

    let officeId: string | null = null;

    // If an office invitation code is provided, look it up
    if (data.office_invitation_code) {
      const invitation = await prisma.officeInvitation.findFirst({
        where: {
          code: data.office_invitation_code,
          used: false,
          expires_at: { gt: new Date() },
        },
      });

      if (!invitation) {
        throw BadRequestError('Gecersiz veya suresi dolmus davet kodu');
      }

      officeId = invitation.office_id;

      // Mark invitation as used
      await prisma.officeInvitation.update({
        where: { id: invitation.id },
        data: { used: true, used_at: new Date() },
      });
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password_hash: hashedPassword,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || null,
        role: officeId ? 'agent' : 'owner',
        office_id: officeId,
        is_active: true,
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        role: true,
        office_id: true,
        created_at: true,
      },
    });

    const tokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      officeId: user.office_id,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token in the database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        user_id: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

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

    if (!user.is_active) {
      throw UnauthorizedError('Hesabiniz devre disi birakilmis');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password_hash);

    if (!isPasswordValid) {
      throw UnauthorizedError('Gecersiz e-posta veya sifre');
    }

    const tokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      officeId: user.office_id,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        user_id: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    logger.info(`Kullanici girisi: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        role: user.role,
        office_id: user.office_id,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /**
   * Issue a new access token using a valid refresh token.
   */
  async refreshToken(data: RefreshTokenInput) {
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: data.refresh_token,
        revoked: false,
        expires_at: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      throw UnauthorizedError('Gecersiz veya suresi dolmus yenileme tokeni');
    }

    // Verify the JWT signature
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(data.refresh_token, config.jwt.refreshSecret) as JwtPayload;
    } catch {
      // Revoke the stored token if verification fails
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true },
      });
      throw UnauthorizedError('Gecersiz yenileme tokeni');
    }

    // Revoke old refresh token (rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const user = storedToken.user;

    if (!user.is_active) {
      throw UnauthorizedError('Hesabiniz devre disi birakilmis');
    }

    const tokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      officeId: user.office_id,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        user_id: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  /**
   * Revoke all refresh tokens for the user (logout).
   */
  async logout(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { user_id: userId, revoked: false },
      data: { revoked: true },
    });

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

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_reset_token: resetTokenHash,
        password_reset_expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
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

    const user = await prisma.user.findFirst({
      where: {
        password_reset_token: tokenHash,
        password_reset_expires: { gt: new Date() },
      },
    });

    if (!user) {
      throw BadRequestError('Gecersiz veya suresi dolmus sifre sifirlama tokeni');
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: hashedPassword,
        password_reset_token: null,
        password_reset_expires: null,
      },
    });

    // Revoke all existing refresh tokens for security
    await prisma.refreshToken.updateMany({
      where: { user_id: user.id, revoked: false },
      data: { revoked: true },
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
        first_name: true,
        last_name: true,
        phone: true,
        avatar_url: true,
        role: true,
        office_id: true,
        is_active: true,
        created_at: true,
        last_login_at: true,
        office: {
          select: {
            id: true,
            name: true,
            logo_url: true,
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
