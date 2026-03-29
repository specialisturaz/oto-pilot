import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../middleware/errorHandler';
import { parsePaginationParams, createPaginatedResponse } from '../../utils/pagination';
import logger from '../../utils/logger';
import type { AuthenticatedUser } from '../../middleware/auth';
import type {
  CreateDemandInput,
  UpdateDemandInput,
  DemandFilterInput,
} from './demand-pool.validation';

const prisma = new PrismaClient();

export class DemandPoolService {
  /**
   * List all active demands with pagination and filters.
   */
  async listDemands(filters: DemandFilterInput, user: AuthenticatedUser) {
    const { page, limit, skip, sortBy, sortOrder } = parsePaginationParams(filters);

    const where: Prisma.DemandPostWhereInput = {
      isActive: true,
    };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.property_type) {
      where.propertyType = filters.property_type;
    }

    if (filters.listing_type) {
      where.listingType = filters.listing_type;
    }

    if (filters.il_id) {
      where.ilId = filters.il_id;
    }

    if (filters.ilce_id) {
      where.ilceId = filters.ilce_id;
    }

    if (filters.budget_min) {
      where.budgetMin = { gte: Number(filters.budget_min) };
    }

    if (filters.budget_max) {
      where.budgetMax = { lte: Number(filters.budget_max) };
    }

    if (filters.search) {
      const term = filters.search.trim();
      where.OR = [
        { description: { contains: term } },
        { contactName: { contains: term } },
      ];
    }

    const [demands, total] = await Promise.all([
      prisma.demandPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          office: {
            select: { id: true, name: true },
          },
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          il: {
            select: { id: true, name: true },
          },
          ilce: {
            select: { id: true, name: true },
          },
          mahalle: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.demandPost.count({ where }),
    ]);

