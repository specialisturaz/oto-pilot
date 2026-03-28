import {
  BasePortalAdapter,
  PortalProperty,
  PortalListingResult,
  PortalSyncResult,
} from './base-portal.js';

const SAHIBINDEN_PROPERTY_TYPE_MAP: Record<string, string> = {
  APARTMENT: 'daire',
  VILLA: 'villa',
  DETACHED: 'mustakil-ev',
  RESIDENCE: 'residence',
  OFFICE: 'ofis',
  SHOP: 'dukkan-magaza',
  STORE: 'depo-antrepo',
  WAREHOUSE: 'depo-antrepo',
  LAND: 'arsa',
  ZONED_LAND: 'imarli-arsa',
  FIELD: 'tarla',
  GARDEN: 'bahce',
};

const SAHIBINDEN_HEATING_MAP: Record<string, string> = {
  CENTRAL: 'merkezi',
  INDIVIDUAL_NATURAL_GAS: 'dogalgaz-kombi',
  COMBI: 'dogalgaz-kombi',
  STOVE: 'soba',
  FLOOR_HEATING: 'yerden-isitma',
  AIR_CONDITIONER: 'klima',
  NONE: 'yok',
};

export class SahibindenAdapter extends BasePortalAdapter {
  constructor(apiKey: string, apiSecret: string) {
    super('Sahibinden', 'https://api.sahibinden.com/rest', apiKey, apiSecret);
  }

  async publishListing(property: PortalProperty): Promise<PortalListingResult> {
    try {
      const listingData = this.mapToSahibindenFormat(property);

      this.log('Publishing listing to Sahibinden', { propertyId: property.id });

      // Sahibinden API integration
      // In production, this would make actual API calls
      // Sahibinden primarily uses XML feed integration
      const xmlFeed = this.generateXmlFeed(listingData);

      const response = await fetch(`${this.baseUrl}/listing/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/xml',
        },
        body: xmlFeed,
      });

      if (!response.ok) {
        const error = await response.text();
        this.logError('Sahibinden publish failed', error);
        return { success: false, error: `Sahibinden hata: ${response.status}` };
      }

      const result = await response.json() as Record<string, any>;
      return {
        success: true,
        externalListingId: result.classifiedId,
        portalUrl: `https://www.sahibinden.com/${result.classifiedId}`,
      };
    } catch (error) {
      this.logError('Sahibinden publish error', error);
      return { success: false, error: String(error) };
    }
  }

  async updateListing(externalId: string, property: PortalProperty): Promise<PortalListingResult> {
    try {
      const listingData = this.mapToSahibindenFormat(property);
      const xmlFeed = this.generateXmlFeed(listingData);

      const response = await fetch(`${this.baseUrl}/listing/${externalId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/xml',
        },
        body: xmlFeed,
      });

      if (!response.ok) {
        return { success: false, error: `Güncelleme hatası: ${response.status}` };
      }

      return {
        success: true,
        externalListingId: externalId,
        portalUrl: `https://www.sahibinden.com/${externalId}`,
      };
    } catch (error) {
      this.logError('Sahibinden update error', error);
      return { success: false, error: String(error) };
    }
  }

  async removeListing(externalId: string): Promise<PortalListingResult> {
    try {
      const response = await fetch(`${this.baseUrl}/listing/${externalId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });

      if (!response.ok) {
        return { success: false, error: `Silme hatası: ${response.status}` };
      }

      return { success: true, externalListingId: externalId };
    } catch (error) {
      this.logError('Sahibinden remove error', error);
      return { success: false, error: String(error) };
    }
  }

  async syncListingStats(externalId: string): Promise<PortalSyncResult> {
    try {
      const response = await fetch(`${this.baseUrl}/listing/${externalId}/stats`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });

      if (!response.ok) {
        return { success: false, error: `İstatistik hatası: ${response.status}` };
      }

      const data = await response.json() as Record<string, any>;
      return {
        success: true,
        viewsCount: data.viewCount || 0,
        favoritesCount: data.favoriteCount || 0,
        status: data.status,
      };
    } catch (error) {
      this.logError('Sahibinden stats error', error);
      return { success: false, error: String(error) };
    }
  }

  async getCategories(): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/categories/real-estate`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });

      if (!response.ok) return [];

      const data = await response.json() as Record<string, any>;
      return data.categories || [];
    } catch {
      return [];
    }
  }

  protected mapPropertyType(type: string): string {
    return SAHIBINDEN_PROPERTY_TYPE_MAP[type] || 'daire';
  }

  protected mapHeatingType(type: string): string {
    return SAHIBINDEN_HEATING_MAP[type] || 'belirtilmemis';
  }

  private mapToSahibindenFormat(property: PortalProperty): Record<string, any> {
    return {
      category: this.mapPropertyType(property.propertyType),
      title: property.title,
      description: property.description,
      price: property.price,
      currency: property.currency,
      listingType: property.listingType === 'SALE' ? 'satilik' : 'kiralik',
      location: {
        il: property.il,
        ilce: property.ilce,
        mahalle: property.mahalle,
      },
      details: {
        brutM2: property.grossSqm,
        netM2: property.netSqm,
        odaSayisi: property.roomCount,
        binaYasi: property.buildingAge,
        bulunduguKat: property.floorNumber,
        katSayisi: property.totalFloors,
        isitma: this.mapHeatingType(property.heatingType),
        banyoSayisi: property.bathroomCount,
        esyali: property.isFurnished,
        tapuDurumu: property.deedType,
        aidat: property.duesAmount,
      },
      features: property.features,
      photos: property.photos.map(p => ({
        url: p.url,
        sira: p.order,
        kapak: p.iscover,
      })),
    };
  }

  private generateXmlFeed(data: Record<string, any>): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<listing>
  <category>${data.category}</category>
  <title><![CDATA[${data.title}]]></title>
  <description><![CDATA[${data.description}]]></description>
  <price currency="${data.currency}">${data.price}</price>
  <type>${data.listingType}</type>
  <location>
    <il>${data.location.il}</il>
    <ilce>${data.location.ilce}</ilce>
    <mahalle>${data.location.mahalle}</mahalle>
  </location>
  <details>
    <brut-m2>${data.details.brutM2}</brut-m2>
    <net-m2>${data.details.netM2}</net-m2>
    <oda-sayisi>${data.details.odaSayisi}</oda-sayisi>
    <bina-yasi>${data.details.binaYasi}</bina-yasi>
    <kat>${data.details.bulunduguKat}</kat>
    <kat-sayisi>${data.details.katSayisi}</kat-sayisi>
    <isitma>${data.details.isitma}</isitma>
    <banyo>${data.details.banyoSayisi}</banyo>
    <esyali>${data.details.esyali}</esyali>
    <tapu>${data.details.tapuDurumu}</tapu>
    <aidat>${data.details.aidat || 0}</aidat>
  </details>
  <features>
    ${data.features.map((f: string) => `<feature>${f}</feature>`).join('\n    ')}
  </features>
  <photos>
    ${data.photos.map((p: any) => `<photo order="${p.sira}" cover="${p.kapak}">${p.url}</photo>`).join('\n    ')}
  </photos>
</listing>`;
  }
}
