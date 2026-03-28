import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../../middleware/errorHandler';
import { parsePaginationParams, createPaginatedResponse } from '../../utils/pagination';
import { notifyUser } from '../../utils/notification-helper';
import logger from '../../utils/logger';
import type { AuthenticatedUser } from '../../middleware/auth';
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentFilterInput,
  DateRangeInput,
} from './calendar.validation';

const prisma = new PrismaClient();

const APPOINTMENT_INCLUDE = {
  user: {
    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
  },
  contact: {
    select: { id: true, firstName: true, lastName: true, phone: true, email: true },
  },
  property: {
    select: { id: true, title: true, address: true },
  },
  deal: {
    select: { id: true, type: true, stage: true },
  },
} as const;

export class CalendarService {
  /**
   * List appointments with filtering and pagination (office-scoped).
   */
  async listAppointments(filters: AppointmentFilterInput, user: AuthenticatedUser) {
    const { page, limit, skip, sortBy, sortOrder } = parsePaginationParams(filters);

    const where: Prisma.AppointmentWhereInput = {
      officeId: user.officeId!,
    };

    if (filters.search) {
      const term = filters.search.trim();
      where.OR = [
        { title: { contains: term } },
        { notes: { contains: term } },
        { location: { contains: term } },
      ];
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

    if (filters.user_id) {
      where.userId = filters.user_id;
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

    if (filters.start_from || filters.start_to) {
      where.startTime = {};
      if (filters.start_from) where.startTime.gte = new Date(filters.start_from);
      if (filters.start_to) where.startTime.lte = new Date(filters.start_to);
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy === 'created_at' ? 'startTime' : sortBy]: sortOrder },
        include: APPOINTMENT_INCLUDE,
      }),
      prisma.appointment.count({ where }),
    ]);

    return createPaginatedResponse(appointments, total, page, limit);
  }

  /**
   * Get appointments within a date range (for calendar view).
   */
  async getByDateRange(params: DateRangeInput, user: AuthenticatedUser) {
    const where: Prisma.AppointmentWhereInput = {
      officeId: user.officeId!,
      startTime: {
        gte: new Date(params.start),
        lte: new Date(params.end),
      },
    };

    if (params.user_id) {
      where.userId = params.user_id;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: APPOINTMENT_INCLUDE,
    });

    return appointments;
  }

  /**
   * Get upcoming appointments for the current user (next 7 days).
   */
  async getUpcoming(user: AuthenticatedUser) {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const appointments = await prisma.appointment.findMany({
      where: {
        officeId: user.officeId!,
        userId: user.id,
        startTime: {
          gte: now,
          lte: nextWeek,
        },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      orderBy: { startTime: 'asc' },
      take: 20,
      include: APPOINTMENT_INCLUDE,
    });

    return appointments;
  }

  /**
   * Get a single appointment by ID.
   */
  async getAppointmentById(appointmentId: string, user: AuthenticatedUser) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: APPOINTMENT_INCLUDE,
    });

    if (!appointment) {
      throw NotFoundError('Randevu');
    }

    if (appointment.officeId !== user.officeId) {
      throw ForbiddenError('Bu randevuya erisim yetkiniz yok');
    }

    return appointment;
  }

  /**
   * Create a new appointment with conflict detection.
   */
  async createAppointment(data: CreateAppointmentInput, user: AuthenticatedUser) {
    if (!user.officeId) {
      throw BadRequestError('Ofis bilgisi gerekli');
    }

    const startTime = new Date(data.start_time);
    const endTime = new Date(data.end_time);

    // Check for scheduling conflicts
    await this.checkConflicts(user.id, startTime, endTime);

    const appointment = await prisma.appointment.create({
      data: {
        title: data.title,
        type: data.type || 'SHOWING',
        status: data.status || 'SCHEDULED',
        userId: user.id,
        contactId: data.contact_id,
        propertyId: data.property_id || null,
        dealId: data.deal_id || null,
        startTime,
        endTime,
        location: data.location || null,
        notes: data.notes || null,
        officeId: user.officeId,
      },
      include: APPOINTMENT_INCLUDE,
    });

    logger.info(`Yeni randevu olusturuldu: ${appointment.title} (${appointment.id})`);

    // --- Notification: New Appointment ---
    const contactName = appointment.contact
      ? `${appointment.contact.firstName} ${appointment.contact.lastName}`
      : '';
    const dateStr = startTime.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Istanbul',
    });
    await notifyUser(user.id, user.officeId!, {
      type: 'NEW_APPOINTMENT',
      title: 'Yeni randevu',
      body: `${dateStr} - ${appointment.title}${contactName ? ` (${contactName})` : ''}`,
      link: '/takvim',
      contactId: data.contact_id || undefined,
    });

    return appointment;
  }

  /**
   * Update an appointment.
   */
  async updateAppointment(appointmentId: string, data: UpdateAppointmentInput, user: AuthenticatedUser) {
    const existing = await this.getAppointmentById(appointmentId, user);

    // If times are changing, check for conflicts
    const newStart = data.start_time ? new Date(data.start_time) : existing.startTime;
    const newEnd = data.end_time ? new Date(data.end_time) : existing.endTime;

    if (data.start_time || data.end_time) {
      if (newEnd <= newStart) {
        throw BadRequestError('Bitis zamani baslangic zamanindan sonra olmali');
      }
      await this.checkConflicts(existing.userId, newStart, newEnd, appointmentId);
    }

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.contact_id !== undefined && { contactId: data.contact_id }),
        ...(data.property_id !== undefined && { propertyId: data.property_id }),
        ...(data.deal_id !== undefined && { dealId: data.deal_id }),
        ...(data.start_time !== undefined && { startTime: new Date(data.start_time) }),
        ...(data.end_time !== undefined && { endTime: new Date(data.end_time) }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: APPOINTMENT_INCLUDE,
    });

    logger.info(`Randevu guncellendi: ${appointmentId}`);

    return appointment;
  }

  /**
   * Delete an appointment.
   */
  async deleteAppointment(appointmentId: string, user: AuthenticatedUser) {
    await this.getAppointmentById(appointmentId, user);

    await prisma.appointment.delete({ where: { id: appointmentId } });

    logger.info(`Randevu silindi: ${appointmentId}`);
  }

  /**
   * Check for time conflicts with existing appointments.
   */
  private async checkConflicts(
    userId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ) {
    const where: Prisma.AppointmentWhereInput = {
      userId,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const conflicting = await prisma.appointment.findFirst({
      where,
      select: { id: true, title: true, startTime: true, endTime: true },
    });

    if (conflicting) {
      throw ConflictError(
        `Bu zaman diliminde baska bir randevunuz var: "${conflicting.title}" (${conflicting.startTime.toISOString()} - ${conflicting.endTime.toISOString()})`
      );
    }
  }

  /**
   * Get appointments that need reminders (starting in the next hour, not yet reminded).
   */
  async getAppointmentsNeedingReminder(officeId: string) {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    return prisma.appointment.findMany({
      where: {
        officeId,
        reminderSent: false,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        startTime: {
          gte: now,
          lte: oneHourLater,
        },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    });
  }

  /**
   * Mark reminder as sent for an appointment.
   */
  async markReminderSent(appointmentId: string) {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { reminderSent: true },
    });
  }

  /**
   * Process appointment reminders: find appointments starting within 1 hour
   * that haven't been reminded yet, and notify the assigned users.
   * Should be called by a background/cron job.
   */
  async processAppointmentReminders(officeId: string) {
    const appointments = await this.getAppointmentsNeedingReminder(officeId);

    for (const appointment of appointments) {
      if (appointment.user) {
        await notifyUser(appointment.user.id, officeId, {
          type: 'APPOINTMENT_REMINDER',
          title: 'Randevu hatirlatmasi',
          body: `1 saat sonra: ${appointment.title}`,
          link: '/takvim',
        });

        await this.markReminderSent(appointment.id);
      }
    }

    logger.info(`Randevu hatirlatmalari islendi: ${appointments.length} randevu (ofis: ${officeId})`);
    return { processed: appointments.length };
  }
}

export const calendarService = new CalendarService();
