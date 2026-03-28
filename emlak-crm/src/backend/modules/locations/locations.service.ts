import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError } from '../../middleware/errorHandler';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

export class LocationsService {
  /**
   * Get all iller (provinces) - Turkey has 81 provinces.
   */
  async getIller() {
    const iller = await prisma.il.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        plateCode: true,
      },
    });

    return iller;
  }

  /**
   * Get a single il by ID with its ilceler count.
   */
  async getIlById(ilId: string) {
    const il = await prisma.il.findUnique({
      where: { id: ilId },
      include: {
        _count: {
          select: { ilceler: true, properties: true },
        },
      },
    });

    if (!il) {
      throw NotFoundError('Il');
    }

    return il;
  }

  /**
   * Get ilceler (districts) for a given il.
   */
  async getIlcelerByIl(ilId: string) {
    // Verify the il exists
    const il = await prisma.il.findUnique({ where: { id: ilId } });
    if (!il) {
      throw NotFoundError('Il');
    }

    const ilceler = await prisma.ilce.findMany({
      where: { ilId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        ilId: true,
        _count: {
          select: { mahalleler: true, properties: true },
        },
      },
    });

    return ilceler;
  }

  /**
   * Get mahalleler (neighborhoods) for a given ilce.
   */
  async getMahallelerByIlce(ilceId: string) {
    // Verify the ilce exists
    const ilce = await prisma.ilce.findUnique({
      where: { id: ilceId },
      include: {
        il: { select: { id: true, name: true } },
      },
    });
    if (!ilce) {
      throw NotFoundError('Ilce');
    }

    const mahalleler = await prisma.mahalle.findMany({
      where: { ilceId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        postalCode: true,
        ilceId: true,
        _count: {
          select: { properties: true },
        },
      },
    });

    return mahalleler;
  }

  /**
   * Search locations across all levels (il, ilce, mahalle).
   */
  async searchLocations(query: string, limit: number = 20) {
    const term = query.trim();
    if (term.length < 2) {
      return { iller: [], ilceler: [], mahalleler: [] };
    }

    const [iller, ilceler, mahalleler] = await Promise.all([
      // Search iller
      prisma.il.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { plateCode: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, plateCode: true },
      }),

      // Search ilceler
      prisma.ilce.findMany({
        where: {
          name: { contains: term, mode: 'insensitive' },
        },
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          il: { select: { id: true, name: true } },
        },
      }),

      // Search mahalleler
      prisma.mahalle.findMany({
        where: {
          name: { contains: term, mode: 'insensitive' },
        },
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          postalCode: true,
          ilce: {
            select: {
              id: true,
              name: true,
              il: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    return { iller, ilceler, mahalleler };
  }

  /**
   * Get the full location hierarchy for a given mahalle.
   */
  async getLocationHierarchy(mahalleId: string) {
    const mahalle = await prisma.mahalle.findUnique({
      where: { id: mahalleId },
      include: {
        ilce: {
          include: {
            il: true,
          },
        },
      },
    });

    if (!mahalle) {
      throw NotFoundError('Mahalle');
    }

    return {
      il: {
        id: mahalle.ilce.il.id,
        name: mahalle.ilce.il.name,
        plate_code: mahalle.ilce.il.plateCode,
      },
      ilce: {
        id: mahalle.ilce.id,
        name: mahalle.ilce.name,
      },
      mahalle: {
        id: mahalle.id,
        name: mahalle.name,
        postal_code: mahalle.postalCode,
      },
    };
  }
}

export const locationsService = new LocationsService();
