import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../middleware/errorHandler';
import { parsePaginationParams, createPaginatedResponse } from '../../utils/pagination';
import logger from '../../utils/logger';
import type { AuthenticatedUser } from '../../middleware/auth';

const prisma = new PrismaClient();

interface OfficeSettingsInput {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  tax_office?: string;
  trade_registry_number?: string;
  license_number?: string;
  logo_url?: string;
  website?: string;
  commission_rate_buy?: number;
  commission_rate_sell?: number;
  commission_rate_rent?: number;
  settings?: Record<string, unknown>;
}

interface CreateTemplateInput {
  name: string;
  channel: string;
  category?: string;
  subject?: string;
  content: string;
  variables?: string[];
  language?: string;
}

interface UpdateTemplateInput extends Partial<CreateTemplateInput> {}

interface TemplateFilterInput {
  channel?: string;
  category?: string;
  search?: string;
  page?: string;
  limit?: string;
}

export class SettingsService {
  /**
   * Get office settings for the current user's office.
   */
  async getOfficeSettings(user: AuthenticatedUser) {
    if (!user.officeId) {
      throw BadRequestError('Ofis bilgisi gerekli');
    }

    const office = await prisma.office.findUnique({
      where: { id: user.officeId },
    });

    if (!office) {
      throw NotFoundError('Ofis');
    }

    return office;
  }

  /**
   * Update office settings.
   */
  async updateOfficeSettings(data: OfficeSettingsInput, user: AuthenticatedUser) {
    if (!user.officeId) {
      throw BadRequestError('Ofis bilgisi gerekli');
    }

    const office = await prisma.office.update({
      where: { id: user.officeId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.tax_number !== undefined && { taxNumber: data.tax_number }),
        ...(data.tax_office !== undefined && { taxOffice: data.tax_office }),
        ...(data.trade_registry_number !== undefined && { tradeRegistryNumber: data.trade_registry_number }),
        ...(data.license_number !== undefined && { licenseNumber: data.license_number }),
        ...(data.logo_url !== undefined && { logoUrl: data.logo_url }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.commission_rate_buy !== undefined && { commissionRateBuy: data.commission_rate_buy }),
        ...(data.commission_rate_sell !== undefined && { commissionRateSell: data.commission_rate_sell }),
        ...(data.commission_rate_rent !== undefined && { commissionRateRent: data.commission_rate_rent }),
        ...(data.settings !== undefined && { settings: data.settings as Prisma.InputJsonValue }),
      },
    });

    logger.info(`Ofis ayarlari guncellendi: ${office.id}`);

    return office;
  }

  /**
   * List message templates for the current office.
   */
  async listTemplates(filters: TemplateFilterInput, user: AuthenticatedUser) {
    if (!user.officeId) {
      throw BadRequestError('Ofis bilgisi gerekli');
    }

    const { page, limit, skip } = parsePaginationParams(filters as Record<string, unknown>);

    const where: Prisma.MessageTemplateWhereInput = {
      officeId: user.officeId,
    };

    if (filters.channel) {
      where.channel = filters.channel as any;
    }

    if (filters.category) {
      where.category = filters.category as any;
    }

    if (filters.search) {
      const term = filters.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.messageTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.messageTemplate.count({ where }),
    ]);

    return createPaginatedResponse(templates, total, page, limit);
  }

  /**
   * Get a single message template.
   */
  async getTemplateById(templateId: string, user: AuthenticatedUser) {
    if (!user.officeId) {
      throw BadRequestError('Ofis bilgisi gerekli');
    }

    const template = await prisma.messageTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw NotFoundError('Mesaj sablonu');
    }

    if (template.officeId !== user.officeId) {
      throw ForbiddenError('Bu sablona erisim yetkiniz yok');
    }

    return template;
  }

  /**
   * Create a message template.
   */
  async createTemplate(data: CreateTemplateInput, user: AuthenticatedUser) {
    if (!user.officeId) {
      throw BadRequestError('Ofis bilgisi gerekli');
    }

    const template = await prisma.messageTemplate.create({
      data: {
        officeId: user.officeId,
        name: data.name,
        channel: data.channel as any,
        category: (data.category || 'GENERAL') as any,
        subject: data.subject || null,
        content: data.content,
        variables: data.variables || [],
        language: data.language || 'tr',
      },
    });

    logger.info(`Yeni mesaj sablonu olusturuldu: ${template.name} (${template.id})`);

    return template;
  }

  /**
   * Update a message template.
   */
  async updateTemplate(templateId: string, data: UpdateTemplateInput, user: AuthenticatedUser) {
    await this.getTemplateById(templateId, user);

    const template = await prisma.messageTemplate.update({
      where: { id: templateId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.channel !== undefined && { channel: data.channel as any }),
        ...(data.category !== undefined && { category: data.category as any }),
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.variables !== undefined && { variables: data.variables }),
        ...(data.language !== undefined && { language: data.language }),
      },
    });

    logger.info(`Mesaj sablonu guncellendi: ${templateId}`);

    return template;
  }

  /**
   * Delete a message template.
   */
  async deleteTemplate(templateId: string, user: AuthenticatedUser) {
    await this.getTemplateById(templateId, user);

    await prisma.messageTemplate.delete({ where: { id: templateId } });

    logger.info(`Mesaj sablonu silindi: ${templateId}`);
  }
}

export const settingsService = new SettingsService();
