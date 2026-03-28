# Portal Synchronization Skill

Agents reference this document when implementing or reviewing portal integration code. The Emlak CRM synchronizes property listings with major Turkish real estate portals.

---

## 1. Portal Overview

| Portal | Integration Type | Rate Limit | Priority |
|---|---|---|---|
| Sahibinden.com | XML Feed (push) | 1 feed/5min | P0 (highest traffic) |
| Hepsiemlak.com | REST API | 60 req/min | P1 |
| Emlakjet.com | REST API | 30 req/min | P1 |
| Zingat.com | REST API | 30 req/min | P2 |
| Endeksa.com | REST API | 20 req/min | P3 |

---

## 2. Sahibinden.com XML Feed Patterns

Sahibinden uses an XML feed model where the CRM generates a complete XML document of all active listings, and Sahibinden periodically pulls it.

### Feed Generation
```typescript
// integrations/sahibinden/xml-generator.ts

import { XMLBuilder } from 'fast-xml-parser';
import type { Property } from '@prisma/client';

interface SahibindenListing {
  '@_id': string;
  category: string;
  title: string;
  description: string;
  price: {
    amount: number;
    currency: 'TL' | 'USD' | 'EUR';
  };
  location: {
    il: string;
    ilce: string;
    mahalle?: string;
    latitude?: number;
    longitude?: number;
  };
  details: {
    metreKare?: number;
    odaSayisi?: string;     // "3+1" format
    binaYasi?: number;
    kat?: string;           // "4/10" format
    isitma?: string;
    banyo?: number;
    balkon?: boolean;
    esyali?: boolean;
    tapuDurumu?: string;
    aidat?: number;
  };
  images: {
    image: { '@_url': string; '@_order': number }[];
  };
  agent: {
    name: string;
    phone: string;
    email: string;
  };
  status: 'active' | 'passive' | 'sold';
  updatedAt: string;
}

export function generateSahibindenFeed(
  properties: PropertyWithRelations[],
  officeInfo: OfficeInfo,
): string {
  const listings: SahibindenListing[] = properties.map((prop) =>
    mapPropertyToSahibinden(prop),
  );

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    declaration: {
      include: true,
      encoding: 'UTF-8',
    },
  });

  const feed = {
    feed: {
      '@_version': '2.0',
      '@_xmlns': 'http://www.sahibinden.com/feed',
      office: {
        name: officeInfo.name,
        phone: officeInfo.phone,
        email: officeInfo.email,
        city: officeInfo.il,
      },
      listings: {
        listing: listings,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        totalListings: listings.length,
      },
    },
  };

  return builder.build(feed);
}

function mapPropertyToSahibinden(prop: PropertyWithRelations): SahibindenListing {
  return {
    '@_id': prop.id,
    category: mapPropertyTypeToSahibindenCategory(prop.propertyType),
    title: prop.title,
    description: prop.description || '',
    price: {
      amount: Number(prop.price),
      currency: mapCurrency(prop.currency),
    },
    location: {
      il: prop.il.name,
      ilce: prop.ilce.name,
      mahalle: prop.mahalle?.name,
      latitude: prop.latitude ?? undefined,
      longitude: prop.longitude ?? undefined,
    },
    details: {
      metreKare: prop.metreKare ?? undefined,
      odaSayisi: prop.odaSayisi ? formatOdaSayisi(prop.odaSayisi, prop.salonSayisi) : undefined,
      binaYasi: prop.binaYasi ?? undefined,
      kat: prop.kat != null && prop.toplamKat != null ? `${prop.kat}/${prop.toplamKat}` : undefined,
      aidat: prop.aidat ? Number(prop.aidat) : undefined,
    },
    images: {
      image: (prop.images || []).map((img, idx) => ({
        '@_url': img.url,
        '@_order': idx + 1,
      })),
    },
    agent: {
      name: prop.agent.name,
      phone: prop.agent.phone,
      email: prop.agent.email,
    },
    status: mapStatus(prop.status),
    updatedAt: prop.updatedAt.toISOString(),
  };
}

function mapPropertyTypeToSahibindenCategory(type: string): string {
  const categoryMap: Record<string, string> = {
    DAIRE: 'konut-satilik-daire',
    VILLA: 'konut-satilik-villa',
    MUSTAKIL_EV: 'konut-satilik-mustakil-ev',
    ARSA: 'arsa-satilik',
    ISYERI: 'isyeri-satilik',
    OFIS: 'isyeri-satilik-ofis',
  };
  return categoryMap[type] || 'konut-satilik-daire';
}

function mapCurrency(currency: string): 'TL' | 'USD' | 'EUR' {
  if (currency === 'TRY') return 'TL';
  if (currency === 'USD') return 'USD';
  if (currency === 'EUR') return 'EUR';
  return 'TL';
}

function formatOdaSayisi(oda: number, salon?: number | null): string {
  return salon ? `${oda}+${salon}` : `${oda}`;
}

function mapStatus(status: string): 'active' | 'passive' | 'sold' {
  if (status === 'ACTIVE') return 'active';
  if (status === 'SOLD' || status === 'RENTED') return 'sold';
  return 'passive';
}
```

