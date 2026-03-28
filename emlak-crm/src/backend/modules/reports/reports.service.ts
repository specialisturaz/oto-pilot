import { PrismaClient, Prisma } from '@prisma/client';
import logger from '../../utils/logger';
import type { AuthenticatedUser } from '../../middleware/auth';

const prisma = new PrismaClient();

interface DateRangeFilter {
  date_from?: string;
  date_to?: string;
}

export class ReportsService {
  /**
   * Dashboard statistics - key metrics overview.
   */
  async getDashboardStats(user: AuthenticatedUser) {
    const officeId = user.officeId!;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalContacts,
      newContactsThisMonth,
      newContactsPrevMonth,
      activeProperties,
      totalDeals,
      completedDealsThisMonth,
      completedDealsPrevMonth,
      pendingCommissions,
      paidCommissionsThisMonth,
      upcomingAppointments,
      overdueTasks,
      unreadMessages,
    ] = await Promise.all([
      // Total contacts
      prisma.contact.count({ where: { officeId } }),

      // New contacts this month
      prisma.contact.count({
        where: { officeId, createdAt: { gte: startOfMonth } },
      }),

      // New contacts previous month
      prisma.contact.count({
        where: {
          officeId,
          createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
        },
      }),

      // Active properties
      prisma.property.count({
        where: { officeId, propertyStatus: 'ACTIVE' },
      }),

      // Total active deals
      prisma.deal.count({
        where: { officeId, stage: { not: 'LOST' } },
      }),

      // Completed deals this month
      prisma.deal.count({
        where: {
          officeId,
          stage: 'COMPLETED',
          actualCloseDate: { gte: startOfMonth },
        },
      }),

      // Completed deals previous month
      prisma.deal.count({
        where: {
          officeId,
          stage: 'COMPLETED',
          actualCloseDate: { gte: startOfPrevMonth, lte: endOfPrevMonth },
        },
      }),

      // Pending commissions total
      prisma.commission.aggregate({
        where: { officeId, status: { in: ['PENDING', 'INVOICED'] } },
        _sum: { amount: true },
        _count: true,
      }),

      // Paid commissions this month
      prisma.commission.aggregate({
        where: {
          officeId,
          status: 'PAID',
          paymentDate: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),

      // Upcoming appointments (next 7 days)
      prisma.appointment.count({
        where: {
          officeId,
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
          startTime: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Overdue tasks
      prisma.task.count({
        where: {
          officeId,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          dueDate: { lt: now },
        },
      }),

      // Unread messages
      prisma.conversation.aggregate({
        where: { officeId, unreadCount: { gt: 0 } },
        _sum: { unreadCount: true },
      }),
    ]);

    return {
      contacts: {
        total: totalContacts,
        new_this_month: newContactsThisMonth,
        new_prev_month: newContactsPrevMonth,
        growth_percent: newContactsPrevMonth > 0
          ? Math.round(((newContactsThisMonth - newContactsPrevMonth) / newContactsPrevMonth) * 100)
          : 0,
      },
      properties: {
        active: activeProperties,
      },
      deals: {
        total_active: totalDeals,
        completed_this_month: completedDealsThisMonth,
        completed_prev_month: completedDealsPrevMonth,
      },
      commissions: {
        pending_count: pendingCommissions._count,
        pending_amount: Number(pendingCommissions._sum.amount || 0),
        paid_this_month: Number(paidCommissionsThisMonth._sum.amount || 0),
      },
      upcoming_appointments: upcomingAppointments,
      overdue_tasks: overdueTasks,
      unread_messages: Number(unreadMessages._sum.unreadCount || 0),
    };
  }

  /**
   * Sales report - deals closed within a date range.
   */
  async getSalesReport(filters: DateRangeFilter, user: AuthenticatedUser) {
    const officeId = user.officeId!;
    const dateWhere = this.buildDateWhere(filters, 'actualCloseDate');

    const [deals, summary, byType, byMonth] = await Promise.all([
      // Completed deals in range
      prisma.deal.findMany({
        where: {
          officeId,
          stage: 'COMPLETED',
          ...dateWhere,
        },
        include: {
          property: {
            select: { id: true, title: true, propertyType: true },
          },
          contact: {
            select: { id: true, firstName: true, lastName: true },
          },
          assignedUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { actualCloseDate: 'desc' },
      }),

      // Summary aggregation
      prisma.deal.aggregate({
        where: {
          officeId,
          stage: 'COMPLETED',
          ...dateWhere,
        },
        _sum: { agreedPrice: true, commissionTotal: true },
        _count: true,
        _avg: { agreedPrice: true },
      }),

      // By deal type
      prisma.deal.groupBy({
        by: ['type'],
        where: {
          officeId,
          stage: 'COMPLETED',
          ...dateWhere,
        },
        _sum: { agreedPrice: true },
        _count: true,
      }),

      // By month (raw query for grouping)
      prisma.$queryRaw`
        SELECT
          DATE_TRUNC('month', actual_close_date) as month,
          COUNT(*)::int as count,
          SUM(agreed_price)::float as total_amount
        FROM deals
        WHERE office_id = ${officeId}
          AND stage = 'COMPLETED'
          AND actual_close_date IS NOT NULL
          ${filters.date_from ? Prisma.sql`AND actual_close_date >= ${new Date(filters.date_from)}` : Prisma.empty}
          ${filters.date_to ? Prisma.sql`AND actual_close_date <= ${new Date(filters.date_to)}` : Prisma.empty}
        GROUP BY DATE_TRUNC('month', actual_close_date)
        ORDER BY month DESC
      `,
    ]);

    return {
      summary: {
        total_deals: summary._count,
        total_volume: Number(summary._sum.agreedPrice || 0),
        total_commission: Number(summary._sum.commissionTotal || 0),
        average_deal_size: Number(summary._avg.agreedPrice || 0),
      },
      by_type: byType.map((t) => ({
        type: t.type,
        count: t._count,
        total_volume: Number(t._sum.agreedPrice || 0),
      })),
      by_month: byMonth,
      deals,
    };
  }

  /**
   * Agent performance report.
   */
  async getAgentPerformance(filters: DateRangeFilter & { agent_id?: string }, user: AuthenticatedUser) {
    const officeId = user.officeId!;

    const agentWhere: Prisma.UserWhereInput = {
      officeId,
      isActive: true,
      role: { in: ['AGENT', 'MANAGER'] },
    };

    if (filters.agent_id) {
      agentWhere.id = filters.agent_id;
    }

    const agents = await prisma.user.findMany({
      where: agentWhere,
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
    });

    const dateFilter = this.buildDateFilter(filters);

    const performance = await Promise.all(
      agents.map(async (agent) => {
        const [deals, commissions, contacts, tasks, appointments] = await Promise.all([
          // Deals
          prisma.deal.groupBy({
            by: ['stage'],
            where: {
              assignedUserId: agent.id,
              officeId,
              ...dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {},
            },
            _count: true,
            _sum: { agreedPrice: true },
          }),

          // Commissions
          prisma.commission.aggregate({
            where: {
              agentId: agent.id,
              officeId,
              ...dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {},
            },
            _sum: { amount: true, agentShareAmount: true },
            _count: true,
          }),

          // Contacts managed
          prisma.contact.count({
            where: {
              assignedUserId: agent.id,
              officeId,
            },
          }),

          // Tasks completed
          prisma.task.count({
            where: {
              assignedToId: agent.id,
              officeId,
              status: 'COMPLETED',
              ...dateFilter.createdAt ? { completedAt: dateFilter.createdAt } : {},
            },
          }),

          // Appointments
          prisma.appointment.count({
            where: {
              userId: agent.id,
              officeId,
              ...dateFilter.createdAt ? { startTime: dateFilter.createdAt } : {},
            },
          }),
        ]);

        const completedDeals = deals.find((d) => d.stage === 'COMPLETED');
        const totalDeals = deals.reduce((sum, d) => sum + d._count, 0);

        return {
          agent: {
            id: agent.id,
            name: `${agent.firstName} ${agent.lastName}`,
            avatar_url: agent.avatarUrl,
          },
          deals: {
            total: totalDeals,
            completed: completedDeals?._count || 0,
            total_volume: Number(completedDeals?._sum.agreedPrice || 0),
            conversion_rate: totalDeals > 0
              ? Math.round(((completedDeals?._count || 0) / totalDeals) * 100)
              : 0,
          },
          commissions: {
            total_count: commissions._count,
            total_amount: Number(commissions._sum.amount || 0),
            agent_share: Number(commissions._sum.agentShareAmount || 0),
          },
          contacts_managed: contacts,
          tasks_completed: tasks,
          appointments: appointments,
        };
      })
    );

    return performance;
  }

  /**
   * Commission report - detailed commission breakdown.
   */
  async getCommissionReport(filters: DateRangeFilter & { agent_id?: string }, user: AuthenticatedUser) {
    const officeId = user.officeId!;
    const where: Prisma.CommissionWhereInput = { officeId };

    if (filters.agent_id) {
      where.agentId = filters.agent_id;
    }

    if (filters.date_from || filters.date_to) {
      where.createdAt = {};
      if (filters.date_from) where.createdAt.gte = new Date(filters.date_from);
      if (filters.date_to) where.createdAt.lte = new Date(filters.date_to);
    }

    const [summary, byStatus, byMonth] = await Promise.all([
      prisma.commission.aggregate({
        where,
        _sum: { amount: true, agentShareAmount: true, officeShareAmount: true },
        _count: true,
      }),

      prisma.commission.groupBy({
        by: ['status'],
        where,
        _sum: { amount: true },
        _count: true,
      }),

      prisma.$queryRaw`
        SELECT
          DATE_TRUNC('month', created_at) as month,
          COUNT(*)::int as count,
          SUM(amount)::float as total_amount,
          SUM(agent_share_amount)::float as agent_share,
          SUM(office_share_amount)::float as office_share
        FROM commissions
        WHERE office_id = ${officeId}
          ${filters.agent_id ? Prisma.sql`AND agent_id = ${filters.agent_id}` : Prisma.empty}
          ${filters.date_from ? Prisma.sql`AND created_at >= ${new Date(filters.date_from)}` : Prisma.empty}
          ${filters.date_to ? Prisma.sql`AND created_at <= ${new Date(filters.date_to)}` : Prisma.empty}
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
      `,
    ]);

    const KDV_RATE = 20;

    return {
      summary: {
        total_count: summary._count,
        total_amount: Number(summary._sum.amount || 0),
        total_agent_share: Number(summary._sum.agentShareAmount || 0),
        total_office_share: Number(summary._sum.officeShareAmount || 0),
        kdv_amount: Number(summary._sum.amount || 0) * (KDV_RATE / 100),
      },
      by_status: byStatus.map((s) => ({
        status: s.status,
        count: s._count,
        amount: Number(s._sum.amount || 0),
      })),
      by_month: byMonth,
    };
  }

  /**
   * Portal performance report - listing stats from portals.
   */
  async getPortalPerformance(filters: DateRangeFilter, user: AuthenticatedUser) {
    const officeId = user.officeId!;

    const portalStats = await prisma.$queryRaw`
      SELECT
        p.name as portal_name,
        p.slug as portal_slug,
        COUNT(pl.id)::int as total_listings,
        SUM(CASE WHEN pl.status = 'PUBLISHED' THEN 1 ELSE 0 END)::int as active_listings,
        SUM(pl.views_count)::int as total_views,
        SUM(pl.favorites_count)::int as total_favorites,
        AVG(pl.views_count)::float as avg_views_per_listing
      FROM portal_listings pl
      JOIN portals p ON pl.portal_id = p.id
      JOIN properties prop ON pl.property_id = prop.id
      WHERE prop.office_id = ${officeId}
      GROUP BY p.id, p.name, p.slug
      ORDER BY total_views DESC
    `;

    return portalStats;
  }

  // ---- Helper methods ----

  private buildDateWhere(filters: DateRangeFilter, field: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (filters.date_from || filters.date_to) {
      const dateFilter: Record<string, Date> = {};
      if (filters.date_from) dateFilter.gte = new Date(filters.date_from);
      if (filters.date_to) dateFilter.lte = new Date(filters.date_to);
      result[field] = dateFilter;
    }
    return result;
  }

  private buildDateFilter(filters: DateRangeFilter): Record<string, Record<string, Date> | undefined> {
    if (!filters.date_from && !filters.date_to) return {};
    const dateFilter: Record<string, Date> = {};
    if (filters.date_from) dateFilter.gte = new Date(filters.date_from);
    if (filters.date_to) dateFilter.lte = new Date(filters.date_to);
    return { createdAt: dateFilter };
  }
}

export const reportsService = new ReportsService();
