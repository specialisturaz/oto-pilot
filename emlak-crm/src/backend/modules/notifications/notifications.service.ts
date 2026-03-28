import { PrismaClient, Prisma, NotificationType } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../middleware/errorHandler';
import { parsePaginationParams, createPaginatedResponse } from '../../utils/pagination';
import logger from '../../utils/logger';
import type { AuthenticatedUser } from '../../middleware/auth';

const prisma = new PrismaClient();

interface NotificationFilterInput {
  is_read?: string;
  type?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
}

interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

export class NotificationsService {
  /**
   * Get notifications for the current user.
   */
  async getMyNotifications(filters: NotificationFilterInput, user: AuthenticatedUser) {
    const { page, limit, skip } = parsePaginationParams(filters as Record<string, unknown>);

    const where: Prisma.NotificationWhereInput = {
      userId: user.id,
    };

    if (filters.is_read === 'true') {
      where.isRead = true;
    } else if (filters.is_read === 'false') {
      where.isRead = false;
    }

    if (filters.type) {
      where.type = filters.type as NotificationType;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return createPaginatedResponse(notifications, total, page, limit);
  }

  /**
   * Get unread notification count for the current user.
   */
  async getUnreadCount(user: AuthenticatedUser) {
    const count = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    });

    return { unread_count: count };
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(notificationId: string, user: AuthenticatedUser) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw NotFoundError('Bildirim');
    }

    if (notification.userId !== user.id) {
      throw ForbiddenError('Bu bildirime erisim yetkiniz yok');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Mark all notifications as read for the current user.
   */
  async markAllAsRead(user: AuthenticatedUser) {
    const result = await prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { updated_count: result.count };
  }

  /**
   * Create a single notification.
   */
  async createNotification(data: CreateNotificationData) {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body || null,
        link: data.link || null,
      },
    });

    logger.info(`Bildirim olusturuldu: ${notification.id} -> ${data.userId}`);

    return notification;
  }

  /**
   * Create notifications for multiple users at once.
   */
  async createBulkNotifications(
    userIds: string[],
    data: Omit<CreateNotificationData, 'userId'>
  ) {
    const notifications = await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: data.type,
        title: data.title,
        body: data.body || null,
        link: data.link || null,
      })),
    });

    logger.info(`Toplu bildirim olusturuldu: ${notifications.count} adet`);

    return { created_count: notifications.count };
  }

  /**
   * Create notifications for all users in an office.
   */
  async notifyOffice(
    officeId: string,
    data: Omit<CreateNotificationData, 'userId'>,
    excludeUserId?: string
  ) {
    const users = await prisma.user.findMany({
      where: {
        officeId,
        isActive: true,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });

    return this.createBulkNotifications(
      users.map((u) => u.id),
      data
    );
  }

  /**
   * Delete old read notifications (older than 30 days).
   */
  async cleanupOldNotifications() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    logger.info(`Eski bildirimler temizlendi: ${result.count} adet`);

    return { deleted_count: result.count };
  }
}

export const notificationsService = new NotificationsService();
