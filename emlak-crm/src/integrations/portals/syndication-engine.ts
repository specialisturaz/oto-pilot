import { BasePortalAdapter, PortalProperty, PortalListingResult, PortalSyncResult } from './base-portal.js';
import { SahibindenAdapter } from './sahibinden.js';
import { HepsiemlakAdapter } from './hepsiemlak.js';
import { EmlakjetAdapter } from './emlakjet.js';
import { logger } from '../../backend/utils/logger.js';

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

    logger.info(`Syndication engine initialized with ${this.adapters.size} portal(s)`);
  }

  async publishToAll(property: PortalProperty, portalSlugs?: string[]): Promise<SyndicationResult> {
    const targetAdapters = portalSlugs
      ? portalSlugs
          .map(slug => ({ slug, adapter: this.adapters.get(slug) }))
          .filter((item): item is { slug: string; adapter: BasePortalAdapter } => !!item.adapter)
      : Array.from(this.adapters.entries()).map(([slug, adapter]) => ({ slug, adapter }));

    const results = await Promise.allSettled(
      targetAdapters.map(async ({ slug, adapter }) => ({
        portal: slug,
        result: await adapter.publishListing(property),
      }))
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

    logger.info(`Syndication complete for property ${property.id}: ${successCount} success, ${failureCount} failed`);

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
    const results = await Promise.allSettled(
      externalIds.map(async ({ portalSlug, externalId }) => {
        const adapter = this.adapters.get(portalSlug);
        if (!adapter) {
          return {
            portal: portalSlug,
            result: { success: false, error: 'Portal adaptörü bulunamadı' } as PortalListingResult,
          };
        }
        return {
          portal: portalSlug,
          result: await adapter.updateListing(externalId, property),
        };
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
    const results = await Promise.allSettled(
      externalIds.map(async ({ portalSlug, externalId }) => {
        const adapter = this.adapters.get(portalSlug);
        if (!adapter) {
          return {
            portal: portalSlug,
            result: { success: false, error: 'Portal adaptörü bulunamadı' } as PortalListingResult,
          };
        }
        return {
          portal: portalSlug,
          result: await adapter.removeListing(externalId),
        };
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

  async syncAllStats(
    listings: Array<{ portalSlug: string; externalId: string }>
  ): Promise<Array<{ portal: string; externalId: string; result: PortalSyncResult }>> {
    const results = await Promise.allSettled(
      listings.map(async ({ portalSlug, externalId }) => {
        const adapter = this.adapters.get(portalSlug);
        if (!adapter) {
          return {
            portal: portalSlug,
            externalId,
            result: { success: false, error: 'Portal adaptörü bulunamadı' } as PortalSyncResult,
          };
        }
        return {
          portal: portalSlug,
          externalId,
          result: await adapter.syncListingStats(externalId),
        };
      })
    );

    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return {
        portal: listings[i].portalSlug,
        externalId: listings[i].externalId,
        result: { success: false, error: String(r.reason) } as PortalSyncResult,
      };
    });
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
        logger.warn(`Unknown portal adapter: ${config.slug}`);
        return null;
    }
  }
}
