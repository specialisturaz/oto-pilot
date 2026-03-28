import {
  BasePortalAdapter,
  PortalProperty,
  PortalListingResult,
  PortalSyncResult,
} from './base-portal.js';

const EMLAKJET_TYPE_MAP: Record<string, string> = {
  APARTMENT: 'flat',
  VILLA: 'villa',
  DETACHED: 'detached-house',
  RESIDENCE: 'residence',
  OFFICE: 'office',
  SHOP: 'shop',
  STORE: 'warehouse',
  WAREHOUSE: 'warehouse',
  LAND: 'land',
  ZONED_LAND: 'land',
  FIELD: 'farmland',
};

const EMLAKJET_HEATING_MAP: Record<string, string> = {
  CENTRAL: 'central',
  INDIVIDUAL_NATURAL_GAS: 'natural-gas',
  COMBI: 'combi',
  STOVE: 'stove',
  FLOOR_HEATING: 'underfloor',
  AIR_CONDITIONER: 'air-conditioning',
  NONE: 'none',
};

export class EmlakjetAdapter extends BasePortalAdapter {
  constructor(apiKey: string) {
    super('Emlakjet', 'https://api.emlakjet.com/v2', apiKey, '');
  }

  async publishListing(property: PortalProperty): Promise<PortalListingResult> {
    try {
      const payload = this.mapToEmlakjetFormat(property);

      this.log('Publishing to Emlakjet', { propertyId: property.id });

      const response = await fetch(`${this.baseUrl}/listings`, {
        method: 'POST',
        headers: {
          'X-Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logError('Emlakjet publish failed', error);
        return { success: false, error: `Emlakjet hata: ${response.status}` };
      }

      const result = await response.json() as Record<string, any>;
      return {
        success: true,
        externalListingId: result.data?.id,
        portalUrl: result.data?.url,
      };
    } catch (error) {
      this.logError('Emlakjet publish error', error);
      return { success: false, error: String(error) };
    }
  }

  async updateListing(externalId: string, property: PortalProperty): Promise<PortalListingResult> {
    try {
      const payload = this.mapToEmlakjetFormat(property);

      const response = await fetch(`${this.baseUrl}/listings/${externalId}`, {
        method: 'PATCH',
        headers: {
          'X-Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return { success: false, error: `Güncelleme hatası: ${response.status}` };
      }

      return { success: true, externalListingId: externalId };
    } catch (error) {
      this.logError('Emlakjet update error', error);
      return { success: false, error: String(error) };
    }
  }

  async removeListing(externalId: string): Promise<PortalListingResult> {
    try {
      const response = await fetch(`${this.baseUrl}/listings/${externalId}`, {
        method: 'DELETE',
        headers: { 'X-Api-Key': this.apiKey },
      });

      if (!response.ok) {
        return { success: false, error: `Silme hatası: ${response.status}` };
      }

      return { success: true, externalListingId: externalId };
    } catch (error) {
      this.logError('Emlakjet remove error', error);
      return { success: false, error: String(error) };
    }
  }

  async syncListingStats(externalId: string): Promise<PortalSyncResult> {
    try {
      const response = await fetch(`${this.baseUrl}/listings/${externalId}/analytics`, {
        headers: { 'X-Api-Key': this.apiKey },
      });

      if (!response.ok) {
        return { success: false, error: `İstatistik hatası: ${response.status}` };
      }

      const data = await response.json() as Record<string, any>;
      return {
        success: true,
        viewsCount: data.data?.pageViews || 0,
        favoritesCount: data.data?.favoriteCount || 0,
        status: data.data?.status,
      };
    } catch (error) {
      this.logError('Emlakjet stats error', error);
      return { success: false, error: String(error) };
    }
  }

  async getCategories(): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/categories`, {
        headers: { 'X-Api-Key': this.apiKey },
      });

      if (!response.ok) return [];

      const data = await response.json() as Record<string, any>;
      return data.data || [];
    } catch {
      return [];
    }
  }

  protected mapPropertyType(type: string): string {
    return EMLAKJET_TYPE_MAP[type] || 'flat';
  }

  protected mapHeatingType(type: string): string {
    return EMLAKJET_HEATING_MAP[type] || 'not-specified';
  }

  private mapToEmlakjetFormat(property: PortalProperty): Record<string, any> {
    return {
      title: property.title,
      description: property.description,
      price: property.price,
      currency: property.currency,
      propertyType: this.mapPropertyType(property.propertyType),
      tradeType: property.listingType === 'SALE' ? 'sale' : 'rent',
      location: {
        province: property.il,
        district: property.ilce,
        neighborhood: property.mahalle,
        address: property.address,
        latitude: property.latitude,
        longitude: property.longitude,
      },
      specs: {
        grossArea: property.grossSqm,
        netArea: property.netSqm,
        rooms: property.roomCount,
        bathrooms: property.bathroomCount,
        floor: property.floorNumber,
        totalFloors: property.totalFloors,
        age: property.buildingAge,
        heating: this.mapHeatingType(property.heatingType),
        furnished: property.isFurnished,
        deedType: property.deedType,
        monthlyDues: property.duesAmount,
      },
      amenities: property.features,
      media: property.photos.map(p => ({
        type: 'image',
        url: p.url,
        position: p.order,
        isPrimary: p.iscover,
      })),
    };
  }
}
