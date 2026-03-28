import { PrismaClient } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../../middleware/errorHandler';
import { SyndicationEngine } from '../../../integrations/portals/syndication-engine';
import type { PortalProperty } from '../../../integrations/portals/base-portal';
import logger from '../../utils/logger';
import config from '../../config';
import type { AuthenticatedUser } from '../../middleware/auth';
import type { UpdatePortalInput, PublishToPortalsInput } from './portals.validation';

const prisma = new PrismaClient();

export class PortalsService {
  /**
   * Creates a SyndicationEngine from current portal DB records.
   */
  private async createSyndicationEngine(): Promise<SyndicationEngine> {
    const portals = await prisma.portal.findMany({ where: { isActive: true } });

    const portalConfigs = portals.map((p) => ({
      name: p.name,
      slug: p.slug,
      apiKey: p.apiKeyEncrypted || '',
      apiSecret: p.apiSecretEncrypted || '',
      isActive: p.isActive,
    }));

    return new SyndicationEngine(portalConfigs);
  }

  /**
   * List all portals with listing counts and aggregate stats.
   */
  async listPortals(_user: AuthenticatedUser) {
    const portals = await prisma.portal.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { listings: true },
        },
      },
    });

    // Gather aggregate stats per portal
    const portalData = await Promise.all(
      portals.map(async (portal) => {
        const stats = await prisma.portalListing.aggregate({
          where: { portalId: portal.id, status: 'PUBLISHED' },
          _sum: {
            viewsCount: true,
            favoritesCount: true,
          },
          _count: true,
        });

        return {
          id: portal.id,
          name: portal.name,
          slug: portal.slug,
          baseUrl: portal.baseUrl,
          apiUrl: portal.apiUrl,
          isActive: portal.isActive,
          settings: portal.settings ? JSON.parse(portal.settings) : {},
          hasApiKey: !!portal.apiKeyEncrypted,
          totalListings: stats._count,
          totalViews: stats._sum.viewsCount || 0,
          totalFavorites: stats._sum.favoritesCount || 0,
          createdAt: portal.createdAt,
          updatedAt: portal.updatedAt,
        };
      })
    );

    return portalData;
  }

  /**
   * Get a single portal with all details.
   */
  async getPortalById(portalId: string) {
    const portal = await prisma.portal.findUnique({
      where: { id: portalId },
      include: {
        _count: {
          select: { listings: true },
        },
      },
    });

    if (!portal) {
      throw NotFoundError('Portal');
    }

    const stats = await prisma.portalListing.aggregate({
      where: { portalId: portal.id, status: 'PUBLISHED' },
      _sum: {
        viewsCount: true,
        favoritesCount: true,
      },
      _count: true,
    });

    return {
      id: portal.id,
      name: portal.name,
      slug: portal.slug,
      baseUrl: portal.baseUrl,
      apiUrl: portal.apiUrl,
      isActive: portal.isActive,
      settings: portal.settings ? JSON.parse(portal.settings) : {},
      hasApiKey: !!portal.apiKeyEncrypted,
      totalListings: stats._count,
      totalViews: stats._sum.viewsCount || 0,
      totalFavorites: stats._sum.favoritesCount || 0,
      createdAt: portal.createdAt,
      updatedAt: portal.updatedAt,
    };
  }

  /**
   * Update portal settings (API keys, active status, etc.).
   */
  async updatePortal(portalId: string, data: UpdatePortalInput) {
    const existing = await prisma.portal.findUnique({ where: { id: portalId } });
    if (!existing) {
      throw NotFoundError('Portal');
    }

    const updateData: Record<string, unknown> = {};

    if (data.apiKey !== undefined) {
      updateData.apiKeyEncrypted = data.apiKey;
    }
    if (data.apiSecret !== undefined) {
      updateData.apiSecretEncrypted = data.apiSecret;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    if (data.settings !== undefined) {
      updateData.settings = JSON.stringify(data.settings);
    }

    const portal = await prisma.portal.update({
      where: { id: portalId },
      data: updateData,
    });

    logger.info(`Portal guncellendi: ${portal.name} (${portal.id})`);

    return {
      id: portal.id,
      name: portal.name,
      slug: portal.slug,
      isActive: portal.isActive,
      hasApiKey: !!portal.apiKeyEncrypted,
      updatedAt: portal.updatedAt,
    };
  }

  /**
   * Test portal API connection.
   */
  async testConnection(portalId: string) {
    const portal = await prisma.portal.findUnique({ where: { id: portalId } });
    if (!portal) {
      throw NotFoundError('Portal');
    }

    if (!portal.apiKeyEncrypted) {
      return {
        success: false,
        portal: portal.name,
        message: `${portal.name} icin API anahtari tanimlanmamis`,
      };
    }

    try {
      const engine = await this.createSyndicationEngine();
      const result = await engine.testConnection(portal.slug);

      logger.info(`Portal baglanti testi: ${portal.name} - ${result.success ? 'basarili' : 'basarisiz'}`);

      return {
        success: result.success,
        portal: portal.name,
        message: result.success
          ? `${portal.name} baglantisi basarili`
          : `${portal.name} baglanti hatasi: ${result.error || 'Bilinmeyen hata'}`,
      };
    } catch (error) {
      logger.error(`Portal baglanti testi hatasi (${portal.name}):`, error);
      return {
        success: false,
        portal: portal.name,
        message: `${portal.name} baglanti testi basarisiz: ${String(error)}`,
      };
    }
  }

  /**
   * Get listings for a specific portal.
   */
  async getPortalListings(portalId: string) {
    const portal = await prisma.portal.findUnique({ where: { id: portalId } });
    if (!portal) {
      throw NotFoundError('Portal');
    }

    const listings = await prisma.portalListing.findMany({
      where: { portalId },
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            currency: true,
            listingType: true,
            propertyType: true,
            address: true,
            photos: {
              take: 1,
              orderBy: { orderIndex: 'asc' },
              select: { url: true, thumbnailUrl: true },
            },
          },
        },
      },
    });

    return listings.map((l) => ({
      id: l.id,
      propertyId: l.propertyId,
      portalId: l.portalId,
      externalListingId: l.externalListingId,
      status: l.status,
      publishedAt: l.publishedAt,
      expiresAt: l.expiresAt,
      portalUrl: l.portalUrl,
      viewsCount: l.viewsCount,
      favoritesCount: l.favoritesCount,
      lastSyncedAt: l.lastSyncedAt,
      errorMessage: l.errorMessage,
      property: l.property,
    }));
  }

  /**
   * Publish a property to selected portals.
   * Full end-to-end: load property -> map -> call portal APIs -> save results.
   */
  async publishToPortals(data: PublishToPortalsInput, user: AuthenticatedUser) {
    // 1. Get property from DB with all details
    const property = await prisma.property.findUnique({
      where: { id: data.propertyId },
      include: {
        photos: { orderBy: { orderIndex: 'asc' } },
        features: {
          include: { feature: true },
        },
        il: true,
        ilce: true,
        mahalle: true,
      },
    });

    if (!property) {
      throw NotFoundError('Emlak ilani');
    }

    if (property.officeId !== user.officeId) {
      throw BadRequestError('Bu ilana erisim yetkiniz yok');
    }

    if (property.propertyStatus !== 'ACTIVE' && property.propertyStatus !== 'active') {
      throw BadRequestError('Sadece aktif ilanlar portallara gonderilebilir');
    }

    // 2. Map property to PortalProperty format
    const portalProperty: PortalProperty = {
      id: property.id,
      title: property.title,
      description: property.description || '',
      price: property.price,
      currency: (property.currency as 'TRY' | 'USD' | 'EUR' | 'GBP') || 'TRY',
      listingType: property.listingType.toUpperCase().includes('SATILIK') ? 'SALE' : 'RENT',
      propertyType: property.propertyType.toUpperCase(),
      il: property.il?.name || '',
      ilce: property.ilce?.name || '',
      mahalle: property.mahalle?.name || '',
      address: property.address || '',
      latitude: property.latitude || undefined,
      longitude: property.longitude || undefined,
      grossSqm: property.grossSqm || 0,
      netSqm: property.netSqm || 0,
      roomCount: property.roomCount || '1+0',
      bathroomCount: property.bathroomCount || 1,
      floorNumber: property.floorNumber || 0,
      totalFloors: property.totalFloors || 1,
      buildingAge: property.buildingAge || 0,
      heatingType: property.heatingType || 'NONE',
      deedType: property.deedType || '',
      hasIskan: property.hasIskan ?? false,
      hasDask: property.hasDask ?? false,
      isFurnished: property.isFurnished ?? false,
      duesAmount: property.duesAmount || undefined,
      features: property.features.map((pf) => pf.feature.nameTr),
      photos: property.photos.map((p) => ({
        url: p.url.startsWith('http') ? p.url : `${config.server.frontendUrl}${p.url}`,
        order: p.orderIndex,
        iscover: p.orderIndex === 0,
      })),
    };

    // 3. Call syndication engine for actual publishing
    const engine = await this.createSyndicationEngine();
    const syndicationResult = await engine.publishToAll(portalProperty, data.portalSlugs);

    // 4. Create PortalListing records in DB for each result
    const results: Array<{
      portal: string;
      success: boolean;
      message: string;
      externalId?: string;
      portalUrl?: string;
    }> = [];

    for (const item of syndicationResult.results) {
      const portal = await prisma.portal.findUnique({ where: { slug: item.portal } });
      if (!portal) continue;

      try {
        if (item.result.success) {
          await prisma.portalListing.upsert({
            where: {
              propertyId_portalId: {
                propertyId: property.id,
                portalId: portal.id,
              },
            },
            update: {
              externalListingId: item.result.externalListingId || null,
              portalUrl: item.result.portalUrl || null,
              status: 'PUBLISHED',
              publishedAt: new Date(),
              lastSyncedAt: new Date(),
              errorMessage: null,
            },
            create: {
              propertyId: property.id,
              portalId: portal.id,
              externalListingId: item.result.externalListingId || null,
              portalUrl: item.result.portalUrl || null,
              status: 'PUBLISHED',
              publishedAt: new Date(),
              lastSyncedAt: new Date(),
            },
          });

          results.push({
            portal: item.portal,
            success: true,
            message: `${portal.name} portalina basariyla yayinlandi`,
            externalId: item.result.externalListingId,
            portalUrl: item.result.portalUrl,
          });
        } else {
          await prisma.portalListing.upsert({
            where: {
              propertyId_portalId: {
                propertyId: property.id,
                portalId: portal.id,
              },
            },
            update: {
              status: 'REJECTED',
              errorMessage: item.result.error || 'Bilinmeyen hata',
              lastSyncedAt: new Date(),
            },
            create: {
              propertyId: property.id,
              portalId: portal.id,
              status: 'REJECTED',
              errorMessage: item.result.error || 'Bilinmeyen hata',
            },
          });

          results.push({
            portal: item.portal,
            success: false,
            message: `${portal.name} portalina gonderme basarisiz: ${item.result.error}`,
          });
        }
      } catch (dbError) {
        logger.error(`Portal kayit hatasi (${item.portal}):`, dbError);
        results.push({
          portal: item.portal,
          success: false,
          message: `${portal.name} veritabani kaydi basarisiz`,
        });
      }
    }

    logger.info(
      `Portal yayinlama tamamlandi: ilan ${property.id}, ${syndicationResult.successCount} basarili, ${syndicationResult.failureCount} basarisiz`
    );

    return {
      propertyId: property.id,
      results,
      successCount: syndicationResult.successCount,
      failureCount: syndicationResult.failureCount,
    };
  }

  /**
   * Sync all active portal listings - update view/favorite counts from portals.
   */
  async syncAllPortals() {
    const activeListings = await prisma.portalListing.findMany({
      where: {
        status: 'PUBLISHED',
        externalListingId: { not: null },
        portal: { isActive: true },
      },
      include: {
        portal: { select: { slug: true, name: true } },
      },
    });

    if (activeListings.length === 0) {
      return {
        message: 'Senkronize edilecek aktif ilan bulunamadi',
        synced: 0,
        failed: 0,
        results: [],
      };
    }

    const engine = await this.createSyndicationEngine();

    const listingsForSync = activeListings
      .filter((l) => l.externalListingId !== null)
      .map((l) => ({
        portalSlug: l.portal.slug,
        externalId: l.externalListingId!,
      }));

    const syncResults = await engine.syncAllStats(listingsForSync);

    let synced = 0;
    let failed = 0;
    const resultDetails: Array<{ portal: string; externalId: string; success: boolean; message: string }> = [];

    for (const syncResult of syncResults) {
      const listing = activeListings.find(
        (l) => l.portal.slug === syncResult.portal && l.externalListingId === syncResult.externalId
      );

      if (!listing) continue;

      if (syncResult.result.success) {
        await prisma.portalListing.update({
          where: { id: listing.id },
          data: {
            viewsCount: syncResult.result.viewsCount ?? listing.viewsCount,
            favoritesCount: syncResult.result.favoritesCount ?? listing.favoritesCount,
            lastSyncedAt: new Date(),
            status: syncResult.result.status || listing.status,
          },
        });
        synced++;
        resultDetails.push({
          portal: syncResult.portal,
          externalId: syncResult.externalId,
          success: true,
          message: 'Senkronize edildi',
        });
      } else {
        failed++;
        resultDetails.push({
          portal: syncResult.portal,
          externalId: syncResult.externalId,
          success: false,
          message: syncResult.result.error || 'Senkronizasyon hatasi',
        });
      }
    }

    logger.info(`Portal senkronizasyonu tamamlandi: ${synced} basarili, ${failed} basarisiz`);

    return {
      message: `Senkronizasyon tamamlandi`,
      synced,
      failed,
      results: resultDetails,
    };
  }

  /**
   * Remove a listing from a specific portal.
   */
  async removeListing(portalId: string, listingId: string) {
    const listing = await prisma.portalListing.findFirst({
      where: { id: listingId, portalId },
      include: { portal: true },
    });

    if (!listing) {
      throw NotFoundError('Portal ilani');
    }

    // Try to remove from external portal if we have an external ID
    if (listing.externalListingId) {
      try {
        const engine = await this.createSyndicationEngine();
        await engine.removeFromAll([
          { portalSlug: listing.portal.slug, externalId: listing.externalListingId },
        ]);
      } catch (error) {
        logger.warn(`Dis portaldan silme basarisiz (${listing.portal.name}): ${error}`);
      }
    }

    // Remove from our DB
    await prisma.portalListing.delete({ where: { id: listingId } });

    logger.info(`Portal ilani silindi: ${listingId} (portal: ${listing.portal.name})`);

    return { message: `${listing.portal.name} portalindan ilan basariyla kaldirildi` };
  }

  /**
   * Get aggregate performance stats across all portals.
   */
  async getPortalStats() {
    const portals = await prisma.portal.findMany({
      orderBy: { name: 'asc' },
    });

    const stats = await Promise.all(
      portals.map(async (portal) => {
        const aggregates = await prisma.portalListing.aggregate({
          where: { portalId: portal.id },
          _sum: {
            viewsCount: true,
            favoritesCount: true,
          },
          _count: true,
        });

        const publishedCount = await prisma.portalListing.count({
          where: { portalId: portal.id, status: 'PUBLISHED' },
        });

        const pendingCount = await prisma.portalListing.count({
          where: { portalId: portal.id, status: 'PENDING' },
        });

        const rejectedCount = await prisma.portalListing.count({
          where: { portalId: portal.id, status: 'REJECTED' },
        });

        return {
          portalId: portal.id,
          portalName: portal.name,
          portalSlug: portal.slug,
          isActive: portal.isActive,
          totalListings: aggregates._count,
          publishedListings: publishedCount,
          pendingListings: pendingCount,
          rejectedListings: rejectedCount,
          totalViews: aggregates._sum.viewsCount || 0,
          totalFavorites: aggregates._sum.favoritesCount || 0,
        };
      })
    );

    // Overall totals
    const totals = stats.reduce(
      (acc, s) => ({
        totalListings: acc.totalListings + s.totalListings,
        totalViews: acc.totalViews + s.totalViews,
        totalFavorites: acc.totalFavorites + s.totalFavorites,
        publishedListings: acc.publishedListings + s.publishedListings,
      }),
      { totalListings: 0, totalViews: 0, totalFavorites: 0, publishedListings: 0 }
    );

    return {
      portals: stats,
      totals,
    };
  }
}

export const portalsService = new PortalsService();