### Feed Endpoint
```typescript
// routes/portal-routes.ts
router.get(
  '/feeds/sahibinden/:officeId.xml',
  authenticatePortalToken, // API key-based auth for portals
  async (req, res) => {
    const { officeId } = req.params;
    const xml = await portalService.generateSahibindenFeed(officeId);

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300'); // 5 min cache
    res.send(xml);
  },
);
```

### Feed Validation Checklist
- [ ] UTF-8 encoding for Turkish characters.
- [ ] All images are publicly accessible URLs (no localhost).
- [ ] Phone numbers in +90XXXXXXXXXX format.
- [ ] Prices are numeric (no formatting, no currency symbol in the number).
- [ ] Category codes match Sahibinden's category taxonomy.
- [ ] Maximum 20 images per listing.
- [ ] Description is plain text (no HTML tags).

---

## 3. Hepsiemlak REST API Patterns

Hepsiemlak provides a REST API for CRUD operations on listings.

### Adapter Structure
```typescript
// integrations/hepsiemlak/adapter.ts

import axios, { AxiosInstance } from 'axios';
import { RateLimiter } from '../common/rate-limiter';

interface HepsiemlakConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;        // https://api.hepsiemlak.com/v1
  officeExternalId: string;
}

export class HepsiemlakAdapter {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;

  constructor(private config: HepsiemlakConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'X-API-Secret': config.apiSecret,
        'Content-Type': 'application/json',
        'Accept-Language': 'tr',
      },
      timeout: 30000,
    });

    this.rateLimiter = new RateLimiter({
      maxRequests: 60,
      windowMs: 60 * 1000,
    });

    this.setupInterceptors();
  }

  async publishListing(property: PortalListingPayload): Promise<PortalPublishResult> {
    await this.rateLimiter.acquire();

    const payload = this.mapToHepsiemlakFormat(property);

    try {
      const response = await this.client.post('/listings', payload);
      return {
        success: true,
        externalId: response.data.id,
        portalUrl: response.data.url,
        publishedAt: new Date().toISOString(),
      };
    } catch (error) {
      return this.handlePortalError('publish', property.id, error);
    }
  }

  async updateListing(externalId: string, property: PortalListingPayload): Promise<PortalUpdateResult> {
    await this.rateLimiter.acquire();

    const payload = this.mapToHepsiemlakFormat(property);

    try {
      const response = await this.client.put(`/listings/${externalId}`, payload);
      return {
        success: true,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      return this.handlePortalError('update', externalId, error);
    }
  }

  async removeListing(externalId: string): Promise<PortalRemoveResult> {
    await this.rateLimiter.acquire();

    try {
      await this.client.delete(`/listings/${externalId}`);
      return { success: true, removedAt: new Date().toISOString() };
    } catch (error) {
      return this.handlePortalError('remove', externalId, error);
    }
  }

  async getListingStatus(externalId: string): Promise<PortalListingStatus> {
    await this.rateLimiter.acquire();

    const response = await this.client.get(`/listings/${externalId}/status`);
    return {
      externalId,
      status: response.data.status,
      views: response.data.views,
      favorites: response.data.favorites,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  private mapToHepsiemlakFormat(property: PortalListingPayload): HepsiemlakListingPayload {
    return {
      baslik: property.title,
      aciklama: property.description,
      fiyat: Number(property.price),
      paraBirimi: property.currency === 'TRY' ? 'TL' : property.currency,
      emlakTipi: this.mapPropertyType(property.propertyType),
      ilanTipi: property.listingType === 'SATILIK' ? 'satilik' : 'kiralik',
      il: property.ilName,
      ilce: property.ilceName,
      mahalle: property.mahalleName,
      brut_m2: property.metreKare,
      oda_sayisi: property.odaSayisi,
      bina_yasi: property.binaYasi,
      bulundugu_kat: property.kat,
      toplam_kat: property.toplamKat,
      resimler: property.imageUrls,
    };
  }

  private setupInterceptors(): void {
    // Response interceptor for retry on 429
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
          await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
          return this.client.request(error.config);
        }
        throw error;
      },
    );
  }

  private handlePortalError(operation: string, id: string, error: unknown): any {
    const axiosError = error as any;
    const status = axiosError?.response?.status;
    const data = axiosError?.response?.data;

    return {
      success: false,
      error: {
        operation,
        listingId: id,
        httpStatus: status,
        portalMessage: data?.message || 'Unknown portal error',
        timestamp: new Date().toISOString(),
      },
    };
  }

  private mapPropertyType(type: string): string {
    const map: Record<string, string> = {
      DAIRE: 'daire',
      VILLA: 'villa',
      MUSTAKIL_EV: 'mustakil',
      ARSA: 'arsa',
      ISYERI: 'dukkan',
    };
    return map[type] || 'daire';
  }
}
```

