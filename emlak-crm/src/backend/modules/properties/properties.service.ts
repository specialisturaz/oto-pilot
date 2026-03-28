import { PrismaClient, Prisma } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../middleware/errorHandler';
import { parsePaginationParams, createPaginatedResponse } from '../../utils/pagination';
import config from '../../config';
import logger from '../../utils/logger';
import type { AuthenticatedUser } from '../../middleware/auth';
import type {
  CreatePropertyInput,
  UpdatePropertyInput,
  PropertyFilterInput,
  PublishPropertyInput,
} from './properties.validation';

const prisma = new PrismaClient();

export class PropertiesService {
  /**
   * List properties with advanced filtering and pagination.
   */
  async listProperties(filters: PropertyFilterInput, user: AuthenticatedUser) {
    const { page, limit, skip, sortBy, sortOrder } = parsePaginationParams(filters);

    const where: Prisma.PropertyWhereInput = {
      office_id: user.officeId,
      is_deleted: false,
    };

    // Full-text search
    if (filters.search) {
      const term = filters.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { district: { contains: term, mode: 'insensitive' } },
        { neighborhood: { contains: term, mode: 'insensitive' } },
      ];
    }

    // Property type filter (supports comma-separated multiple values)
    if (filters.property_type) {
      const types = filters.property_type.split(',').map((t) => t.trim());
      if (types.length === 1) {
        where.property_type = types[0];
      } else {
        where.property_type = { in: types };
      }
    }

