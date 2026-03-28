import {
  BasePortalAdapter,
  PortalProperty,
  PortalListingResult,
  PortalSyncResult,
} from './base-portal.js';

const HEPSIEMLAK_TYPE_MAP: Record<string, string> = {
  APARTMENT: 'daire',
  VILLA: 'villa',
  DETACHED: 'mustakil',
  RESIDENCE: 'rezidans',
  OFFICE: 'is-yeri',
  SHOP: 'dukkan',
  LAND: 'arsa',
  ZONED_LAND: 'arsa',
  FIELD: 'tarla',
};

const HEPSIEMLAK_HEATING_MAP: Record<string, string> = {
  CENTRAL: 'merkezi-sistem',
  INDIVIDUAL_NATURAL_GAS: 'kombi-dogalgaz',
  COMBI: 'kombi-dogalgaz',
  STOVE: 'soba',
  FLOOR_HEATING: 'yerden-isitma',
  AIR_CONDITIONER: 'klima',
  NONE: 'yok',
};

export class HepsiemlakAdapter extends BasePortalAdapter {
  constructor(apiKey: string) {
    super('Hepsiemlak', 'https://api.hepsiemlak.com/v1', apiKey, '');
  }

  async publishListing(property: PortalProperty): Promise<PortalListingResult> {
    try {
      const payload = this.mapToHepsiemlakFormat(property);

      this.log('Publishing to Hepsiemlak', { propertyId: property.id });

      const response = await fetch(`${this.baseUrl}/listings`, {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logError('Hepsiemlak publish failed', error);
        return { success: false, error: `Hepsiemlak hata: ${response.status}` };
      }

      const result = await response.json() as Record<string, any>;
      return {
        success: true,
        externalListingId: result.id,
        portalUrl: result.url || `https://www.hepsiemlak.com/ilan/${result.id}`,
      };
    } catch (error) {
      this.logError('Hepsiemlak publish error', error);
      return { success: false, error: String(error) };
    }
  }

  async updateListing(externalId: string, property: PortalProperty): Promise<PortalListingResult> {
    try {
      const payload = this.mapToHepsiemlakFormat(property);

      const response = await fetch(`${this.baseUrl}/listings/${externalId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `ApiKey ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return { success: false, error: `Güncelleme hatası: ${response.status}` };
      }

      return {
        success: true,
        externalListingId: externalId,
      };
    } catch (error) {
      this.logError('Hepsiemlak update error', error);
      return { success: false, error: String(error) };
    }
  }

  async removeListing(externalId: string): Promise<PortalListingResult> {
    try {
      const response = await fetch(`${this.baseUrl}/listings/${externalId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `ApiKey ${this.apiKey}` },
      });

      if (!response.ok) {
        return { success: false, error: `Silme hatası: ${response.status}` };
      }

      return { success: true, externalListingId: externalId };
    } catch (error) {
      this.logError('Hepsiemlak remove error', error);
      return { success: false, error: String(error) };
    }
  }

  async syncListingStats(externalId: string): Promise<PortalSyncResult> {
    try {
      const response = await fetch(`${this.baseUrl}/listings/${externalId}/statistics`, {
        headers: { 'Authorization': `ApiKey ${this.apiKey}` },
      });

      if (!response.ok) {
        return { success: false, error: `İstatistik hatası: ${response.status}` };
      }

      const data = await response.json() as Record<string, any>;
      return {
        success: true,
        viewsCount: data.views || 0,
        favoritesCount: data.favorites || 0,
        status: data.listingStatus,
      };
    } catch (error) {
      this.logError('Hepsiemlak stats error', error);
      return { success: false, error: String(error) };
    }
  }

  async getCategories(): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/categories`, {
        headers: { 'Authorization': `ApiKey ${this.apiKey}` },
      });

      if (!response.ok) return [];

      const data = await response.json() as Record<string, any>;
      return data.items || [];
    } catch {
      return [];
    }
  }

  protected mapPropertyType(type: string): string {
    return HEPSIEMLAK_TYPE_MAP[type] || 'daire';
  }

  protected mapHeatingType(type: string): string {
    return HEPSIEMLAK_HEATING_MAP[type] || 'belirtilmemis';
  }

  private mapToHepsiemlakFormat(property: PortalProperty): Record<string, any> {
    return {
      title: property.title,
      description: property.description,
      price: { amount: property.price, currency: property.currency },
      category: this.mapPropertyType(property.propertyType),
      tradeType: property.listingType === 'SALE' ? 'satilik' : 'kiralik',
      location: {
        city: property.il,
        county: property.ilce,
        district: property.mahalle,
        address: property.address,
        coordinates: property.latitude && property.longitude
          ? { lat: property.latitude, lng: property.longitude }
          : undefined,
      },
      attributes: {
        grossArea: property.grossSqm,
        netArea: property.netSqm,
        roomCount: property.roomCount,
        bathroomCount: property.bathroomCount,
        floor: property.floorNumber,
        totalFloors: property.totalFloors,
        buildingAge: property.buildingAge,
        heatingType: this.mapHeatingType(property.heatingType),
        furnished: property.isFurnished,
        deedStatus: property.deedType,
        dues: property.duesAmount,
        hasIskan: property.hasIskan,
      },
      features: property.features,
      images: property.photos.map(p => ({
        url: p.url,
        order: p.order,
        isCover: p.iscover,
      })),
    };
  }
}
