import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../../middleware/errorHandler';
import { parsePaginationParams, createPaginatedResponse } from '../../utils/pagination';
import logger from '../../utils/logger';
import type { AuthenticatedUser } from '../../middleware/auth';
import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateProfileInput,
  ChangePasswordInput,
  UserFilterInput,
} from './users.validation';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

// Fields to exclude from user responses (never return password hash)
const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  title: true,
  avatarUrl: true,
  tcKimlikNo: true,
  isActive: true,
  lastLoginAt: true,
  notificationPreferences: true,
  officeId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class UsersService {
  /**
   * List users in the office with filtering and pagination.
   */
  async listUsers(filters: UserFilterInput, user: AuthenticatedUser) {
    const { page, limit, skip, sortBy, sortOrder } = parsePaginationParams(filters);

    const where: Prisma.UserWhereInput = {
      officeId: user.officeId!,
    };

    if (filters.search) {
      const term = filters.search.trim();
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (filters.role) {
      where.role = filters.role as any;
    }

    if (filters.is_active === 'true') {
      where.isActive = true;
    } else if (filters.is_active === 'false') {
      where.isActive = false;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: USER_SELECT,
      }),
      prisma.user.count({ where }),
    ]);

    return createPaginatedResponse(users, total, page, limit);
  }

  /**
   * Get agents (users with AGENT role) in the office.
   */
  async getAgents(user: AuthenticatedUser) {
    const agents = await prisma.user.findMany({
      where: {
        officeId: user.officeId!,
        role: { in: ['AGENT', 'MANAGER'] },
        isActive: true,
      },
      orderBy: { firstName: 'asc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        title: true,
      },
    });

    return agents;
  }

  /**
   * Get a single user by ID.
   */
  async getUserById(userId: string, user: AuthenticatedUser) {
    const found = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...USER_SELECT,
        _count: {
          select: {
            assignedContacts: true,
            assignedProperties: true,
            assignedDeals: true,
            assignedTasks: true,
          },
        },
      },
    });

    if (!found) {
      throw NotFoundError('Kullanici');
    }

    if (found.officeId !== user.officeId) {
      throw ForbiddenError('Bu kullaniciya erisim yetkiniz yok');
    }

    return found;
  }

  /**
   * Create a new user in the office (admin only).
   */
  async createUser(data: CreateUserInput, user: AuthenticatedUser) {
    if (!user.officeId) {
      throw BadRequestError('Ofis bilgisi gerekli');
    }

    // Check if email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw ConflictError('Bu e-posta adresi zaten kullaniliyor');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.first_name,
        lastName: data.last_name,
        phone: data.phone || null,
        role: data.role || 'AGENT',
        title: data.title || null,
        tcKimlikNo: data.tc_kimlik_no || null,
        avatarUrl: data.avatar_url || null,
        officeId: user.officeId,
      },
      select: USER_SELECT,
    });

    logger.info(`Yeni kullanici olusturuldu: ${newUser.email} (${newUser.id})`);

    return newUser;
  }

  /**
   * Update a user (admin only).
   */
  async updateUser(userId: string, data: UpdateUserInput, user: AuthenticatedUser) {
    const existing = await this.getUserById(userId, user);

    // Check email uniqueness if email is being changed
    if (data.email && data.email !== existing.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (emailExists) {
        throw ConflictError('Bu e-posta adresi zaten kullaniliyor');
      }
    }

    // Prevent demoting the last admin
    if (data.role && data.role !== 'ADMIN' && existing.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: {
          officeId: user.officeId!,
          role: 'ADMIN',
          isActive: true,
        },
      });
      if (adminCount <= 1) {
        throw BadRequestError('Ofisteki son yonetici rolunu degistiremezsiniz');
      }
    }

    // Prevent deactivating the last admin
    if (data.is_active === false && existing.role === 'ADMIN') {
      const activeAdminCount = await prisma.user.count({
        where: {
          officeId: user.officeId!,
          role: 'ADMIN',
          isActive: true,
        },
      });
      if (activeAdminCount <= 1) {
        throw BadRequestError('Ofisteki son yoneticiyi deaktive edemezsiniz');
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.email !== undefined && { email: data.email }),
        ...(data.first_name !== undefined && { firstName: data.first_name }),
        ...(data.last_name !== undefined && { lastName: data.last_name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.role !== undefined && { role: data.role as any }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.tc_kimlik_no !== undefined && { tcKimlikNo: data.tc_kimlik_no }),
        ...(data.avatar_url !== undefined && { avatarUrl: data.avatar_url }),
        ...(data.is_active !== undefined && { isActive: data.is_active }),
        ...(data.notification_preferences !== undefined && { notificationPreferences: data.notification_preferences }),
      },
      select: USER_SELECT,
    });

    logger.info(`Kullanici guncellendi: ${userId}`);

    return updated;
  }

  /**
   * Update the current user's profile.
   */
  async updateProfile(data: UpdateProfileInput, user: AuthenticatedUser) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.first_name !== undefined && { firstName: data.first_name }),
        ...(data.last_name !== undefined && { lastName: data.last_name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.avatar_url !== undefined && { avatarUrl: data.avatar_url }),
        ...(data.notification_preferences !== undefined && { notificationPreferences: data.notification_preferences }),
      },
      select: USER_SELECT,
    });

    logger.info(`Profil guncellendi: ${user.id}`);

    return updated;
  }

  /**
   * Change the current user's password.
   */
  async changePassword(data: ChangePasswordInput, user: AuthenticatedUser) {
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!currentUser) {
      throw NotFoundError('Kullanici');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(data.current_password, currentUser.passwordHash);
    if (!isValidPassword) {
      throw BadRequestError('Mevcut sifre yanlis');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(data.new_password, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    logger.info(`Sifre degistirildi: ${user.id}`);
  }

  /**
   * Delete (deactivate) a user.
   */
  async deactivateUser(userId: string, user: AuthenticatedUser) {
    const existing = await this.getUserById(userId, user);

    if (userId === user.id) {
      throw BadRequestError('Kendi hesabinizi deaktive edemezsiniz');
    }

    if (existing.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: {
          officeId: user.officeId!,
          role: 'ADMIN',
          isActive: true,
        },
      });
      if (adminCount <= 1) {
        throw BadRequestError('Ofisteki son yoneticiyi deaktive edemezsiniz');
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    logger.info(`Kullanici deaktive edildi: ${userId}`);
  }
}

export const usersService = new UsersService();
