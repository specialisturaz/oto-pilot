import { BasePortalAdapter, PortalProperty, PortalListingResult, PortalSyncResult } from './base-portal.js';
import { SahibindenAdapter } from './sahibinden.js';
import { HepsiemlakAdapter } from './hepsiemlak.js';
import { EmlakjetAdapter } from './emlakjet.js';
import logger from '../../backend/utils/logger.js';

interface SyndicationResult {
  propertyId: string;
  results: Array<{
    portal: string;
    result: PortalListingResult;
  }>;
  successCount: number;
  failureCount: number;
}

interface PortalConfig {
  name: string;
  slug: string;
  apiKey: string;
  apiSecret?: string;
  isActive: boolean;
}

interface TestConnectionResult {
  success: boolean;
  portal: string;
  responseTimeMs?: number;
  error?: string;
}

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

/**
 * Retry an async function with exponential backoff.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        logger.warn(
          `[SyndicationEngine] ${label} - deneme ${attempt + 1}/${maxRetries + 1} basarisiz, ${delay}ms sonra tekrar deneniyor`,
          { error: String(error) }
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(`[SyndicationEngine] ${label} - tum denemeler basarisiz`, { error: String(lastError) });
  throw lastError;
}

export class SyndicationEngine {
  private adapters: Map<string, BasePortalAdapter> = new Map();

  constructor(portalConfigs: PortalConfig[]) {
    for (const config of portalConfigs) {
      if (!config.isActive) continue;

      const adapter = this.createAdapter(config);
      if (adapter) {
        this.adapters.set(config.slug, adapter);
      }
    }

    logger.info(`[SyndicationEngine] ${this.adapters.size} portal ile baslatildi`);
  }

  /**
   * Test connection to a specific portal by attempting to fetch categories.
   */
  async testConnection(portalSlug: string): Promise<TestConnectionResult> {
    const adapter = this.adapters.get(portalSlug);

    if (!adapter) {
      return {
        success: false,
        portal: portalSlug,
        error: `${portalSlug} portal adaptoru bulunamadi veya aktif degil`,
      };
    }

    const startTime = Date.now();

    try {
      logger.info(`[SyndicationEngine] Baglanti testi baslatiliyor: ${portalSlug}`);

      // Use getCategories as a lightweight health-check call
      const categories = await withRetry(
        () => adapter.getCategories(),
        `testConnection(${portalSlug})`,
        1 // Only 1 retry for test connection
      );

      const responseTimeMs = Date.now() - startTime;

      logger.info(
        `[SyndicationEngine] Baglanti testi basarili: ${portalSlug} (${responseTimeMs}ms, ${categories.length} kategori)`
      );

      return {
        success: true,
        portal: portalSlug,
        responseTimeMs,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;

      logger.error(`[SyndicationEngine] Baglanti testi basarisiz: ${portalSlug} (${responseTimeMs}ms)`, {
        error: String(error),
      });

      return {
        success: false,
        portal: portalSlug,
        responseTimeMs,
        error: String(error),
      };
    }
  }

  async publishToAll(property: PortalProperty, portalSlugs?: string[]): Promise<SyndicationResult> {
    const targetAdapters = portalSlugs
      ? portalSlugs
          .map(slug => ({ slug, adapter: this.adapters.get(slug) }))
          .filter((item): item is { slug: string; adapter: BasePortalAdapter } => !!item.adapter)
      : Array.from(this.adapters.entries()).map(([slug, adapter]) => ({ slug, adapter }));

    logger.info(
      `[SyndicationEngine] Yayinlama baslatiliyor: ilan ${property.id}, portaller: ${targetAdapters.map((a) => a.slug).join(', ')}`
    );

    const results = await Promise.allSettled(
      targetAdapters.map(async ({ slug, adapter }) => {
        logger.info(`[SyndicationEngine] ${slug} portalina gonderiliyor: ilan ${property.id}`);

        const result = await withRetry(
          () => adapter.publishListing(property),
          `publishListing(${slug}, ${property.id})`
        );

        if (result.success) {
          logger.info(`[SyndicationEngine] ${slug} yayinlama basarili: ilan ${property.id}, dis ID: ${result.externalListingId}`);
        } else {
          logger.warn(`[SyndicationEngine] ${slug} yayinlama basarisiz: ilan ${property.id}, hata: ${result.error}`);
        }

        return { portal: slug, result };
      })
    );

    const processedResults = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return {
        portal: targetAdapters[i].slug,
        result: { success: false, error: String(r.reason) } as PortalListingResult,
      };
    });

    const successCount = processedResults.filter(r => r.result.success).length;
    const failureCount = processedResults.length - successCount;

    logger.info(
      `[SyndicationEngine] Yayinlama tamamlandi: ilan ${property.id}, ${successCount} basarili, ${failureCount} basarisiz`
    );

    return {
      propertyId: property.id,
      results: processedResults,
      successCount,
      failureCount,
    };
  }

  async updateOnAll(
    externalIds: Array<{ portalSlug: string; externalId: string }>,
    property: PortalProperty
  ): Promise<SyndicationResult> {
    logger.info(`[SyndicationEngine] Toplu guncelleme baslatiliyor: ilan ${property.id}`);

    const results = await Promise.allSettled(
      externalIds.map(async ({ portalSlug, externalId }) => {
        const adapter = this.adapters.get(portalSlug);
        if (!adapter) {
          return {
            portal: portalSlug,
            result: { success: false, error: 'Portal adaptoru bulunamadi' } as PortalListingResult,
          };
        }

        const result = await withRetry(
          () => adapter.updateListing(externalId, property),
          `updateListing(${portalSlug}, ${externalId})`
        );

        return { portal: portalSlug, result };
      })
    );

    const processedResults = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return {
        portal: externalIds[i].portalSlug,
        result: { success: false, error: String(r.reason) } as PortalListingResult,
      };
    });

    const successCount = processedResults.filter(r => r.result.success).length;

    logger.info(
      `[SyndicationEngine] Toplu guncelleme tamamlandi: ilan ${property.id}, ${successCount}/${processedResults.length} basarili`
    );

    return {
      propertyId: property.id,
      results: processedResults,
      successCount,
      failureCount: processedResults.length - successCount,
    };
  }

  async removeFromAll(
    externalIds: Array<{ portalSlug: string; externalId: string }>
  ): Promise<Array<{ portal: string; result: PortalListingResult }>> {
    logger.info(`[SyndicationEngine] Toplu silme baslatiliyor: ${externalIds.length} ilan`);

    const results = await Promise.allSettled(
      externalIds.map(async ({ portalSlug, externalId }) => {
        const adapter = this.adapters.get(portalSlug);
        if (!adapter) {
          return {
            portal: portalSlug,
            result: { success: false, error: 'Portal adaptoru bulunamadi' } as PortalListingResult,
          };
        }

        const result = await withRetry(
          () => adapter.removeListing(externalId),
          `removeListing(${portalSlug}, ${externalId})`
        );

        return { portal: portalSlug, result };
      })
    );

    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return {
        portal: externalIds[i].portalSlug,
        result: { success: false, error: String(r.reason) } as PortalListingResult,
      };
    });
  }

  /**
   * Sync stats for all listings. Updates view/favorite counts from external portals.
   */
  async syncAllStats(
    listings: Array<{ portalSlug: string; externalId: string }>
  ): Promise<Array<{ portal: string; externalId: string; result: PortalSyncResult }>> {
    logger.info(`[SyndicationEngine] Istatistik senkronizasyonu baslatiliyor: ${listings.length} ilan`);

    const results = await Promise.allSettled(
      listings.map(async ({ portalSlug, externalId }) => {
        const adapter = this.adapters.get(portalSlug);
        if (!adapter) {
          return {
            portal: portalSlug,
            externalId,
            result: { success: false, error: 'Portal adaptoru bulunamadi' } as PortalSyncResult,
          };
        }

        const result = await withRetry(
          () => adapter.syncListingStats(externalId),
          `syncListingStats(${portalSlug}, ${externalId})`,
          2 // 2 retries for sync
        );

        return { portal: portalSlug, externalId, result };
      })
    );

    const processedResults = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return {
        portal: listings[i].portalSlug,
        externalId: listings[i].externalId,
        result: { success: false, error: String(r.reason) } as PortalSyncResult,
      };
    });

    const successCount = processedResults.filter((r) => r.result.success).length;
    logger.info(
      `[SyndicationEngine] Istatistik senkronizasyonu tamamlandi: ${successCount}/${processedResults.length} basarili`
    );

    return processedResults;
  }

  getActivePortals(): string[] {
    return Array.from(this.adapters.keys());
  }

  private createAdapter(config: PortalConfig): BasePortalAdapter | null {
    switch (config.slug) {
      case 'sahibinden':
        return new SahibindenAdapter(config.apiKey, config.apiSecret || '');
      case 'hepsiemlak':
        return new HepsiemlakAdapter(config.apiKey);
      case 'emlakjet':
        return new EmlakjetAdapter(config.apiKey);
      default:
        logger.warn(`[SyndicationEngine] Bilinmeyen portal adaptoru: ${config.slug}`);
        return null;
    }
  }
}