---

## 4. Emlakjet API Patterns

Emlakjet follows a similar REST pattern to Hepsiemlak but with different field mappings.

### Adapter Structure
```typescript
// integrations/emlakjet/adapter.ts

export class EmlakjetAdapter {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;

  constructor(private config: EmlakjetConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl, // https://api.emlakjet.com/v2
      headers: {
        'X-Api-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.rateLimiter = new RateLimiter({
      maxRequests: 30,
      windowMs: 60 * 1000,
    });
  }

  async publishListing(property: PortalListingPayload): Promise<PortalPublishResult> {
    await this.rateLimiter.acquire();

    const payload = this.mapToEmlakjetFormat(property);

    try {
      const response = await this.client.post('/adverts', payload);
      return {
        success: true,
        externalId: response.data.advert_id,
        portalUrl: response.data.url,
        publishedAt: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError('publish', property.id, error);
    }
  }

  // updateListing, removeListing, getListingStatus follow the same pattern as Hepsiemlak

  private mapToEmlakjetFormat(property: PortalListingPayload): EmlakjetAdvertPayload {
    return {
      title: property.title,
      description: property.description,
      price: Number(property.price),
      currency: property.currency === 'TRY' ? 'TRY' : property.currency,
      category_id: this.getCategoryId(property.propertyType, property.listingType),
      city: property.ilName,
      county: property.ilceName,
      district: property.mahalleName,
      gross_area: property.metreKare,
      room_count: property.odaSayisi,
      building_age: property.binaYasi,
      floor: property.kat,
      total_floor: property.toplamKat,
      photos: property.imageUrls.map((url, idx) => ({
        url,
        order: idx + 1,
      })),
    };
  }

  private getCategoryId(propertyType: string, listingType: string): number {
    // Emlakjet uses numeric category IDs
    const categoryMap: Record<string, Record<string, number>> = {
      SATILIK: {
        DAIRE: 1001,
        VILLA: 1002,
        MUSTAKIL_EV: 1003,
        ARSA: 2001,
        ISYERI: 3001,
      },
      KIRALIK: {
        DAIRE: 1101,
        VILLA: 1102,
        MUSTAKIL_EV: 1103,
        ISYERI: 3101,
      },
    };
    return categoryMap[listingType]?.[propertyType] || 1001;
  }

  private handleError(operation: string, id: string, error: unknown): any {
    // Same pattern as Hepsiemlak
    const axiosError = error as any;
    return {
      success: false,
      error: {
        operation,
        listingId: id,
        httpStatus: axiosError?.response?.status,
        portalMessage: axiosError?.response?.data?.error || 'Unknown error',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
```

---

## 5. Heartbeat-Based Sync Scheduling

