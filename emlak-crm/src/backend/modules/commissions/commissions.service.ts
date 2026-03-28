import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../middleware/errorHandler';
import { parsePaginationParams, createPaginatedResponse } from '../../utils/pagination';
import logger from '../../utils/logger';
import type { AuthenticatedUser } from '../../middleware/auth';
import type {
  CreateCommissionInput,
  UpdateCommissionInput,
  CalculateCommissionInput,
  ApproveCommissionInput,
  MarkPaidInput,
  CommissionFilterInput,
} from './commissions.validation';

const prisma = new PrismaClient();

// Turkish commission defaults
const DEFAULT_BUYER_COMMISSION_RATE = 2; // %2
const DEFAULT_SELLER_COMMISSION_RATE = 2; // %2
const KDV_RATE = 20; // %20 KDV (Katma Deger Vergisi)
const DEFAULT_AGENT_SHARE = 50; // %50

const COMMISSION_INCLUDE = {
  deal: {
    select: {
      id: true,
      type: true,
      stage: true,
      agreedPrice: true,
      property: {
        select: { id: true, title: true },
      },
      contact: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  },
  agent: {
    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
  },
} as const;

export class CommissionsService {
  /**
   * List commissions with filtering and pagination (office-scoped).
   */
  async listCommissions(filters: CommissionFilterInput, user: AuthenticatedUser) {
    const { page, limit, skip, sortBy, sortOrder } = parsePaginationParams(filters);

    const where: Prisma.CommissionWhereInput = {
      officeId: user.officeId!,
    };

    if (filters.deal_id) {
      where.dealId = filters.deal_id;
    }

    if (filters.agent_id) {
      where.agentId = filters.agent_id;
    }

    if (filters.type) {
      where.type = filters.type as any;
    }

    if (filters.status) {
      const statuses = filters.status.split(',').map((s) => s.trim());
      if (statuses.length === 1) {
        where.status = statuses[0] as any;
      } else {
        where.status = { in: statuses as any[] };
      }
    }

    if (filters.date_from || filters.date_to) {
      where.createdAt = {};
      if (filters.date_from) where.createdAt.gte = new Date(filters.date_from);
      if (filters.date_to) where.createdAt.lte = new Date(filters.date_to);
    }

    const [commissions, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: COMMISSION_INCLUDE,
      }),
      prisma.commission.count({ where }),
    ]);

    return createPaginatedResponse(commissions, total, page, limit);
  }

  /**
   * Get a single commission by ID.
   */
  async getCommissionById(commissionId: string, user: AuthenticatedUser) {
    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
      include: COMMISSION_INCLUDE,
    });

    if (!commission) {
      throw NotFoundError('Komisyon');
    }

    if (commission.officeId !== user.officeId) {
      throw ForbiddenError('Bu komisyon kaydina erisim yetkiniz yok');
    }

    return commission;
  }

  /**
   * Calculate commission breakdown with Turkish rules.
   * Standard Turkish real estate: 2% buyer side + 2% seller side, KDV 20%.
   */
  async calculateCommission(data: CalculateCommissionInput, user: AuthenticatedUser) {
    const buyerRate = data.buyer_commission_rate ?? DEFAULT_BUYER_COMMISSION_RATE;
    const sellerRate = data.seller_commission_rate ?? DEFAULT_SELLER_COMMISSION_RATE;
    const agentShareRate = data.agent_share_rate ?? DEFAULT_AGENT_SHARE;
    const salePrice = data.sale_price;

    // Commission amounts
    const buyerCommission = (salePrice * buyerRate) / 100;
    const sellerCommission = (salePrice * sellerRate) / 100;
    const totalCommission = buyerCommission + sellerCommission;

    // Agent and office splits
    const agentShare = (totalCommission * agentShareRate) / 100;
    const officeShare = totalCommission - agentShare;

    // KDV (Turkish VAT) calculation
    const kdvAmount = data.include_kdv ? (totalCommission * KDV_RATE) / 100 : 0;
    const totalWithKdv = totalCommission + kdvAmount;
    const netAfterTax = totalCommission - kdvAmount;

    return {
      sale_price: salePrice,
      buyer_side: {
        rate: buyerRate,
        amount: buyerCommission,
      },
      seller_side: {
        rate: sellerRate,
        amount: sellerCommission,
      },
      total_commission: totalCommission,
      split: {
        agent: {
          rate: agentShareRate,
          amount: agentShare,
        },
        office: {
          rate: 100 - agentShareRate,
          amount: officeShare,
        },
      },
      tax: {
        kdv_rate: KDV_RATE,
        kdv_amount: kdvAmount,
        total_with_kdv: totalWithKdv,
        net_after_tax: netAfterTax,
      },
    };
  }

  /**
   * Create a commission record.
   */
  async createCommission(data: CreateCommissionInput, user: AuthenticatedUser) {
    if (!user.officeId) {
      throw BadRequestError('Ofis bilgisi gerekli');
    }

    // Verify deal belongs to the office
    const deal = await prisma.deal.findUnique({ where: { id: data.deal_id } });
    if (!deal) throw NotFoundError('Anlasma');
    if (deal.officeId !== user.officeId) throw ForbiddenError('Bu anlasmaya erisim yetkiniz yok');

    // Calculate agent/office split
    const agentShareRate = data.agent_share_rate ?? DEFAULT_AGENT_SHARE;
    const agentShareAmount = (data.amount * agentShareRate) / 100;
    const officeShareAmount = data.amount - agentShareAmount;

    const commission = await prisma.commission.create({
      data: {
        dealId: data.deal_id,
        officeId: user.officeId,
        agentId: data.agent_id,
        type: data.type,
        rate: data.rate || null,
        amount: data.amount,
        agentShareRate: agentShareRate,
        agentShareAmount: agentShareAmount,
        officeShareAmount: officeShareAmount,
        status: 'PENDING',
        invoiceNo: data.invoice_no || null,
        notes: data.notes || null,
      },
      include: COMMISSION_INCLUDE,
    });

    logger.info(`Yeni komisyon olusturuldu: ${commission.id} (${data.type}, ${data.amount} TL)`);

    return commission;
  }

  /**
   * Update a commission record.
   */
  async updateCommission(commissionId: string, data: UpdateCommissionInput, user: AuthenticatedUser) {
    const existing = await this.getCommissionById(commissionId, user);

    if (existing.status === 'PAID') {
      throw BadRequestError('Odenmmis komisyon guncellenemez');
    }

    const updateData: Record<string, unknown> = {};

    if (data.type !== undefined) updateData.type = data.type;
    if (data.rate !== undefined) updateData.rate = data.rate;
    if (data.invoice_no !== undefined) updateData.invoiceNo = data.invoice_no;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (data.amount !== undefined) {
      updateData.amount = data.amount;
      const shareRate = (data.agent_share_rate != null ? data.agent_share_rate : null) ?? Number(existing.agentShareRate ?? DEFAULT_AGENT_SHARE);
      updateData.agentShareRate = shareRate;
      updateData.agentShareAmount = (data.amount * shareRate) / 100;
      updateData.officeShareAmount = data.amount - ((data.amount * shareRate) / 100);
    } else if (data.agent_share_rate !== undefined && data.agent_share_rate !== null) {
      const amount = Number(existing.amount);
      updateData.agentShareRate = data.agent_share_rate;
      updateData.agentShareAmount = (amount * data.agent_share_rate) / 100;
      updateData.officeShareAmount = amount - ((amount * data.agent_share_rate) / 100);
    }

    const commission = await prisma.commission.update({
      where: { id: commissionId },
      data: updateData,
      include: COMMISSION_INCLUDE,
    });

    logger.info(`Komisyon guncellendi: ${commissionId}`);

    return commission;
  }

  /**
   * Approve a commission (set to INVOICED).
   */
  async approveCommission(commissionId: string, data: ApproveCommissionInput, user: AuthenticatedUser) {
    const existing = await this.getCommissionById(commissionId, user);

    if (existing.status !== 'PENDING') {
      throw BadRequestError(`Sadece bekleyen komisyonlar onaylanabilir. Mevcut durum: ${existing.status}`);
    }

    const commission = await prisma.commission.update({
      where: { id: commissionId },
      data: {
        status: 'INVOICED',
        notes: data.notes ? `${existing.notes || ''}\nOnay: ${data.notes}`.trim() : existing.notes,
      },
      include: COMMISSION_INCLUDE,
    });

    logger.info(`Komisyon onaylandi: ${commissionId}`);

    return commission;
  }

  /**
   * Mark a commission as paid.
   */
  async markCommissionPaid(commissionId: string, data: MarkPaidInput, user: AuthenticatedUser) {
    const existing = await this.getCommissionById(commissionId, user);

    if (existing.status === 'PAID') {
      throw BadRequestError('Bu komisyon zaten odenMis');
    }

    if (existing.status === 'CANCELLED') {
      throw BadRequestError('Iptal edilmis komisyon odenemez');
    }

    const commission = await prisma.commission.update({
      where: { id: commissionId },
      data: {
        status: 'PAID',
        paymentDate: data.payment_date ? new Date(data.payment_date) : new Date(),
        invoiceNo: data.invoice_no || existing.invoiceNo,
        notes: data.notes ? `${existing.notes || ''}\nOdeme: ${data.notes}`.trim() : existing.notes,
      },
      include: COMMISSION_INCLUDE,
    });

    // Update deal's commission status
    await prisma.deal.update({
      where: { id: existing.dealId },
      data: { commissionStatus: 'PAID' },
    });

    logger.info(`Komisyon odendi: ${commissionId}`);

    return commission;
  }

  /**
   * Delete a commission record.
   */
  async deleteCommission(commissionId: string, user: AuthenticatedUser) {
    const existing = await this.getCommissionById(commissionId, user);

    if (existing.status === 'PAID') {
      throw BadRequestError('Odenmis komisyon silinemez');
    }

    await prisma.commission.delete({ where: { id: commissionId } });

    logger.info(`Komisyon silindi: ${commissionId}`);
  }

  /**
   * Get commission report/summary for an office.
   */
  async getCommissionReport(
    filters: { date_from?: string; date_to?: string; agent_id?: string },
    user: AuthenticatedUser
  ) {
    const where: Prisma.CommissionWhereInput = {
      officeId: user.officeId!,
    };

    if (filters.agent_id) {
      where.agentId = filters.agent_id;
    }

    if (filters.date_from || filters.date_to) {
      where.createdAt = {};
      if (filters.date_from) where.createdAt.gte = new Date(filters.date_from);
      if (filters.date_to) where.createdAt.lte = new Date(filters.date_to);
    }

    const [totals, byStatus, byAgent, byType] = await Promise.all([
      // Total amounts
      prisma.commission.aggregate({
        where,
        _sum: {
          amount: true,
          agentShareAmount: true,
          officeShareAmount: true,
        },
        _count: true,
      }),
      // By status
      prisma.commission.groupBy({
        by: ['status'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
      // By agent
      prisma.commission.groupBy({
        by: ['agentId'],
        where,
        _sum: {
          amount: true,
          agentShareAmount: true,
        },
        _count: true,
      }),
      // By type
      prisma.commission.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Fetch agent names
    const agentIds = byAgent.map((a) => a.agentId);
    const agents = await prisma.user.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const agentMap = new Map(agents.map((a) => [a.id, `${a.firstName} ${a.lastName}`]));

    return {
      summary: {
        total_count: totals._count,
        total_amount: Number(totals._sum.amount || 0),
        total_agent_share: Number(totals._sum.agentShareAmount || 0),
        total_office_share: Number(totals._sum.officeShareAmount || 0),
        kdv_amount: Number(totals._sum.amount || 0) * (KDV_RATE / 100),
      },
      by_status: byStatus.map((s) => ({
        status: s.status,
        count: s._count,
        amount: Number(s._sum.amount || 0),
      })),
      by_agent: byAgent.map((a) => ({
        agent_id: a.agentId,
        agent_name: agentMap.get(a.agentId) || 'Bilinmiyor',
        count: a._count,
        total_amount: Number(a._sum.amount || 0),
        agent_share: Number(a._sum.agentShareAmount || 0),
      })),
      by_type: byType.map((t) => ({
        type: t.type,
        count: t._count,
        amount: Number(t._sum.amount || 0),
      })),
    };
  }
}

export const commissionsService = new CommissionsService();
