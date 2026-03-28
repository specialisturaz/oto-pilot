import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../middleware/errorHandler';
import { parsePaginationParams, createPaginatedResponse } from '../../utils/pagination';
import logger from '../../utils/logger';
import type { AuthenticatedUser } from '../../middleware/auth';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  CompleteTaskInput,
  TaskFilterInput,
} from './tasks.validation';

const prisma = new PrismaClient();

export class TasksService {
  /**
   * List tasks with filtering and pagination (office-scoped).
   */
  async listTasks(filters: TaskFilterInput, user: AuthenticatedUser) {
    const { page, limit, skip, sortBy, sortOrder } = parsePaginationParams(filters);

    const where: Prisma.TaskWhereInput = {
      officeId: user.officeId!,
    };

    if (filters.search) {
      const term = filters.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (filters.type) {
      where.type = filters.type as Prisma.EnumTaskTypeFilter;
    }

    if (filters.priority) {
      where.priority = filters.priority as Prisma.EnumTaskPriorityFilter;
    }

    if (filters.status) {
      const statuses = filters.status.split(',').map((s) => s.trim());
      if (statuses.length === 1) {
        where.status = statuses[0] as any;
      } else {
        where.status = { in: statuses as any[] };
      }
    }

    if (filters.assigned_to_id) {
      where.assignedToId = filters.assigned_to_id;
    }

    if (filters.contact_id) {
      where.contactId = filters.contact_id;
    }

    if (filters.property_id) {
      where.propertyId = filters.property_id;
    }

    if (filters.deal_id) {
      where.dealId = filters.deal_id;
    }

    if (filters.due_from || filters.due_to) {
      where.dueDate = {};
      if (filters.due_from) where.dueDate.gte = new Date(filters.due_from);
      if (filters.due_to) where.dueDate.lte = new Date(filters.due_to);
    }

    if (filters.is_overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { in: ['TODO', 'IN_PROGRESS'] };
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          contact: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
          property: {
            select: { id: true, title: true },
          },
          deal: {
            select: { id: true, type: true, stage: true },
          },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return createPaginatedResponse(tasks, total, page, limit);
  }

  /**
   * Get tasks assigned to the current user.
   */
  async getMyTasks(filters: TaskFilterInput, user: AuthenticatedUser) {
    return this.listTasks({ ...filters, assigned_to_id: user.id }, user);
  }

  /**
   * Get a single task by ID.
   */
  async getTaskById(taskId: string, user: AuthenticatedUser) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        property: {
          select: { id: true, title: true, price: true },
        },
        deal: {
          select: { id: true, type: true, stage: true, agreedPrice: true },
        },
      },
    });

    if (!task) {
      throw NotFoundError('Gorev');
    }

    if (task.officeId !== user.officeId) {
      throw ForbiddenError('Bu goreve erisim yetkiniz yok');
    }

    return task;
  }

  /**
   * Create a new task.
   */
  async createTask(data: CreateTaskInput, user: AuthenticatedUser) {
    if (!user.officeId) {
      throw BadRequestError('Ofis bilgisi gerekli');
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description || null,
        type: data.type || 'OTHER',
        priority: data.priority || 'MEDIUM',
        status: data.status || 'TODO',
        assignedToId: data.assigned_to_id || user.id,
        createdById: user.id,
        contactId: data.contact_id || null,
        propertyId: data.property_id || null,
        dealId: data.deal_id || null,
        dueDate: data.due_date ? new Date(data.due_date) : null,
        reminderAt: data.reminder_at ? new Date(data.reminder_at) : null,
        isRecurring: data.is_recurring || false,
        recurrenceRule: data.recurrence_rule || null,
        officeId: user.officeId,
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    logger.info(`Yeni gorev olusturuldu: ${task.title} (${task.id})`);

    return task;
  }

  /**
   * Update a task.
   */
  async updateTask(taskId: string, data: UpdateTaskInput, user: AuthenticatedUser) {
    const existing = await this.getTaskById(taskId, user);

    const taskUpdateData: Prisma.TaskUpdateInput = {};
    if (data.title !== undefined) taskUpdateData.title = data.title;
    if (data.description !== undefined) taskUpdateData.description = data.description;
    if (data.type !== undefined) taskUpdateData.type = data.type as any;
    if (data.priority !== undefined) taskUpdateData.priority = data.priority as any;
    if (data.status !== undefined) taskUpdateData.status = data.status as any;
    if (data.assigned_to_id !== undefined && data.assigned_to_id !== null) taskUpdateData.assignedTo = { connect: { id: data.assigned_to_id } };
    if (data.contact_id !== undefined) {
      taskUpdateData.contact = data.contact_id ? { connect: { id: data.contact_id } } : { disconnect: true };
    }
    if (data.property_id !== undefined) {
      taskUpdateData.property = data.property_id ? { connect: { id: data.property_id } } : { disconnect: true };
    }
    if (data.deal_id !== undefined) {
      taskUpdateData.deal = data.deal_id ? { connect: { id: data.deal_id } } : { disconnect: true };
    }
    if (data.due_date !== undefined) taskUpdateData.dueDate = data.due_date ? new Date(data.due_date) : null;
    if (data.reminder_at !== undefined) taskUpdateData.reminderAt = data.reminder_at ? new Date(data.reminder_at) : null;
    if (data.is_recurring !== undefined) taskUpdateData.isRecurring = data.is_recurring;
    if (data.recurrence_rule !== undefined) taskUpdateData.recurrenceRule = data.recurrence_rule;

    const task = await prisma.task.update({
      where: { id: taskId },
      data: taskUpdateData,
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    logger.info(`Gorev guncellendi: ${task.id}`);

    return task;
  }

  /**
   * Assign a task to a different user.
   */
  async assignTask(taskId: string, assignToId: string, user: AuthenticatedUser) {
    await this.getTaskById(taskId, user);

    // Verify the target user exists and belongs to the same office
    const targetUser = await prisma.user.findUnique({ where: { id: assignToId } });
    if (!targetUser) {
      throw NotFoundError('Atanacak kullanici');
    }
    if (targetUser.officeId !== user.officeId) {
      throw ForbiddenError('Farkli ofisteki kullaniciya gorev atanamaz');
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { assignedToId: assignToId },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    logger.info(`Gorev atandi: ${taskId} -> ${assignToId}`);

    return task;
  }

  /**
   * Complete a task and optionally create the next recurring instance.
   */
  async completeTask(taskId: string, data: CompleteTaskInput, user: AuthenticatedUser) {
    const existing = await this.getTaskById(taskId, user);

    if (existing.status === 'COMPLETED') {
      throw BadRequestError('Bu gorev zaten tamamlanmis');
    }

    if (existing.status === 'CANCELLED') {
      throw BadRequestError('Iptal edilmis gorev tamamlanamaz');
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    // If the task is recurring, create the next instance
    if (existing.isRecurring && existing.recurrenceRule) {
      const nextDueDate = this.calculateNextDueDate(existing.dueDate, existing.recurrenceRule);
      if (nextDueDate) {
        await prisma.task.create({
          data: {
            title: existing.title,
            description: existing.description,
            type: existing.type,
            priority: existing.priority,
            status: 'TODO',
            assignedToId: existing.assignedToId,
            createdById: existing.createdById,
            contactId: existing.contactId,
            propertyId: existing.propertyId,
            dealId: existing.dealId,
            dueDate: nextDueDate,
            reminderAt: existing.reminderAt
              ? new Date(nextDueDate.getTime() - (existing.dueDate!.getTime() - existing.reminderAt.getTime()))
              : null,
            isRecurring: true,
            recurrenceRule: existing.recurrenceRule,
            officeId: existing.officeId,
          },
        });
        logger.info(`Tekrarlayan gorev olusturuldu: ${existing.title} - sonraki tarih: ${nextDueDate.toISOString()}`);
      }
    }

    logger.info(`Gorev tamamlandi: ${taskId}`);

    return task;
  }

  /**
   * Delete (soft or hard) a task.
   */
  async deleteTask(taskId: string, user: AuthenticatedUser) {
    await this.getTaskById(taskId, user);

    await prisma.task.delete({ where: { id: taskId } });

    logger.info(`Gorev silindi: ${taskId}`);
  }

  /**
   * Get tasks that are due soon (next 24 hours) for reminder processing.
   */
  async getTasksDueSoon(officeId: string) {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return prisma.task.findMany({
      where: {
        officeId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: {
          gte: now,
          lte: tomorrow,
        },
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  /**
   * Calculate the next due date based on an iCal-like recurrence rule.
   * Supports: FREQ=DAILY, FREQ=WEEKLY, FREQ=MONTHLY with INTERVAL.
   */
  private calculateNextDueDate(currentDueDate: Date | null, rrule: string): Date | null {
    if (!currentDueDate) return null;

    const parts = rrule.split(';').reduce<Record<string, string>>((acc, part) => {
      const [key, value] = part.split('=');
      if (key && value) acc[key] = value;
      return acc;
    }, {});

    const freq = parts['FREQ'];
    const interval = parseInt(parts['INTERVAL'] || '1', 10);
    const count = parts['COUNT'] ? parseInt(parts['COUNT'], 10) : null;

    // If COUNT is specified and equals 1 (or 0), don't create another instance
    if (count !== null && count <= 1) return null;

    const next = new Date(currentDueDate);

    switch (freq) {
      case 'DAILY':
        next.setDate(next.getDate() + interval);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7 * interval);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + interval);
        break;
      case 'YEARLY':
        next.setFullYear(next.getFullYear() + interval);
        break;
      default:
        return null;
    }

    return next;
  }
}

export const tasksService = new TasksService();