### Sync Scheduler
```typescript
// integrations/common/sync-scheduler.ts

import { CronJob } from 'cron';

interface SyncScheduleConfig {
  sahibinden: {
    feedGenerationCron: string;    // "*/5 * * * *" every 5 minutes
  };
  hepsiemlak: {
    fullSyncCron: string;          // "0 */2 * * *" every 2 hours
    incrementalSyncCron: string;   // "*/10 * * * *" every 10 minutes
    statusCheckCron: string;       // "0 */6 * * *" every 6 hours
  };
  emlakjet: {
    fullSyncCron: string;          // "0 */3 * * *" every 3 hours
    incrementalSyncCron: string;   // "*/15 * * * *" every 15 minutes
  };
}

export class PortalSyncScheduler {
  private jobs: CronJob[] = [];

  constructor(
    private config: SyncScheduleConfig,
    private syncService: PortalSyncService,
  ) {}

  start(): void {
    // Sahibinden feed regeneration
    this.addJob(this.config.sahibinden.feedGenerationCron, async () => {
      await this.syncService.regenerateSahibindenFeed();
    }, 'sahibinden-feed');

    // Hepsiemlak incremental sync (changed listings since last sync)
    this.addJob(this.config.hepsiemlak.incrementalSyncCron, async () => {
      await this.syncService.incrementalSync('hepsiemlak');
    }, 'hepsiemlak-incremental');

    // Hepsiemlak full reconciliation
    this.addJob(this.config.hepsiemlak.fullSyncCron, async () => {
      await this.syncService.fullSync('hepsiemlak');
    }, 'hepsiemlak-full');

    // Status checks (views, favorites)
    this.addJob(this.config.hepsiemlak.statusCheckCron, async () => {
      await this.syncService.checkStatuses('hepsiemlak');
    }, 'hepsiemlak-status');

    console.log(`Portal sync scheduler started with ${this.jobs.length} jobs`);
  }

  stop(): void {
    for (const job of this.jobs) {
      job.stop();
    }
    this.jobs = [];
  }

  private addJob(cronExpression: string, handler: () => Promise<void>, name: string): void {
    const job = new CronJob(
      cronExpression,
      async () => {
        const startTime = Date.now();
        try {
          console.log(`[PortalSync] Starting: ${name}`);
          await handler();
          console.log(`[PortalSync] Completed: ${name} (${Date.now() - startTime}ms)`);
        } catch (error) {
          console.error(`[PortalSync] Failed: ${name}`, error);
          // Log to sync_errors table for monitoring
          await this.syncService.logSyncError(name, error);
        }
      },
      null, // onComplete
      true, // start immediately
      'Europe/Istanbul',
    );
    this.jobs.push(job);
  }
}
```

### Incremental Sync Strategy
```typescript
// integrations/common/sync-service.ts

export class PortalSyncService {
  /**
   * Incremental sync: push only changes since last sync.
   * Uses the portal_sync_log table to track what was last synced.
   */
  async incrementalSync(portalName: string): Promise<SyncResult> {
    // 1. Get last successful sync timestamp
    const lastSync = await prisma.portalSyncLog.findFirst({
      where: { portal: portalName, status: 'SUCCESS' },
      orderBy: { completedAt: 'desc' },
    });

    const since = lastSync?.completedAt || new Date(0);

    // 2. Find properties changed since last sync
    const changedProperties = await prisma.property.findMany({
      where: {
        updatedAt: { gt: since },
        status: { in: ['ACTIVE', 'PASSIVE', 'SOLD'] },
      },
      include: {
        agent: true,
        il: true,
        ilce: true,
        mahalle: true,
        images: true,
        portalListings: {
          where: { portal: portalName },
        },
      },
    });

    let created = 0;
    let updated = 0;
    let removed = 0;
    let errors = 0;

    for (const property of changedProperties) {
      const existingListing = property.portalListings[0];

      try {
        if (property.status === 'ACTIVE' && !existingListing) {
          // New listing: publish
          await this.publishToPortal(portalName, property);
          created++;
        } else if (property.status === 'ACTIVE' && existingListing) {
          // Existing listing: update
          await this.updateOnPortal(portalName, existingListing.externalId, property);
          updated++;
        } else if (property.status !== 'ACTIVE' && existingListing) {
          // Deactivated: remove from portal
          await this.removeFromPortal(portalName, existingListing.externalId);
          removed++;
        }
      } catch (error) {
        errors++;
        await this.logPropertySyncError(portalName, property.id, error);
      }
    }

    // 3. Log sync result
    await prisma.portalSyncLog.create({
      data: {
        portal: portalName,
        syncType: 'INCREMENTAL',
        status: errors === 0 ? 'SUCCESS' : 'PARTIAL',
        propertiesCreated: created,
        propertiesUpdated: updated,
        propertiesRemoved: removed,
        errors,
        completedAt: new Date(),
      },
    });

    return { created, updated, removed, errors };
  }
}
```

---

## 6. Conflict Resolution for Listing Updates

