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
      officeId: user.officeId!,
    };

    // Full-text search
    if (filters.search) {
      const term = filters.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { address: { contains: term, mode: 'insensitive' } },
      ];
    }

    // Property type filter (supports comma-separated multiple values)
    if (filters.property_type) {
      const types = filters.property_type.split(',').map((t) => t.trim());
      if (types.length === 1) {
        where.propertyType = types[0] as any;
      } else {
        where.propertyType = { in: types as any[] };
      }
    }

    if (filters.listing_type) {
      where.listingType = filters.listing_type as any;
    }

    if (filters.status) {
      where.propertyStatus = filters.status as any;
    }

    // Price range
    if (filters.price_min || filters.price_max) {
      where.price = {};
      if (filters.price_min) {
        where.price.gte = Number(filters.price_min);
      }
      if (filters.price_max) {
        where.price.lte = Number(filters.price_max);
      }
    }

    // Square meter range
    if (filters.sqm_min || filters.sqm_max) {
      where.grossSqm = {};
      if (filters.sqm_min) {
        where.grossSqm.gte = Number(filters.sqm_min);
      }
      if (filters.sqm_max) {
        where.grossSqm.lte = Number(filters.sqm_max);
      }
    }

    // Room count
    if (filters.room_count) {
      where.roomCount = filters.room_count;
    }

    // Floor range
    if (filters.floor_min || filters.floor_max) {
      where.floorNumber = {};
      if (filters.floor_min) {
        where.floorNumber.gte = Number(filters.floor_min);
      }
      if (filters.floor_max) {
        where.floorNumber.lte = Number(filters.floor_max);
      }
    }

    // Building age
    if (filters.building_age_max) {
      where.buildingAge = { lte: Number(filters.building_age_max) };
    }

    // Boolean filters
    if (filters.is_furnished === 'true') where.isFurnished = true;

    if (filters.heating_type) {
      where.heatingType = filters.heating_type as any;
    }

    if (filters.assigned_to) {
      where.assignedUserId = filters.assigned_to;
    }

    if (filters.seller_contact_id) {
      where.contactId = filters.seller_contact_id;
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          assignedUser: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          photos: {
            take: 1,
            orderBy: { orderIndex: 'asc' },
            select: { id: true, url: true, thumbnailUrl: true },
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
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, phone: true },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        photos: {
          orderBy: { orderIndex: 'asc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!property) {
      throw NotFoundError('Emlak ilani');
    }

    if (property.officeId !== user.officeId) {
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
        ...(data as any),
        officeId: user.officeId!,
        assignedUserId: (data as any).assigned_to_id || user.id,
      },
      include: {
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'NOTE',
        description: `Yeni ilan olusturuldu: ${property.title}`,
        propertyId: property.id,
        userId: user.id,
        officeId: user.officeId!,
        contactId: (data as any).seller_contact_id || undefined,
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

    if (existing.officeId !== user.officeId) {
      throw ForbiddenError('Bu ilana erisim yetkiniz yok');
    }

    const property = await prisma.property.update({
      where: { id: propertyId },
      data: {
        ...(data as any),
      },
      include: {
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        photos: {
          take: 1,
          orderBy: { orderIndex: 'asc' },
          select: { id: true, url: true, thumbnailUrl: true },
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

    if (existing.officeId !== user.officeId) {
      throw ForbiddenError('Bu ilana erisim yetkiniz yok');
    }

    await prisma.property.delete({
      where: { id: propertyId },
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

    if (existing.officeId !== user.officeId) {
      throw ForbiddenError('Bu ilana erisim yetkiniz yok');
    }

    // Get current max sort order
    const lastPhoto = await prisma.propertyPhoto.findFirst({
      where: { propertyId: propertyId },
      orderBy: { orderIndex: 'desc' },
    });
    let sortOrder = (lastPhoto?.orderIndex ?? -1) + 1;

    const photos = await Promise.all(
      files.map((file) => {
        const photo = prisma.propertyPhoto.create({
          data: {
            propertyId: propertyId,
            url: `/uploads/properties/${propertyId}/${file.filename}`,
            thumbnailUrl: `/uploads/properties/${propertyId}/thumb_${file.filename}`,
            caption: file.originalname,
            sizeBytes: file.size,
            orderIndex: sortOrder++,
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

    if (property.officeId !== user.officeId) {
      throw ForbiddenError('Bu ilana erisim yetkiniz yok');
    }

    const photo = await prisma.propertyPhoto.findFirst({
      where: { id: photoId, propertyId: propertyId },
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

    if (property.officeId !== user.officeId) {
      throw ForbiddenError('Bu ilana erisim yetkiniz yok');
    }

    const document = await prisma.propertyDocument.create({
      data: {
        propertyId: propertyId,
        fileUrl: `/uploads/properties/${propertyId}/docs/${file.filename}`,
        fileName: file.originalname,
        fileSize: file.size,
        type: documentType as any,
        uploadedById: user.id,
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

    if (property.propertyStatus !== 'ACTIVE') {
      throw BadRequestError('Sadece aktif ilanlar portallara gonderilebilir');
    }

    const results: Array<{ portal: string; success: boolean; message: string; external_id?: string }> = [];

    for (const portalSlug of data.portals) {
      try {
        // Find the portal by slug
        const portal = await prisma.portal.findUnique({ where: { slug: portalSlug } });
        if (!portal) {
          results.push({
            portal: portalSlug,
            success: false,
            message: `${portalSlug} portali bulunamadi`,
          });
          continue;
        }

        // Record the publishing attempt
        const publishRecord = await prisma.portalListing.upsert({
          where: {
            propertyId_portalId: {
              propertyId: propertyId,
              portalId: portal.id,
            },
          },
          update: {
            status: 'PENDING',
            lastSyncedAt: new Date(),
          },
          create: {
            propertyId: propertyId,
            portalId: portal.id,
            status: 'PENDING',
          },
        });

        results.push({
          portal: portalSlug,
          success: true,
          message: `${portalSlug} portalina gonderildi`,
          external_id: publishRecord.externalListingId || undefined,
        });
      } catch (error) {
        logger.error(`Portal yayinlama hatasi (${portalSlug}):`, error);
        results.push({
          portal: portalSlug,
          success: false,
          message: `${portalSlug} portalina gonderme basarisiz`,
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
        officeId: user.officeId!,
        interestType: { in: ['BUYER', 'INVESTOR'] },
        OR: [
          // Budget matches
          {
            budgetMin: { lte: property.price },
            budgetMax: { gte: property.price },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        budgetMin: true,
        budgetMax: true,
        preferredLocations: true,
        preferredPropertyTypes: true,
        assignedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return matchingContacts;
  }
}

export const propertiesService = new PropertiesService();
