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
      office_id: user.officeId,
    };

    // Full-text search across name, email, phone
    if (filters.search) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { first_name: { contains: searchTerm, mode: 'insensitive' } },
        { last_name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm } },
        { company_name: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (filters.contact_type) {
      where.contact_type = filters.contact_type;
    }

    if (filters.source) {
      where.source = filters.source;
    }

    if (filters.city) {
      where.city = filters.city;
    }

    if (filters.district) {
      where.district = filters.district;
    }

    if (filters.assigned_to) {
      where.assigned_to_id = filters.assigned_to;
    }

    if (filters.tags) {
      const tagList = filters.tags.split(',').map((t) => t.trim());
      where.tags = { hasSome: tagList };
    }

    if (filters.created_from || filters.created_to) {
      where.created_at = {};
      if (filters.created_from) {
        where.created_at.gte = new Date(filters.created_from);
      }
      if (filters.created_to) {
        where.created_at.lte = new Date(filters.created_to);
      }
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          assigned_to: {
            select: { id: true, first_name: true, last_name: true, avatar_url: true },
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
        assigned_to: {
          select: { id: true, first_name: true, last_name: true, avatar_url: true, email: true },
        },
        created_by_user: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });

    if (!contact) {
      throw NotFoundError('Musteri');
    }

    // Office-level access check
    if (contact.office_id !== user.officeId) {
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
        ...data,
        tags: data.tags || [],
        preferred_locations: data.preferred_locations || [],
        preferred_property_types: data.preferred_property_types || [],
        office_id: user.officeId!,
        created_by: user.id,
        assigned_to_id: user.id,
      },
      include: {
        assigned_to: {
          select: { id: true, first_name: true, last_name: true, avatar_url: true },
        },
      },
    });

    logger.info(`Yeni musteri olusturuldu: ${contact.first_name} ${contact.last_name} (${contact.id})`);

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

    if (existing.office_id !== user.officeId) {
      throw ForbiddenError('Bu musteriye erisim yetkiniz yok');
    }

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...data,
        updated_at: new Date(),
      },
      include: {
        assigned_to: {
          select: { id: true, first_name: true, last_name: true, avatar_url: true },
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

    if (existing.office_id !== user.officeId) {
      throw ForbiddenError('Bu musteriye erisim yetkiniz yok');
    }

    await prisma.contact.update({
      where: { id: contactId },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
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
      where: { contact_id: contactId },
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, avatar_url: true },
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
        OR: [
          { buyer_id: contactId },
          { seller_id: contactId },
        ],
      },
      orderBy: { created_at: 'desc' },
      include: {
        property: {
          select: { id: true, title: true, listing_price: true },
        },
        assigned_to: {
          select: { id: true, first_name: true, last_name: true },
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
    await this.getContactById(contactId, user);

    const note = await prisma.note.create({
      data: {
        content: data.content,
        is_private: data.is_private,
        contact_id: contactId,
        user_id: user.id,
      },
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, avatar_url: true },
        },
      },
    });

    // Also create an activity log entry
    await prisma.activity.create({
      data: {
        type: 'note_added',
        description: `Not eklendi`,
        contact_id: contactId,
        user_id: user.id,
        metadata: { note_id: note.id },
      },
    });

    logger.info(`Musteriye not eklendi: ${contactId}`);

    return note;
  }
}

export const contactsService = new ContactsService();