When the same listing is updated both locally and on a portal:

### Strategy: Last-Write-Wins with Merge
```typescript
interface ConflictResolution {
  strategy: 'LOCAL_WINS' | 'PORTAL_WINS' | 'MERGE' | 'MANUAL';
}

// Default: LOCAL_WINS for most fields, PORTAL_WINS for status/stats
const fieldConflictStrategy: Record<string, 'LOCAL_WINS' | 'PORTAL_WINS'> = {
  title: 'LOCAL_WINS',
  description: 'LOCAL_WINS',
  price: 'LOCAL_WINS',
  images: 'LOCAL_WINS',
  status: 'LOCAL_WINS',       // CRM is source of truth for status
  views: 'PORTAL_WINS',      // Portal tracks its own view counts
  favorites: 'PORTAL_WINS',
  portalUrl: 'PORTAL_WINS',
};
```

### Conflict Detection
```typescript
async function detectConflicts(
  localProperty: Property,
  portalListing: PortalListingStatus,
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];

  // Check if portal has changes we do not know about
  if (portalListing.lastModifiedAt > localProperty.lastPortalSyncAt) {
    conflicts.push({
      field: 'general',
      localValue: localProperty.updatedAt.toISOString(),
      portalValue: portalListing.lastModifiedAt,
      resolution: 'MANUAL', // Flag for human review
    });
  }

  return conflicts;
}
```

---

## 7. Rate Limiting per Portal

### Shared Rate Limiter
```typescript
// integrations/common/rate-limiter.ts

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(private config: { maxRequests: number; windowMs: number }) {
    this.tokens = config.maxRequests;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens <= 0) {
      const waitTime = this.config.windowMs - (Date.now() - this.lastRefill);
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        this.refill();
      }
    }

    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= this.config.windowMs) {
      this.tokens = this.config.maxRequests;
      this.lastRefill = now;
    }
  }
}
```

---

## 8. Error Recovery and Retry

### Retry Strategy
```typescript
// integrations/common/retry.ts

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;
  let delay = cfg.initialDelayMs;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const status = error?.response?.status;

      // Do not retry non-retryable errors
      if (status && !cfg.retryableStatuses.includes(status)) {
        throw error;
      }

      // Do not retry on last attempt
      if (attempt === cfg.maxRetries) {
        break;
      }

      // Check for Retry-After header
      const retryAfter = error?.response?.headers?.['retry-after'];
      if (retryAfter) {
        delay = parseInt(retryAfter, 10) * 1000;
      }

      console.warn(
        `[Retry] Attempt ${attempt + 1}/${cfg.maxRetries} failed (status: ${status}), retrying in ${delay}ms`,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * cfg.backoffMultiplier, cfg.maxDelayMs);
    }
  }

  throw lastError;
}
```

### Dead Letter Queue
When a listing fails to sync after all retries, it goes into a dead letter queue for manual review:

```typescript
async function handlePermanentFailure(
  portalName: string,
  propertyId: string,
  error: Error,
): Promise<void> {
  await prisma.portalSyncDeadLetter.create({
    data: {
      portal: portalName,
      propertyId,
      errorMessage: error.message,
      errorStack: error.stack,
      attemptCount: DEFAULT_RETRY_CONFIG.maxRetries + 1,
      createdAt: new Date(),
      resolvedAt: null,
    },
  });

  // Notify the agent/manager
  await notificationService.send({
    type: 'PORTAL_SYNC_FAILURE',
    message: `Portal senkronizasyon hatasi: ${portalName} - Ilan #${propertyId}`,
    severity: 'HIGH',
  });
}
```

### Health Monitoring
```typescript
async function checkPortalHealth(portalName: string): Promise<PortalHealth> {
  const recentLogs = await prisma.portalSyncLog.findMany({
    where: {
      portal: portalName,
      completedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { completedAt: 'desc' },
    take: 10,
  });

  const failures = recentLogs.filter((l) => l.status === 'FAILED').length;
  const totalErrors = recentLogs.reduce((sum, l) => sum + l.errors, 0);

  return {
    portal: portalName,
    status: failures > 5 ? 'UNHEALTHY' : failures > 2 ? 'DEGRADED' : 'HEALTHY',
    recentSyncs: recentLogs.length,
    recentFailures: failures,
    totalErrors,
    lastSuccessfulSync: recentLogs.find((l) => l.status === 'SUCCESS')?.completedAt || null,
  };
}
```