    return createPaginatedResponse(demands, total, page, limit);
  }

  /**
   * Create a new demand/offer post.
   */
  async createDemand(data: CreateDemandInput, user: AuthenticatedUser) {
    const expiresAt = data.expires_at
      ? new Date(data.expires_at)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // default: 30 days

    const demand = await prisma.demandPost.create({
      data: {
        officeId: user.officeId!,
        userId: user.id,
        type: data.type || 'DEMAND',
        propertyType: data.property_type || null,
        listingType: data.listing_type || null,
        ilId: data.il_id || null,
        ilceId: data.ilce_id || null,
        mahalleId: data.mahalle_id || null,
        budgetMin: data.budget_min ?? null,
        budgetMax: data.budget_max ?? null,
        roomCount: data.room_count || null,
        minSqm: data.min_sqm ?? null,
        maxSqm: data.max_sqm ?? null,
        description: data.description || null,
        contactName: data.contact_name || null,
        contactPhone: data.contact_phone || null,
        expiresAt,
      },
      include: {
        office: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        il: { select: { id: true, name: true } },
        ilce: { select: { id: true, name: true } },
        mahalle: { select: { id: true, name: true } },
      },
    });

    logger.info(`Yeni talep olusturuldu: ${demand.id} (${demand.type})`);

    return demand;
  }

  /**
   * Get demand details by ID.
   */
  async getDemandById(id: string, user: AuthenticatedUser) {
    const demand = await prisma.demandPost.findUnique({
      where: { id },
      include: {
        office: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        il: { select: { id: true, name: true } },
        ilce: { select: { id: true, name: true } },
        mahalle: { select: { id: true, name: true } },
      },
    });

    if (!demand) {
      throw NotFoundError('Talep');
    }

    // Increment view count (fire and forget)
    prisma.demandPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {
      // ignore view count update errors
    });

    return demand;
  }

  /**
   * Update an existing demand.
   */
  async updateDemand(id: string, data: UpdateDemandInput, user: AuthenticatedUser) {
    const existing = await prisma.demandPost.findUnique({
      where: { id },
    });

    if (!existing) {
      throw NotFoundError('Talep');
    }

    if (existing.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      throw ForbiddenError('Bu talebi duzenleme yetkiniz yok');
    }

    const updateData: Prisma.DemandPostUpdateInput = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.property_type !== undefined) updateData.propertyType = data.property_type;
    if (data.listing_type !== undefined) updateData.listingType = data.listing_type;
    if (data.il_id !== undefined) updateData.il = data.il_id ? { connect: { id: data.il_id } } : { disconnect: true };
    if (data.ilce_id !== undefined) updateData.ilce = data.ilce_id ? { connect: { id: data.ilce_id } } : { disconnect: true };
    if (data.mahalle_id !== undefined) updateData.mahalle = data.mahalle_id ? { connect: { id: data.mahalle_id } } : { disconnect: true };
    if (data.budget_min !== undefined) updateData.budgetMin = data.budget_min;
    if (data.budget_max !== undefined) updateData.budgetMax = data.budget_max;
    if (data.room_count !== undefined) updateData.roomCount = data.room_count;
    if (data.min_sqm !== undefined) updateData.minSqm = data.min_sqm;
    if (data.max_sqm !== undefined) updateData.maxSqm = data.max_sqm;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.contact_name !== undefined) updateData.contactName = data.contact_name;
    if (data.contact_phone !== undefined) updateData.contactPhone = data.contact_phone;
    if (data.expires_at !== undefined) updateData.expiresAt = data.expires_at ? new Date(data.expires_at) : null;

    const demand = await prisma.demandPost.update({
      where: { id },
      data: updateData,
      include: {
        office: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        il: { select: { id: true, name: true } },
        ilce: { select: { id: true, name: true } },
        mahalle: { select: { id: true, name: true } },
      },
    });

    logger.info(`Talep guncellendi: ${demand.id}`);

    return demand;
  }

  /**
   * Delete (deactivate) a demand.
   */
  async deleteDemand(id: string, user: AuthenticatedUser) {
    const existing = await prisma.demandPost.findUnique({
      where: { id },
    });

    if (!existing) {
      throw NotFoundError('Talep');
    }

    if (existing.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      throw ForbiddenError('Bu talebi silme yetkiniz yok');
    }

    await prisma.demandPost.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info(`Talep silindi (deaktif): ${id}`);
  }

  /**
   * Respond to a demand - increments response count.
   */
  async respondToDemand(id: string, _message: string, user: AuthenticatedUser) {
    const demand = await prisma.demandPost.findUnique({
      where: { id },
    });

    if (!demand) {
      throw NotFoundError('Talep');
    }

    // Increment response count
    await prisma.demandPost.update({
      where: { id },
      data: { responseCount: { increment: 1 } },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'NOTE',
        description: `Talep havuzundaki bir talebe yanit verildi (Talep ID: ${id})`,
        userId: user.id,
        officeId: user.officeId!,
      },
    });

    logger.info(`Talebe yanit verildi: ${id} (kullanici: ${user.id})`);

    return { message: 'Yanit basariyla gonderildi' };
  }

  /**
   * Get the current user's own demands.
   */
  async getMyDemands(user: AuthenticatedUser) {
    const demands = await prisma.demandPost.findMany({
      where: {
        userId: user.id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        office: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        il: { select: { id: true, name: true } },
        ilce: { select: { id: true, name: true } },
        mahalle: { select: { id: true, name: true } },
      },
    });

    return demands;
  }

  /**
   * Find demands that match a given property.
   */
  async matchDemandsToProperty(propertyId: string, user: AuthenticatedUser) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) throw NotFoundError('Emlak ilani');
    if (property.officeId !== user.officeId) throw ForbiddenError('Bu ilana erisim yetkiniz yok');

    const where: Prisma.DemandPostWhereInput = {
      isActive: true,
    };

    // Build matching conditions
    const conditions: Prisma.DemandPostWhereInput[] = [];

    // Match by property type
    if (property.propertyType) {
      conditions.push({
        OR: [
          { propertyType: property.propertyType },
          { propertyType: null },
        ],
      });
    }

    // Match by listing type
    if (property.listingType) {
      conditions.push({
        OR: [
          { listingType: property.listingType },
          { listingType: null },
        ],
      });
    }

    // Match by location
    if (property.ilId) {
      conditions.push({
        OR: [
          { mahalleId: property.mahalleId },
          { ilceId: property.ilceId },
          { ilId: property.ilId },
          { ilId: null },
        ].filter((c) => {
          const val = Object.values(c)[0];
          return val !== null && val !== undefined;
        }),
      });
    }

    // Match by budget (property price falls within demand's budget range)
    conditions.push({
      OR: [
        {
          AND: [
            { budgetMin: { lte: property.price } },
            { budgetMax: { gte: property.price } },
          ],
        },
        {
          AND: [
            { budgetMin: null },
            { budgetMax: null },
          ],
        },
      ],
    });

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    const matchingDemands = await prisma.demandPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        office: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        il: { select: { id: true, name: true } },
        ilce: { select: { id: true, name: true } },
        mahalle: { select: { id: true, name: true } },
      },
    });

    return matchingDemands;
  }
}

export const demandPoolService = new DemandPoolService();
