import { logger } from '../../backend/utils/logger.js';

export interface PortalProperty {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP';
  listingType: 'SALE' | 'RENT';
  propertyType: string;
  il: string;
  ilce: string;
  mahalle: string;
  address: string;
  latitude?: number;
  longitude?: number;
  grossSqm: number;
  netSqm: number;
  roomCount: string;
  bathroomCount: number;
  floorNumber: number;
  totalFloors: number;
  buildingAge: number;
  heatingType: string;
  deedType: string;
  hasIskan: boolean;
  hasDask: boolean;
  isFurnished: boolean;
  duesAmount?: number;
  features: string[];
  photos: Array<{ url: string; order: number; iscover: boolean }>;
}

export interface PortalListingResult {
  success: boolean;
  externalListingId?: string;
  portalUrl?: string;
  error?: string;
}

export interface PortalSyncResult {
  success: boolean;
  viewsCount?: number;
  favoritesCount?: number;
  status?: string;
  error?: string;
}

export abstract class BasePortalAdapter {
  protected name: string;
  protected apiKey: string;
  protected apiSecret: string;
  protected baseUrl: string;

  constructor(name: string, baseUrl: string, apiKey: string, apiSecret: string) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  abstract publishListing(property: PortalProperty): Promise<PortalListingResult>;
  abstract updateListing(externalId: string, property: PortalProperty): Promise<PortalListingResult>;
  abstract removeListing(externalId: string): Promise<PortalListingResult>;
  abstract syncListingStats(externalId: string): Promise<PortalSyncResult>;
  abstract getCategories(): Promise<Array<{ id: string; name: string }>>;

  protected abstract mapPropertyType(type: string): string;
  protected abstract mapHeatingType(type: string): string;

  protected log(message: string, data?: any): void {
    logger.info(`[${this.name}] ${message}`, data);
  }

  protected logError(message: string, error?: any): void {
    logger.error(`[${this.name}] ${message}`, error);
  }
}
