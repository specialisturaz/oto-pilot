import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../middleware/errorHandler';
import { parsePaginationParams, createPaginatedResponse } from '../../utils/pagination';
import logger from '../../utils/logger';
import type { AuthenticatedUser } from '../../middleware/auth';
import type {
  CreateContactInput,
  UpdateContactInput,
  ContactFilterInput,
  CreateNoteInput,
} from './contacts.validation';

const prisma = new PrismaClient();

export class ContactsService {
  /**
   * List contacts with filtering, search, and pagination.
   */
  async listContacts(filters: ContactFilterInput, user: AuthenticatedUser) {
    const { page, limit, skip, sortBy, sortOrder } = parsePaginationParams(filters);

    const where: Prisma.ContactWhereInput = {
      officeId: user.officeId!,
    };

    // Full-text search across name, email, phone
    if (filters.search) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { firstName: { contains: searchTerm } },
        { lastName: { contains: searchTerm } },
        { email: { contains: searchTerm } },
        { phone: { contains: searchTerm } },
        { companyName: { contains: searchTerm } },
      ];
    }

    if (filters.contact_type) {
      where.type = filters.contact_type as any;
    }

    if (filters.source) {
      where.source = filters.source as any;
    }

    if (filters.city) {
      where.city = filters.city;
    }

    if (filters.district) {
      where.district = filters.district;
    }

    if (filters.assigned_to) {
      where.assignedUserId = filters.assigned_to;
    }

    if (filters.tags) {
      const tagList = filters.tags.split(',').map((t) => t.trim());
      where.AND = tagList.map((tag) => ({ tags: { contains: tag } }));
    }

    if (filters.created_from || filters.created_to) {
      where.createdAt = {};
      if (filters.created_from) {
        where.createdAt.gte = new Date(filters.created_from);
      }
      if (filters.created_to) {
        where.createdAt.lte = new Date(filters.created_to);
      }
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          assignedUser: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    return createPaginatedResponse(contacts, total, page, limit);
  }

  /**
   * Get a single contact by ID.
   */
  async getContactById(contactId: string, user: AuthenticatedUser) {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
        },
      },
    });

    if (!contact) {
      throw NotFoundError('Musteri');
    }

    // Office-level access check
    if (contact.officeId !== user.officeId) {
      throw ForbiddenError('Bu musteriye erisim yetkiniz yok');
    }

    return contact;
  }

  /**
   * Create a new contact.
   */
  async createContact(data: CreateContactInput, user: AuthenticatedUser) {
    const contact = await prisma.contact.create({
      data: {
        ...(data as any),
        tags: (data as any).tags || [],
        officeId: user.officeId!,
        assignedUserId: user.id,
      },
      include: {
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    logger.info(`Yeni musteri olusturuldu: ${contact.firstName} ${contact.lastName} (${contact.id})`);

    return contact;
  }

  /**
   * Update an existing contact.
   */
  async updateContact(contactId: string, data: UpdateContactInput, user: AuthenticatedUser) {
    // Verify contact exists and belongs to user's office
    const existing = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!existing) {
      throw NotFoundError('Musteri');
    }

    if (existing.officeId !== user.officeId) {
      throw ForbiddenError('Bu musteriye erisim yetkiniz yok');
    }

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...(data as any),
      },
      include: {
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    logger.info(`Musteri guncellendi: ${contact.id}`);

    return contact;
  }

  /**
   * Soft-delete a contact.
   */
  async deleteContact(contactId: string, user: AuthenticatedUser) {
    const existing = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!existing) {
      throw NotFoundError('Musteri');
    }

    if (existing.officeId !== user.officeId) {
      throw ForbiddenError('Bu musteriye erisim yetkiniz yok');
    }

    await prisma.contact.delete({
      where: { id: contactId },
    });

    logger.info(`Musteri silindi: ${contactId}`);
  }

  /**
   * Get activities/history for a contact.
   */
  async getContactActivities(contactId: string, user: AuthenticatedUser) {
    // Verify access
    await this.getContactById(contactId, user);

    const activities = await prisma.activity.findMany({
      where: { contactId: contactId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    return activities;
  }

  /**
   * Get deals associated with a contact.
   */
  async getContactDeals(contactId: string, user: AuthenticatedUser) {
    // Verify access
    await this.getContactById(contactId, user);

    const deals = await prisma.deal.findMany({
      where: {
        contactId: contactId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          select: { id: true, title: true, price: true },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return deals;
  }

  /**
   * Add a note to a contact.
   */
  async addContactNote(contactId: string, data: CreateNoteInput, user: AuthenticatedUser) {
    // Verify access
    const contact = await this.getContactById(contactId, user);

    // Create an activity log entry for the note
    const activity = await prisma.activity.create({
      data: {
        type: 'NOTE',
        description: (data as any).content || 'Not eklendi',
        contactId: contactId,
        userId: user.id,
        officeId: user.officeId!,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    // Update contact's notes field
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        notes: (data as any).content || '',
      },
    });

    logger.info(`Musteriye not eklendi: ${contactId}`);

    return activity;
  }
}

export const contactsService = new ContactsService();
