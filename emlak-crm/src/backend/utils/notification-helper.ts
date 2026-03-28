import { PrismaClient } from '@prisma/client';
import logger from './logger';

const prisma = new PrismaClient();

/**
 * Notification payload definition.
 */
export interface NotifyPayload {
  type: string;
  title: string;
  body: string;
  link?: string;
  contactId?: string;
}

/**
 * Creates BOTH:
 * 1. A notification record (shows in bell icon dropdown)
 * 2. An internal message in the INTERNAL conversation channel (shows in Mesajlar page)
 *
 * Usage:
 *   await notifyUser(userId, officeId, { type, title, body, link, contactId })
 */
export async function notifyUser(
  userId: string,
  officeId: string,
  payload: NotifyPayload
): Promise<void> {
  try {
    // 1. Create notification record (bell icon)
    await prisma.notification.create({
      data: {
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        link: payload.link || null,
      },
    });

    // 2. Create internal message in Mesajlar page
    // Find or create a system/internal conversation for this user
    if (payload.contactId) {
      let conversation = await prisma.conversation.findFirst({
        where: {
          officeId,
          contactId: payload.contactId,
          channel: 'INTERNAL',
          status: { in: ['OPEN', 'PENDING'] },
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            officeId,
            contactId: payload.contactId,
            channel: 'INTERNAL',
            assignedUserId: userId,
            status: 'OPEN',
          },
        });
      }

      await prisma.message.create({
        data: {
          officeId,
          conversationId: conversation.id,
          senderType: 'SYSTEM',
          channel: 'INTERNAL',
          content: `${payload.title}: ${payload.body}`,
          status: 'SENT',
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          unreadCount: { increment: 1 },
        },
      });
    }

    logger.debug(`Bildirim gonderildi: ${payload.type} -> ${userId}`);
  } catch (error) {
    // Notification failures should never break the main operation
    logger.error('Bildirim olusturma hatasi:', error);
  }
}

/**
 * Notify multiple users at once (e.g. entire office).
 */
export async function notifyMultipleUsers(
  userIds: string[],
  officeId: string,
  payload: NotifyPayload
): Promise<void> {
  try {
    // Bulk create notification records
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        link: payload.link || null,
      })),
    });

    logger.debug(`Toplu bildirim gonderildi: ${payload.type} -> ${userIds.length} kullanici`);
  } catch (error) {
    logger.error('Toplu bildirim olusturma hatasi:', error);
  }
}

/**
 * Notify all active users in a given office.
 * Optionally exclude a specific user (e.g. the actor who triggered the event).
 */
export async function notifyOfficeUsers(
  officeId: string,
  payload: NotifyPayload,
  excludeUserId?: string
): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      where: {
        officeId,
        isActive: true,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });

    if (users.length === 0) return;

    await notifyMultipleUsers(
      users.map((u) => u.id),
      officeId,
      payload
    );
  } catch (error) {
    logger.error('Ofis bildirimi olusturma hatasi:', error);
  }
}
