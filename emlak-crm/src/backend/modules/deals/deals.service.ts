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

// Defines the valid stage transitions
const STAGE_ORDER = [
  'lead',
  'viewing_scheduled',
  'viewing_done',
  'negotiation',
  'offer_made',
  'offer_accepted',
  'contract_prep',
  'contract_signed',
  'title_transfer',
  'completed',
] as const;

export class DealsService {
  /**
   * List deals with filtering and pagination. Supports pipeline view.
   */
  async listDeals(filters: DealFilterInput, user: AuthenticatedUser) {
    const { page, limit, skip, sortBy, sortOrder } = parsePaginationParams(filters);

    const where: Prisma.DealWhereInput = {
      office_id: user.officeId,
      is_deleted: false,
    };

    if (filters.search) {
      const term = filters.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { buyer: { first_name: { contains: term, mode: 'insensitive' } } },
        { buyer: { last_name: { contains: term, mode: 'insensitive' } } },
        { seller: { first_name: { contains: term, mode: 'insensitive' } } },
        { seller: { last_name: { contains: term, mode: 'insensitive' } } },
        { property: { title: { contains: term, mode: 'insensitive' } } },
      ];
    }

    if (filters.deal_type) {
      where.deal_type = filters.deal_type;
    }

    if (filters.stage) {
      const stages = filters.stage.split(',').map((s) => s.trim());
      if (stages.length === 1) {
        where.stage = stages[0];
      } else {
        where.stage = { in: stages };
      }
    }

    if (filters.assigned_to) {
      where.assigned_to_id = filters.assigned_to;
    }

    if (filters.buyer_id) {
      where.buyer_id = filters.buyer_id;
    }

    if (filters.seller_id) {
      where.seller_id = filters.seller_id;
    }