    if (filters.listing_type) {
      where.listing_type = filters.listing_type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    // Location filters
    if (filters.city) {
      where.city = filters.city;
    }
    if (filters.district) {
      where.district = filters.district;
    }
    if (filters.neighborhood) {
      where.neighborhood = { contains: filters.neighborhood, mode: 'insensitive' };
    }

    // Price range
    if (filters.price_min || filters.price_max) {
      where.listing_price = {};
      if (filters.price_min) {
        where.listing_price.gte = Number(filters.price_min);
      }
      if (filters.price_max) {
        where.listing_price.lte = Number(filters.price_max);
      }
    }

    // Square meter range
    if (filters.sqm_min || filters.sqm_max) {
      where.gross_sqm = {};
      if (filters.sqm_min) {
        where.gross_sqm.gte = Number(filters.sqm_min);
      }
      if (filters.sqm_max) {
        where.gross_sqm.lte = Number(filters.sqm_max);
      }
    }

    // Room count
    if (filters.room_count) {
      where.room_count = filters.room_count;
    }

    // Floor range
    if (filters.floor_min || filters.floor_max) {
      where.floor_number = {};
      if (filters.floor_min) {
        where.floor_number.gte = Number(filters.floor_min);
      }
      if (filters.floor_max) {
        where.floor_number.lte = Number(filters.floor_max);
      }
    }

    // Building age
    if (filters.building_age_max) {
      where.building_age = { lte: Number(filters.building_age_max) };
    }

    // Boolean filters
    if (filters.is_furnished === 'true') where.is_furnished = true;
    if (filters.has_elevator === 'true') where.has_elevator = true;
    if (filters.has_parking === 'true') where.has_parking = true;
    if (filters.has_balcony === 'true') where.has_balcony = true;
    if (filters.has_garden === 'true') where.has_garden = true;

    if (filters.heating_type) {
      where.heating_type = filters.heating_type;
    }

    if (filters.assigned_to) {
      where.assigned_to_id = filters.assigned_to;
    }

    if (filters.seller_contact_id) {
      where.seller_contact_id = filters.seller_contact_id;
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          assigned_to: {
            select: { id: true, first_name: true, last_name: true, avatar_url: true },
          },
          photos: {
            take: 1,
            orderBy: { sort_order: 'asc' },
            select: { id: true, url: true, thumbnail_url: true },
          },
          _count: {
            select: { photos: true },
          },
        },
      }),
      prisma.property.count({ where }),
    ]);

    return createPaginatedResponse(properties, total, page, limit);
  }

  /**
   * Get a single property with all details.
   */
  async getPropertyById(propertyId: string, user: AuthenticatedUser) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        assigned_to: {
          select: { id: true, first_name: true, last_name: true, avatar_url: true, email: true, phone: true },
        },
        seller_contact: {
          select: { id: true, first_name: true, last_name: true, phone: true, email: true },
        },
        photos: {
          orderBy: { sort_order: 'asc' },
        },
        documents: {
          orderBy: { created_at: 'desc' },
        },
        created_by_user: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });

    if (!property) {
      throw NotFoundError('Emlak ilani');
    }

    if (property.office_id !== user.officeId) {
      throw ForbiddenError('Bu ilana erisim yetkiniz yok');
    }

    return property;
  }

  /**
   * Create a new property listing.
   */
  async createProperty(data: CreatePropertyInput, user: AuthenticatedUser) {
    const property = await prisma.property.create({
      data: {
        ...data,
        features: data.features || [],
        office_id: user.officeId!,
        created_by: user.id,
        assigned_to_id: data.assigned_to_id || user.id,
      },
      include: {
        assigned_to: {
          select: { id: true, first_name: true, last_name: true, avatar_url: true },
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'property_created',
        description: `Yeni ilan olusturuldu: ${property.title}`,
        property_id: property.id,
        user_id: user.id,
        contact_id: data.seller_contact_id || undefined,
      },
    });

    logger.info(`Yeni emlak ilani olusturuldu: ${property.title} (${property.id})`);

    return property;
  }

  /**
   * Update a property listing.
   */
  async updateProperty(propertyId: string, data: UpdatePropertyInput, user: AuthenticatedUser) {
    const existing = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!existing) {
      throw NotFoundError('Emlak ilani');
    }

    if (existing.office_id !== user.officeId) {
      throw ForbiddenError('Bu ilana erisim yetkiniz yok');
    }

    const property = await prisma.property.update({
      where: { id: propertyId },
      data: {
        ...data,
        updated_at: new Date(),
      },
      include: {
        assigned_to: {
          select: { id: true, first_name: true, last_name: true, avatar_url: true },
        },
        photos: {
          take: 1,
          orderBy: { sort_order: 'asc' },
          select: { id: true, url: true, thumbnail_url: true },
        },
      },
    });

    logger.info(`Emlak ilani guncellendi: ${property.id}`);

    return property;
  }

  /**
   * Soft-delete a property listing.
   */
  async deleteProperty(propertyId: string, user: AuthenticatedUser) {
    const existing = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!existing) {
      throw NotFoundError('Emlak ilani');
    }

    if (existing.office_id !== user.officeId) {
      throw ForbiddenError('Bu ilana erisim yetkiniz yok');
    }

    await prisma.property.update({
      where: { id: propertyId },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
    });

    logger.info(`Emlak ilani silindi: ${propertyId}`);
  }

  /**
   * Add photos to a property. Handles file metadata storage.
   * Actual file upload is handled by multer middleware in the route.
   */
  async addPhotos(
    propertyId: string,
    files: Express.Multer.File[],
    user: AuthenticatedUser
  ) {
    const existing = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!existing) {
      throw NotFoundError('Emlak ilani');
    }

    if (existing.office_id !== user.officeId) {
      throw ForbiddenError('Bu ilana erisim yetkiniz yok');
    }

    // Get current max sort order
    const lastPhoto = await prisma.propertyPhoto.findFirst({
      where: { property_id: propertyId },
      orderBy: { sort_order: 'desc' },
    });
    let sortOrder = (lastPhoto?.sort_order ?? -1) + 1;

    const photos = await Promise.all(
      files.map((file) => {
        const photo = prisma.propertyPhoto.create({
          data: {
            property_id: propertyId,
            url: `/uploads/properties/${propertyId}/${file.filename}`,
            thumbnail_url: `/uploads/properties/${propertyId}/thumb_${file.filename}`,
            original_name: file.originalname,
            mime_type: file.mimetype,
            size_bytes: file.size,
            sort_order: sortOrder++,
          },
        });
        return photo;
      })
    );

    logger.info(`${files.length} fotograf eklendi: ilan ${propertyId}`);

    return photos;
  }

  /**
   * Delete a photo from a property.
   */
  async deletePhoto(propertyId: string, photoId: string, user: AuthenticatedUser) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw NotFoundError('Emlak ilani');
    }

    if (property.office_id !== user.officeId) {
      throw ForbiddenError('Bu ilana erisim yetkiniz yok');
    }

    const photo = await prisma.propertyPhoto.findFirst({
      where: { id: photoId, property_id: propertyId },
    });

    if (!photo) {
      throw NotFoundError('Fotograf');
    }

    // Delete file from disk
    try {
      const filePath = path.join(config.upload.uploadsDir, photo.url.replace('/uploads/', ''));
      await fs.unlink(filePath);
    } catch {
      logger.warn(`Fotograf dosyasi silinemedi: ${photo.url}`);
    }

    await prisma.propertyPhoto.delete({
      where: { id: photoId },
    });

    logger.info(`Fotograf silindi: ${photoId} (ilan ${propertyId})`);
  }

  /**
   * Add a document to a property (deed copies, contracts, etc.).
   */
  async addDocument(
    propertyId: string,
    file: Express.Multer.File,
    documentType: string,
    user: AuthenticatedUser
  ) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw NotFoundError('Emlak ilani');
    }

    if (property.office_id !== user.officeId) {
      throw ForbiddenError('Bu ilana erisim yetkiniz yok');
    }

    const document = await prisma.propertyDocument.create({
      data: {
        property_id: propertyId,
        url: `/uploads/properties/${propertyId}/docs/${file.filename}`,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size_bytes: file.size,
        document_type: documentType,
        uploaded_by: user.id,
      },
    });

    logger.info(`Dokuman eklendi: ${file.originalname} (ilan ${propertyId})`);

    return document;
  }

  /**
   * Publish property to external portals (sahibinden, hepsiemlak, emlakjet).
   */
  async publishToPortals(propertyId: string, data: PublishPropertyInput, user: AuthenticatedUser) {
    const property = await this.getPropertyById(propertyId, user);

    if (property.status !== 'active') {
      throw BadRequestError('Sadece aktif ilanlar portallara gonderilebilir');
    }

    const results: Array<{ portal: string; success: boolean; message: string; external_id?: string }> = [];

    for (const portal of data.portals) {
      try {
        // TODO: Implement actual portal API integrations
        // For now, record the publishing attempt
        const publishRecord = await prisma.portalPublishing.upsert({
          where: {
            property_id_portal: {
              property_id: propertyId,
              portal,
            },
          },
          update: {
            status: 'pending',
            last_synced_at: new Date(),
          },
          create: {
            property_id: propertyId,
            portal,
            status: 'pending',
            published_by: user.id,
          },
        });

        results.push({
          portal,
          success: true,
          message: `${portal} portalina gonderildi`,
          external_id: publishRecord.external_id || undefined,
        });
      } catch (error) {
        logger.error(`Portal yayinlama hatasi (${portal}):`, error);
        results.push({
          portal,
          success: false,
          message: `${portal} portalina gonderme basarisiz`,
        });
      }
    }

    return results;
  }

  /**
   * Find contacts (potential buyers/tenants) matching the property criteria.
   */
  async findMatchingBuyers(propertyId: string, user: AuthenticatedUser) {
    const property = await this.getPropertyById(propertyId, user);

    const matchingContacts = await prisma.contact.findMany({
      where: {
        office_id: user.officeId,
        is_deleted: false,
        contact_type: { in: ['buyer', 'both'] },
        OR: [
          // Budget matches
          {
            budget_min: { lte: property.listing_price },
            budget_max: { gte: property.listing_price },
          },
          // Location preference matches
          {
            preferred_locations: { hasSome: [property.city, property.district].filter(Boolean) as string[] },
          },
          // Property type preference matches
          {
            preferred_property_types: { has: property.property_type },
          },
        ],
      },
      orderBy: { created_at: 'desc' },
      take: 50,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        phone: true,
        email: true,
        budget_min: true,
        budget_max: true,
        preferred_locations: true,
        preferred_property_types: true,
        assigned_to: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });

    return matchingContacts;
  }
}

export const propertiesService = new PropertiesService();
