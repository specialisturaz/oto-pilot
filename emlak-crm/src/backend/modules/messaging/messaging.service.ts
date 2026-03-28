import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../middleware/errorHandler';
import { parsePaginationParams, createPaginatedResponse } from '../../utils/pagination';
import logger from '../../utils/logger';
import type { AuthenticatedUser } from '../../middleware/auth';
import type {
  CreateConversationInput,
  UpdateConversationInput,
  SendMessageInput,
  ConversationFilterInput,
  MessageFilterInput,
} from './messaging.validation';

const prisma = new PrismaClient();

const CONVERSATION_INCLUDE = {
  contact: {
    select: { id: true, firstName: true, lastName: true, phone: true, email: true },
  },
  assignedUser: {
    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
  },
  messages: {
    take: 1,
    orderBy: { createdAt: 'desc' as const },
    select: { id: true, content: true, senderType: true, createdAt: true },
  },
} as const;

export class MessagingService {
  /**
   * List conversations with filtering and pagination (office-scoped).
   */
  async listConversations(filters: ConversationFilterInput, user: AuthenticatedUser) {
    const { page, limit, skip } = parsePaginationParams(filters);

    const where: Prisma.ConversationWhereInput = {
      officeId: user.officeId!,
    };

    if (filters.search) {
      const term = filters.search.trim();
      where.contact = {
        OR: [
          { firstName: { contains: term } },
          { lastName: { contains: term } },
          { phone: { contains: term } },
          { email: { contains: term } },
        ],
      };
    }

    if (filters.channel) {
      where.channel = filters.channel as any;
    }

    if (filters.status) {
      where.status = filters.status as any;
    }

    if (filters.assigned_user_id) {
      where.assignedUserId = filters.assigned_user_id;
    }

    if (filters.contact_id) {
      where.contactId = filters.contact_id;
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
        include: CONVERSATION_INCLUDE,
      }),
      prisma.conversation.count({ where }),
    ]);

    return createPaginatedResponse(conversations, total, page, limit);
  }

  /**
   * Get a single conversation by ID with its messages.
   */
  async getConversationById(conversationId: string, user: AuthenticatedUser) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    if (!conversation) {
      throw NotFoundError('Konusma');
    }

    if (conversation.officeId !== user.officeId) {
      throw ForbiddenError('Bu konusmaya erisim yetkiniz yok');
    }

    return conversation;
  }

  /**
   * Get messages within a conversation.
   */
  async getConversationMessages(conversationId: string, filters: MessageFilterInput, user: AuthenticatedUser) {
    await this.getConversationById(conversationId, user);

    const { page, limit, skip } = parsePaginationParams(filters);

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    return createPaginatedResponse(messages, total, page, limit);
  }

  /**
   * Create a new conversation.
   */
  async createConversation(data: CreateConversationInput, user: AuthenticatedUser) {
    if (!user.officeId) {
      throw BadRequestError('Ofis bilgisi gerekli');
    }

    // Check if an open conversation already exists for this contact + channel
    const existing = await prisma.conversation.findFirst({
      where: {
        officeId: user.officeId,
        contactId: data.contact_id,
        channel: data.channel,
        status: { in: ['OPEN', 'PENDING'] },
      },
    });

    if (existing) {
      throw BadRequestError(
        `Bu musteri icin zaten acik bir ${data.channel} konusmasi mevcut`
      );
    }

    const conversation = await prisma.conversation.create({
      data: {
        officeId: user.officeId,
        contactId: data.contact_id,
        channel: data.channel,
        assignedUserId: data.assigned_user_id || user.id,
        status: 'OPEN',
      },
      include: CONVERSATION_INCLUDE,
    });

    logger.info(`Yeni konusma olusturuldu: ${conversation.id} (${data.channel})`);

    return conversation;
  }

  /**
   * Update conversation (status, assignment).
   */
  async updateConversation(conversationId: string, data: UpdateConversationInput, user: AuthenticatedUser) {
    await this.getConversationById(conversationId, user);

    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.assigned_user_id !== undefined && { assignedUserId: data.assigned_user_id }),
      },
      include: CONVERSATION_INCLUDE,
    });

    logger.info(`Konusma guncellendi: ${conversationId}`);

    return conversation;
  }

  /**
   * Send a message. Routes to the correct channel (WhatsApp/SMS/Email/Internal).
   */
  async sendMessage(data: SendMessageInput, user: AuthenticatedUser) {
    if (!user.officeId) {
      throw BadRequestError('Ofis bilgisi gerekli');
    }

    let conversationId = data.conversation_id;

    // If no conversation_id, find or create one
    if (!conversationId && data.contact_id) {
      let conversation = await prisma.conversation.findFirst({
        where: {
          officeId: user.officeId,
          contactId: data.contact_id,
          channel: data.channel,
          status: { in: ['OPEN', 'PENDING'] },
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            officeId: user.officeId,
            contactId: data.contact_id,
            channel: data.channel,
            assignedUserId: user.id,
            status: 'OPEN',
          },
        });
      }

      conversationId = conversation.id;
    }

    if (!conversationId) {
      throw BadRequestError('Konusma ID veya musteri ID gerekli');
    }

    // Verify conversation belongs to user's office
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        contact: {
          select: { phone: true, email: true },
        },
      },
    });

    if (!conversation) {
      throw NotFoundError('Konusma');
    }

    if (conversation.officeId !== user.officeId) {
      throw ForbiddenError('Bu konusmaya erisim yetkiniz yok');
    }

    // Route message to the appropriate channel
    let externalMessageId: string | null = null;
    let messageStatus: 'SENT' | 'FAILED' = 'SENT';

    try {
      switch (data.channel) {
        case 'WHATSAPP':
          externalMessageId = await this.sendWhatsAppMessage(
            conversation.contact.phone!,
            data.content,
            data.media_url || undefined
          );
          break;
        case 'SMS':
          externalMessageId = await this.sendSmsMessage(
            conversation.contact.phone!,
            data.content
          );
          break;
        case 'EMAIL':
          externalMessageId = await this.sendEmailMessage(
            conversation.contact.email!,
            data.content
          );
          break;
        case 'INTERNAL':
          // Internal messages don't need external routing
          break;
      }
    } catch (error) {
      logger.error(`Mesaj gonderilemedi (${data.channel}):`, error);
      messageStatus = 'FAILED';
    }

    // Save message to database
    const message = await prisma.message.create({
      data: {
        officeId: user.officeId,
        conversationId,
        senderType: 'USER',
        senderId: user.id,
        channel: data.channel,
        content: data.content,
        mediaUrl: data.media_url || null,
        mediaType: data.media_type || null,
        status: messageStatus,
        externalMessageId,
      },
    });

    // Update conversation's last message timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        status: 'OPEN',
      },
    });

    logger.info(`Mesaj gonderildi: ${message.id} (${data.channel})`);

    return message;
  }

  /**
   * Process incoming WhatsApp webhook events.
   */
  async processWhatsAppWebhook(payload: Record<string, unknown>) {
    const entries = payload.entry as any[];
    if (!entries || !Array.isArray(entries)) {
      logger.warn('WhatsApp webhook: Gecersiz payload');
      return;
    }

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        if (!value?.messages) continue;

        for (const incomingMsg of value.messages) {
          await this.handleIncomingWhatsAppMessage(incomingMsg, value.metadata);
        }

        // Process status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            await this.handleWhatsAppStatusUpdate(status);
          }
        }
      }
    }
  }

  /**
   * Handle a single incoming WhatsApp message.
   */
  private async handleIncomingWhatsAppMessage(
    msg: Record<string, any>,
    metadata: Record<string, any>
  ) {
    const senderPhone = msg.from;
    const messageContent = msg.text?.body || msg.caption || '';
    const externalId = msg.id;
    const mediaUrl = msg.image?.id || msg.document?.id || msg.video?.id || null;
    const mediaType = msg.type || null;

    // Find the contact by phone number
    const contact = await prisma.contact.findFirst({
      where: {
        OR: [
          { phone: { contains: senderPhone } },
          { phoneSecondary: { contains: senderPhone } },
        ],
      },
    });

    if (!contact) {
      logger.info(`WhatsApp mesaji bilinmeyen numaradan: ${senderPhone}`);
      return;
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        contactId: contact.id,
        channel: 'WHATSAPP',
        status: { in: ['OPEN', 'PENDING'] },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          officeId: contact.officeId,
          contactId: contact.id,
          channel: 'WHATSAPP',
          status: 'OPEN',
        },
      });
    }

    // Save incoming message
    await prisma.message.create({
      data: {
        officeId: contact.officeId,
        conversationId: conversation.id,
        senderType: 'CONTACT',
        senderId: contact.id,
        channel: 'WHATSAPP',
        content: messageContent,
        mediaUrl,
        mediaType,
        status: 'DELIVERED',
        externalMessageId: externalId,
      },
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
      },
    });

    // Update contact's last contact date
    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastContactAt: new Date() },
    });

    logger.info(`WhatsApp mesaji alindi: ${contact.firstName} ${contact.lastName} -> ${conversation.id}`);
  }

  /**
   * Handle WhatsApp message status updates (delivered, read, etc.).
   */
  private async handleWhatsAppStatusUpdate(status: Record<string, any>) {
    const externalId = status.id;
    const newStatus = status.status;

    const statusMap: Record<string, string> = {
      sent: 'SENT',
      delivered: 'DELIVERED',
      read: 'READ',
      failed: 'FAILED',
    };

    const mappedStatus = statusMap[newStatus];
    if (!mappedStatus) return;

    await prisma.message.updateMany({
      where: { externalMessageId: externalId },
      data: { status: mappedStatus as any },
    });
  }

  /**
   * Send a WhatsApp message via the WhatsApp Business API.
   * Returns external message ID.
   */
  private async sendWhatsAppMessage(
    phone: string,
    content: string,
    _mediaUrl?: string
  ): Promise<string | null> {
    // TODO: Integrate with WhatsApp Business API
    // This is a placeholder that would call the actual API
    logger.info(`WhatsApp mesaji gonderilecek: ${phone}`);

    // In production, this would make an HTTP call to the WhatsApp Business API
    // const response = await fetch(`${WHATSAPP_API_URL}/messages`, { ... });
    // return response.messages[0].id;

    return `wa_${Date.now()}_placeholder`;
  }

  /**
   * Send an SMS message.
   */
  private async sendSmsMessage(phone: string, content: string): Promise<string | null> {
    // TODO: Integrate with SMS provider (e.g., Netgsm, iletimerkezi)
    logger.info(`SMS gonderilecek: ${phone}`);
    return `sms_${Date.now()}_placeholder`;
  }

  /**
   * Send an email message.
   */
  private async sendEmailMessage(email: string, content: string): Promise<string | null> {
    // TODO: Integrate with email service (e.g., SMTP, SendGrid)
    logger.info(`E-posta gonderilecek: ${email}`);
    return `email_${Date.now()}_placeholder`;
  }
}

export const messagingService = new MessagingService();
