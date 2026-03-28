import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../middleware/errorHandler';
import { parsePaginationParams, createPaginatedResponse } from '../../utils/pagination';
import logger from '../../utils/logger';
import type { AuthenticatedUser } from '../../middleware/auth';
import type {
  CreateDealInput,
  UpdateDealInput,
  UpdateDealStageInput,
  DealFilterInput,
} from './deals.validation';

const prisma = new PrismaClient();

// Defines the valid stage transitions (matching DealStage enum)
const STAGE_ORDER = [
  'INQUIRY',
  'SHOWING',
  'NEGOTIATION',
  'OFFER',
  'DEPOSIT',
  'CONTRACT',
  'TAPU_TRANSFER',
  'COMPLETED',
  'LOST',
] as const;

export class DealsService {
  /**
   * List deals with filtering and pagination. Supports pipeline view.
   */
  async listDeals(filters: DealFilterInput, user: AuthenticatedUser) {
    const { page, limit, skip, sortBy, sortOrder } = parsePaginationParams(filters);

    const where: Prisma.DealWhereInput = {
      officeId: user.officeId!,
    };

    if (filters.search) {
      const term = filters.search.trim();
      where.OR = [
        { notes: { contains: term, mode: 'insensitive' } },
        { contact: { firstName: { contains: term, mode: 'insensitive' } } },
        { contact: { lastName: { contains: term, mode: 'insensitive' } } },
        { property: { title: { contains: term, mode: 'insensitive' } } },
      ];
    }

    if (filters.deal_type) {
      where.type = filters.deal_type as any;
    }

    if (filters.stage) {
      const stages = filters.stage.split(',').map((s) => s.trim());
      if (stages.length === 1) {
        where.stage = stages[0] as any;
      } else {
        where.stage = { in: stages as any[] };
      }
    }

    if (filters.assigned_to) {
      where.assignedUserId = filters.assigned_to;
    }

    if (filters.buyer_id) {
      where.contactId = filters.buyer_id;
    }

    if (filters.property_id) {
      where.propertyId = filters.property_id;
    }

    // Price range
    if (filters.price_min || filters.price_max) {
      where.agreedPrice = {};
      if (filters.price_min) where.agreedPrice.gte = Number(filters.price_min);
      if (filters.price_max) where.agreedPrice.lte = Number(filters.price_max);
    }

    if (filters.created_from || filters.created_to) {
      where.createdAt = {};
      if (filters.created_from) where.createdAt.gte = new Date(filters.created_from);
      if (filters.created_to) where.createdAt.lte = new Date(filters.created_to);
    }

    if (filters.expected_close_from || filters.expected_close_to) {
      where.expectedCloseDate = {};
      if (filters.expected_close_from) where.expectedCloseDate.gte = new Date(filters.expected_close_from);
      if (filters.expected_close_to) where.expectedCloseDate.lte = new Date(filters.expected_close_to);
    }

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              price: true,
              propertyType: true,
              photos: {
                take: 1,
                orderBy: { orderIndex: 'asc' },
                select: { thumbnailUrl: true },
              },
            },
          },
          contact: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
          assignedUser: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
      }),
      prisma.deal.count({ where }),
    ]);

    return createPaginatedResponse(deals, total, page, limit);
  }

  /**
   * Get a single deal with full details.
   */
  async getDealById(dealId: string, user: AuthenticatedUser) {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            address: true,
            propertyType: true,
            listingType: true,
            grossSqm: true,
            roomCount: true,
            photos: {
              take: 5,
              orderBy: { orderIndex: 'asc' },
              select: { id: true, url: true, thumbnailUrl: true },
            },
          },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, phone: true },
        },
      },
    });

    if (!deal) {
      throw NotFoundError('Anlasmaya');
    }

    if (deal.officeId !== user.officeId) {
      throw ForbiddenError('Bu anlasmaya erisim yetkiniz yok');
    }

    return deal;
  }

  /**
   * Create a new deal.
   */
  async createDeal(data: CreateDealInput, user: AuthenticatedUser) {
    const deal = await prisma.deal.create({
      data: {
        type: (data as any).deal_type || 'SALE',
        stage: ((data as any).stage || 'INQUIRY').toUpperCase() as any,
        propertyId: (data as any).property_id,
        contactId: (data as any).buyer_id || (data as any).contact_id,
        assignedUserId: (data as any).assigned_to_id || user.id,
        askingPrice: (data as any).expected_price || null,
        offerPrice: (data as any).offer_price || null,
        agreedPrice: (data as any).final_price || null,
        expectedCloseDate: (data as any).expected_close_date ? new Date((data as any).expected_close_date) : null,
        notes: (data as any).notes || null,
        officeId: user.officeId!,
      },
      include: {
        property: {
          select: { id: true, title: true, price: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    // Create initial stage history entry
    await prisma.dealStageHistory.create({
      data: {
        dealId: deal.id,
        toStage: deal.stage,
        changedById: user.id,
        notes: 'Anlasma olusturuldu',
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'DEAL_STAGE_CHANGE',
        description: `Yeni anlasma olusturuldu`,
        dealId: deal.id,
        propertyId: (data as any).property_id || undefined,
        contactId: (data as any).buyer_id || (data as any).contact_id || undefined,
        userId: user.id,
        officeId: user.officeId!,
      },
    });

    logger.info(`Yeni anlasma olusturuldu: ${deal.id}`);

    return deal;
  }

  /**
   * Update a deal.
   */
  async updateDeal(dealId: string, data: UpdateDealInput, user: AuthenticatedUser) {
    const existing = await prisma.deal.findUnique({ where: { id: dealId } });

    if (!existing) {
      throw NotFoundError('Anlasma');
    }

    if (existing.officeId !== user.officeId) {
      throw ForbiddenError('Bu anlasmaya erisim yetkiniz yok');
    }

    const deal = await prisma.deal.update({
      where: { id: dealId },
      data: {
        ...((data as any).expected_close_date !== undefined && {
          expectedCloseDate: (data as any).expected_close_date ? new Date((data as any).expected_close_date) : null,
        }),
        ...((data as any).notes !== undefined && { notes: (data as any).notes }),
      },
      include: {
        property: {
          select: { id: true, title: true, price: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    logger.info(`Anlasma guncellendi: ${deal.id}`);

    return deal;
  }

  /**
   * Move a deal to a new stage in the pipeline.
   */
  async updateDealStage(dealId: string, data: UpdateDealStageInput, user: AuthenticatedUser) {
    const existing = await prisma.deal.findUnique({ where: { id: dealId } });

    if (!existing) {
      throw NotFoundError('Anlasma');
    }

    if (existing.officeId !== user.officeId) {
      throw ForbiddenError('Bu anlasmaya erisim yetkiniz yok');
    }

    const previousStage = existing.stage;
    const newStage = (data.stage as string).toUpperCase() as any;

    // Validate that a completed deal cannot be moved backwards (admin can override)
    if (previousStage === 'COMPLETED' && user.role !== 'ADMIN') {
      throw BadRequestError('Tamamlanmis bir anlasma geri alinAmaz');
    }

    const updateData: Prisma.DealUpdateInput = {
      stage: newStage,
    };

    // If deal is being completed, set actual close date
    if (newStage === 'COMPLETED') {
      updateData.actualCloseDate = new Date();
    }

    // If deal is lost, record the reason
    if (newStage === 'LOST') {
      updateData.lostReason = (data as any).lost_reason || null;
    }

    const deal = await prisma.deal.update({
      where: { id: dealId },
      data: updateData,
      include: {
        property: {
          select: { id: true, title: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Record stage change history
    await prisma.dealStageHistory.create({
      data: {
        dealId: dealId,
        fromStage: previousStage,
        toStage: newStage,
        changedById: user.id,
        notes: data.notes || null,
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'DEAL_STAGE_CHANGE',
        description: `Anlasma asamasi degistirildi: ${previousStage} -> ${newStage}`,
        dealId: dealId,
        userId: user.id,
        officeId: user.officeId!,
      },
    });

    // If the deal is completed and the property is linked, update property status
    if (newStage === 'COMPLETED' && deal.propertyId) {
      const propertyStatus = existing.type === 'SALE' ? 'SOLD' : 'RENTED';
      await prisma.property.update({
        where: { id: deal.propertyId },
        data: { propertyStatus: propertyStatus as any },
      });
    }

    logger.info(`Anlasma asama degisikligi: ${dealId} ${previousStage} -> ${newStage}`);

    return deal;
  }

  /**
   * Get the full history of a deal (stage changes, edits, etc.).
   */
  async getDealHistory(dealId: string, user: AuthenticatedUser) {
    // Verify access
    await this.getDealById(dealId, user);

    const history = await prisma.dealStageHistory.findMany({
      where: { dealId: dealId },
      orderBy: { createdAt: 'desc' },
      include: {
        changedBy: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    return history;
  }

  /**
   * Calculate and return commission details for a deal.
   */
  async getDealCommissions(dealId: string, user: AuthenticatedUser) {
    const deal = await this.getDealById(dealId, user);

    const basePrice = Number(deal.agreedPrice || deal.offerPrice || deal.askingPrice || 0);
    const commissionRate = Number(deal.commissionBuyerRate || deal.commissionSellerRate || 2);

    const commissionAmount = (basePrice * commissionRate) / 100;

    const agentSharePercentage = 50;
    const officeSharePercentage = 100 - agentSharePercentage;

    const agentCommission = (commissionAmount * agentSharePercentage) / 100;
    const officeCommission = (commissionAmount * officeSharePercentage) / 100;

    // KDV (Turkish VAT) calculation - standard 20%
    const kdvRate = 20;
    const kdvAmount = (commissionAmount * kdvRate) / 100;

    return {
      deal_id: deal.id,
      base_price: basePrice,
      commission: {
        rate: commissionRate,
        total_amount: commissionAmount,
      },
      split: {
        agent: {
          user_id: deal.assignedUserId,
          name: deal.assignedUser
            ? `${deal.assignedUser.firstName} ${deal.assignedUser.lastName}`
            : null,
          percentage: agentSharePercentage,
          amount: agentCommission,
        },
        office: {
          percentage: officeSharePercentage,
          amount: officeCommission,
        },
      },
      tax: {
        kdv_rate: kdvRate,
        kdv_amount: kdvAmount,
        net_after_tax: commissionAmount - kdvAmount,
      },
    };
  }
}

export const dealsService = new DealsService();