    if (filters.property_id) {
      where.property_id = filters.property_id;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    // Price range (on final_price or expected_price)
    if (filters.price_min || filters.price_max) {
      where.OR = [
        ...(where.OR || []),
        {
          final_price: {
            ...(filters.price_min ? { gte: Number(filters.price_min) } : {}),
            ...(filters.price_max ? { lte: Number(filters.price_max) } : {}),
          },
        },
        {
          expected_price: {
            ...(filters.price_min ? { gte: Number(filters.price_min) } : {}),
            ...(filters.price_max ? { lte: Number(filters.price_max) } : {}),
          },
        },
      ];
    }

    if (filters.created_from || filters.created_to) {
      where.created_at = {};
      if (filters.created_from) where.created_at.gte = new Date(filters.created_from);
      if (filters.created_to) where.created_at.lte = new Date(filters.created_to);
    }

    if (filters.expected_close_from || filters.expected_close_to) {
      where.expected_close_date = {};
      if (filters.expected_close_from) where.expected_close_date.gte = new Date(filters.expected_close_from);
      if (filters.expected_close_to) where.expected_close_date.lte = new Date(filters.expected_close_to);
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
              listing_price: true,
              city: true,
              district: true,
              property_type: true,
              photos: {
                take: 1,
                orderBy: { sort_order: 'asc' },
                select: { thumbnail_url: true },
              },
            },
          },
          buyer: {
            select: { id: true, first_name: true, last_name: true, phone: true },
          },
          seller: {
            select: { id: true, first_name: true, last_name: true, phone: true },
          },
          assigned_to: {
            select: { id: true, first_name: true, last_name: true, avatar_url: true },
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
            listing_price: true,
            city: true,
            district: true,
            neighborhood: true,
            property_type: true,
            listing_type: true,
            gross_sqm: true,
            room_count: true,
            photos: {
              take: 5,
              orderBy: { sort_order: 'asc' },
              select: { id: true, url: true, thumbnail_url: true },
            },
          },
        },
        buyer: {
          select: { id: true, first_name: true, last_name: true, phone: true, email: true },
        },
        seller: {
          select: { id: true, first_name: true, last_name: true, phone: true, email: true },
        },
        assigned_to: {
          select: { id: true, first_name: true, last_name: true, avatar_url: true, email: true, phone: true },
        },
        created_by_user: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });

    if (!deal) {
      throw NotFoundError('Anlasmaya');
    }

    if (deal.office_id !== user.officeId) {
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
        title: data.title,
        deal_type: data.deal_type,
        stage: data.stage || 'lead',
        property_id: data.property_id || null,
        buyer_id: data.buyer_id || null,
        seller_id: data.seller_id || null,
        assigned_to_id: data.assigned_to_id || user.id,
        expected_price: data.expected_price || null,
        offer_price: data.offer_price || null,
        final_price: data.final_price || null,
        currency: data.currency || 'TRY',
        commission_rate: data.commission_rate || null,
        commission_amount: data.commission_amount || null,
        commission_type: data.commission_type || 'percentage',
        expected_close_date: data.expected_close_date ? new Date(data.expected_close_date) : null,
        viewing_date: data.viewing_date ? new Date(data.viewing_date) : null,
        notes: data.notes || null,
        priority: data.priority || 'medium',
        tags: data.tags || [],
        office_id: user.officeId!,
        created_by: user.id,
      },
      include: {
        property: {
          select: { id: true, title: true, listing_price: true },
        },
        buyer: {
          select: { id: true, first_name: true, last_name: true },
        },
        seller: {
          select: { id: true, first_name: true, last_name: true },
        },
        assigned_to: {
          select: { id: true, first_name: true, last_name: true, avatar_url: true },
        },
      },
    });

    // Create initial stage history entry
    await prisma.dealHistory.create({
      data: {
        deal_id: deal.id,
        action: 'stage_change',
        from_value: null,
        to_value: deal.stage,
        user_id: user.id,
        notes: 'Anlasma olusturuldu',
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'deal_created',
        description: `Yeni anlasma olusturuldu: ${deal.title}`,
        deal_id: deal.id,
        property_id: data.property_id || undefined,
        contact_id: data.buyer_id || data.seller_id || undefined,
        user_id: user.id,
      },
    });

    logger.info(`Yeni anlasma olusturuldu: ${deal.title} (${deal.id})`);

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

    if (existing.office_id !== user.officeId) {
      throw ForbiddenError('Bu anlasmaya erisim yetkiniz yok');
    }

    const deal = await prisma.deal.update({
      where: { id: dealId },
      data: {
        ...data,
        expected_close_date: data.expected_close_date ? new Date(data.expected_close_date) : undefined,
        viewing_date: data.viewing_date ? new Date(data.viewing_date) : undefined,
        updated_at: new Date(),
      },
      include: {
        property: {
          select: { id: true, title: true, listing_price: true },
        },
        buyer: {
          select: { id: true, first_name: true, last_name: true },
        },
        seller: {
          select: { id: true, first_name: true, last_name: true },
        },
        assigned_to: {
          select: { id: true, first_name: true, last_name: true, avatar_url: true },
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

    if (existing.office_id !== user.officeId) {
      throw ForbiddenError('Bu anlasmaya erisim yetkiniz yok');
    }

    const previousStage = existing.stage;
    const newStage = data.stage;

    // Validate that a completed deal cannot be moved backwards (admin can override)
    if (previousStage === 'completed' && user.role !== 'admin') {
      throw BadRequestError('Tamamlanmis bir anlasma geri alinAmaz');
    }

    const updateData: Prisma.DealUpdateInput = {
      stage: newStage,
      updated_at: new Date(),
    };

    // If deal is being completed, set completed_at
    if (newStage === 'completed') {
      updateData.completed_at = new Date();
    }

    // If deal is lost, record the reason
    if (newStage === 'lost') {
      updateData.lost_reason = data.lost_reason || null;
      updateData.lost_at = new Date();
    }

    const deal = await prisma.deal.update({
      where: { id: dealId },
      data: updateData,
      include: {
        property: {
          select: { id: true, title: true },
        },
        buyer: {
          select: { id: true, first_name: true, last_name: true },
        },
        assigned_to: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });

    // Record stage change history
    await prisma.dealHistory.create({
      data: {
        deal_id: dealId,
        action: 'stage_change',
        from_value: previousStage,
        to_value: newStage,
        user_id: user.id,
        notes: data.notes || null,
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: 'deal_stage_changed',
        description: `Anlasma asamasi degistirildi: ${previousStage} -> ${newStage}`,
        deal_id: dealId,
        user_id: user.id,
        metadata: {
          from_stage: previousStage,
          to_stage: newStage,
        },
      },
    });

    // If the deal is completed and the property is linked, update property status
    if (newStage === 'completed' && deal.property) {
      const propertyStatus = existing.deal_type === 'sale' ? 'sold' : 'rented';
      await prisma.property.update({
        where: { id: deal.property.id },
        data: { status: propertyStatus },
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

    const history = await prisma.dealHistory.findMany({
      where: { deal_id: dealId },
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, avatar_url: true },
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

    const basePrice = deal.final_price || deal.offer_price || deal.expected_price || 0;

    let commissionAmount = 0;

    if (deal.commission_type === 'percentage' && deal.commission_rate) {
      commissionAmount = (basePrice * deal.commission_rate) / 100;
    } else if (deal.commission_type === 'fixed' && deal.commission_amount) {
      commissionAmount = deal.commission_amount;
    }

    // Get office commission split rules if they exist
    const officeSplit = await prisma.officeCommissionRule.findFirst({
      where: { office_id: user.officeId! },
      orderBy: { created_at: 'desc' },
    });

    const agentSharePercentage = officeSplit?.agent_share_percentage ?? 50;
    const officeSharePercentage = 100 - agentSharePercentage;

    const agentCommission = (commissionAmount * agentSharePercentage) / 100;
    const officeCommission = (commissionAmount * officeSharePercentage) / 100;

    // KDV (Turkish VAT) calculation - standard 20%
    const kdvRate = 20;
    const kdvAmount = (commissionAmount * kdvRate) / 100;

    return {
      deal_id: deal.id,
      base_price: basePrice,
      currency: deal.currency,
      commission: {
        type: deal.commission_type,
        rate: deal.commission_rate,
        total_amount: commissionAmount,
      },
      split: {
        agent: {
          user_id: deal.assigned_to_id,
          name: deal.assigned_to
            ? `${deal.assigned_to.first_name} ${deal.assigned_to.last_name}`
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
