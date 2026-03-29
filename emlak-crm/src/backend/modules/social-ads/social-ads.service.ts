import { PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../middleware/errorHandler';
import config from '../../config';
import logger from '../../utils/logger';
import type { AuthenticatedUser } from '../../middleware/auth';

const prisma = new PrismaClient();

function formatTurkishPrice(price: number, currency = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

interface AdContent {
  headline: string;
  description: string;
  hashtags: string[];
  callToAction: string;
  imageUrl: string | null;
  suggestedBudget: { daily: number; weekly: number; currency: string };
  propertyTitle: string;
  propertyPrice: string;
  location: string;
  roomCount: string;
  sqm: string;
}

export class SocialAdsService {
  /**
   * Emlak verisini reklam icin hazirla.
   */
  private async getPropertyForAd(propertyId: string, user: AuthenticatedUser) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        office: {
          select: { name: true, phone: true, email: true, logoUrl: true, website: true },
        },
        il: { select: { name: true } },
        ilce: { select: { name: true } },
        mahalle: { select: { name: true } },
        photos: { orderBy: { orderIndex: 'asc' }, take: 5 },
        features: {
          include: { feature: true },
          take: 10,
        },
        assignedUser: {
          select: { firstName: true, lastName: true, phone: true },
        },
      },
    });

    if (!property) {
      throw NotFoundError('Emlak ilani');
    }

    if (property.officeId !== user.officeId) {
      throw ForbiddenError('Bu ilana erisim yetkiniz yok');
    }

    return property;
  }

  /**
   * Facebook reklam icerigi olustur.
   */
  async generateFacebookAd(propertyId: string, user: AuthenticatedUser): Promise<AdContent> {
    const property = await this.getPropertyForAd(propertyId, user);
    const baseUrl = config.server.frontendUrl || 'http://localhost:3000';

    const locationParts = [property.mahalle?.name, property.ilce?.name, property.il?.name].filter(Boolean);
    const location = locationParts.join(', ');
    const shortLocation = locationParts.slice(0, 2).join(', ');

    const listingType = property.listingType.toLocaleUpperCase('tr-TR').includes('SATILIK')
      ? 'Satilik'
      : 'Kiralik';

    const formattedPrice = formatTurkishPrice(property.price, property.currency || 'TRY');

    const featureNames = property.features.map((pf) => pf.feature.nameTr);
    const featureList = featureNames.length > 0 ? featureNames.slice(0, 5).join(', ') : '';

    const headline = `${listingType} ${property.propertyType || 'Gayrimenkul'} - ${shortLocation}`;

    const descriptionParts: string[] = [
      `${property.title}`,
      '',
      `Fiyat: ${formattedPrice}`,
      `Konum: ${location}`,
    ];

    if (property.roomCount) {
      descriptionParts.push(`Oda: ${property.roomCount}`);
    }
    if (property.grossSqm) {
      descriptionParts.push(`Alan: ${property.grossSqm} m2 brut${property.netSqm ? ` / ${property.netSqm} m2 net` : ''}`);
    }
    if (property.floorNumber != null) {
      descriptionParts.push(`Kat: ${property.floorNumber}${property.totalFloors ? `/${property.totalFloors}` : ''}`);
    }
    if (property.buildingAge != null) {
      descriptionParts.push(`Bina Yasi: ${property.buildingAge} yil`);
    }
    if (featureList) {
      descriptionParts.push('');
      descriptionParts.push(`Ozellikler: ${featureList}`);
    }
    if (property.description) {
      const shortDesc = property.description.length > 200
        ? property.description.substring(0, 200) + '...'
        : property.description;
      descriptionParts.push('');
      descriptionParts.push(shortDesc);
    }

    descriptionParts.push('');
    descriptionParts.push(`Detayli bilgi icin iletisime gecin!`);
    if (property.assignedUser) {
      descriptionParts.push(`${property.assignedUser.firstName} ${property.assignedUser.lastName}${property.assignedUser.phone ? ` - ${property.assignedUser.phone}` : ''}`);
    }
    descriptionParts.push(property.office.name);

    const hashtags = this.generateHashtags(property, 'facebook');

    const imageUrl = property.photos[0]
      ? (property.photos[0].url.startsWith('http') ? property.photos[0].url : `${baseUrl}${property.photos[0].url}`)
      : null;

    const suggestedBudget = {
      daily: property.price > 5000000 ? 150 : property.price > 1000000 ? 100 : 50,
      weekly: property.price > 5000000 ? 750 : property.price > 1000000 ? 500 : 250,
      currency: 'TRY',
    };

    logger.info(`Facebook reklam icerigi olusturuldu: ilan ${propertyId}`);

    return {
      headline,
      description: descriptionParts.join('\n'),
      hashtags,
      callToAction: 'Hemen bilgi alin!',
      imageUrl,
      suggestedBudget,
      propertyTitle: property.title,
      propertyPrice: formattedPrice,
      location,
      roomCount: property.roomCount || '-',
      sqm: property.grossSqm ? `${property.grossSqm} m2` : '-',
    };
  }

  /**
   * Instagram reklam icerigi olustur.
   */
  async generateInstagramAd(propertyId: string, user: AuthenticatedUser): Promise<AdContent> {
    const property = await this.getPropertyForAd(propertyId, user);
    const baseUrl = config.server.frontendUrl || 'http://localhost:3000';

    const locationParts = [property.ilce?.name, property.il?.name].filter(Boolean);
    const location = locationParts.join(', ');

    const listingType = property.listingType.toLocaleUpperCase('tr-TR').includes('SATILIK')
      ? 'SATILIK'
      : 'KIRALIK';

    const formattedPrice = formatTurkishPrice(property.price, property.currency || 'TRY');

    const headline = `${listingType} | ${location}`;

    const descriptionParts: string[] = [
      `${listingType} ${property.propertyType || 'Gayrimenkul'}`,
      '',
      `${formattedPrice}`,
      `${location}`,
    ];

    if (property.roomCount) {
      descriptionParts.push(`${property.roomCount} | ${property.grossSqm || '-'} m2`);
    }

    const featureNames = property.features.map((pf) => pf.feature.nameTr);
    if (featureNames.length > 0) {
      descriptionParts.push('');
      descriptionParts.push(featureNames.slice(0, 4).join(' | '));
    }

    descriptionParts.push('');
    descriptionParts.push('Detayli bilgi icin DM gonderin veya profildeki linke tiklayin!');
    descriptionParts.push('');
    descriptionParts.push(property.office.name);

    const hashtags = this.generateHashtags(property, 'instagram');

    const imageUrl = property.photos[0]
      ? (property.photos[0].url.startsWith('http') ? property.photos[0].url : `${baseUrl}${property.photos[0].url}`)
      : null;

    const suggestedBudget = {
      daily: property.price > 5000000 ? 120 : property.price > 1000000 ? 80 : 40,
      weekly: property.price > 5000000 ? 600 : property.price > 1000000 ? 400 : 200,
      currency: 'TRY',
    };

    logger.info(`Instagram reklam icerigi olusturuldu: ilan ${propertyId}`);

    return {
      headline,
      description: descriptionParts.join('\n'),
      hashtags,
      callToAction: 'DM ile bilgi alin!',
      imageUrl,
      suggestedBudget,
      propertyTitle: property.title,
      propertyPrice: formattedPrice,
      location,
      roomCount: property.roomCount || '-',
      sqm: property.grossSqm ? `${property.grossSqm} m2` : '-',
    };
  }

  /**
   * Reklam gorseli icin HTML template olustur.
   */
  async generateAdImage(propertyId: string, user: AuthenticatedUser): Promise<string> {
    const property = await this.getPropertyForAd(propertyId, user);
    const baseUrl = config.server.frontendUrl || 'http://localhost:3000';

    const listingBadge = property.listingType.toLocaleUpperCase('tr-TR').includes('SATILIK')
      ? 'SATILIK'
      : 'KIRALIK';

    const formattedPrice = formatTurkishPrice(property.price, property.currency || 'TRY');

    const locationParts = [property.ilce?.name, property.il?.name].filter(Boolean);
    const location = locationParts.join(', ');

    const photoUrl = property.photos[0]
      ? (property.photos[0].url.startsWith('http') ? property.photos[0].url : `${baseUrl}${property.photos[0].url}`)
      : '';

    const officeLogoUrl = property.office.logoUrl
      ? (property.office.logoUrl.startsWith('http') ? property.office.logoUrl : `${baseUrl}${property.office.logoUrl}`)
      : '';

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reklam Gorseli - ${property.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    .ad-container {
      position: relative;
      width: 1080px;
      height: 1080px;
      overflow: hidden;
      background: #000;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }
    .ad-bg {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      opacity: 0.85;
    }
    .ad-bg-placeholder {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
    }
    .ad-overlay {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      background: linear-gradient(transparent, rgba(0,0,0,0.85));
      padding: 60px 50px 50px;
    }
    .ad-badge {
      position: absolute;
      top: 40px; left: 40px;
      background: #dc2626;
      color: white;
      padding: 10px 28px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 22px;
      letter-spacing: 2px;
    }
    .ad-price-badge {
      position: absolute;
      top: 40px; right: 40px;
      background: #2563eb;
      color: white;
      padding: 12px 28px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 28px;
    }
    .ad-title {
      color: white;
      font-size: 36px;
      font-weight: 800;
      margin-bottom: 12px;
      text-shadow: 0 2px 8px rgba(0,0,0,0.5);
      line-height: 1.2;
    }
    .ad-location {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: rgba(255,255,255,0.9);
      font-size: 20px;
      margin-bottom: 16px;
      background: rgba(255,255,255,0.15);
      padding: 6px 16px;
      border-radius: 20px;
    }
    .ad-specs {
      display: flex;
      gap: 24px;
      margin-bottom: 20px;
    }
    .ad-spec {
      color: white;
      font-size: 18px;
      font-weight: 600;
      background: rgba(255,255,255,0.15);
      padding: 8px 16px;
      border-radius: 8px;
    }
    .ad-branding {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.2);
    }
    .ad-office-logo {
      width: 40px; height: 40px;
      object-fit: contain;
      border-radius: 6px;
    }
    .ad-office-logo-placeholder {
      width: 40px; height: 40px;
      background: #2563eb;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 16px;
    }
    .ad-office-name {
      color: white;
      font-size: 18px;
      font-weight: 700;
    }
    .ad-office-phone {
      color: rgba(255,255,255,0.7);
      font-size: 14px;
    }
    .no-print { }
    .save-btn {
      position: fixed;
      top: 20px; right: 20px;
      background: #2563eb;
      color: white;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      z-index: 1000;
    }
    .save-btn:hover { background: #1d4ed8; }
    @media print {
      body { background: white; }
      .no-print { display: none !important; }
      .ad-container { box-shadow: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <button class="save-btn no-print" onclick="window.print()">Kaydet / Yazdir</button>
  <div class="ad-container">
    ${
      photoUrl
        ? `<img src="${photoUrl}" alt="${property.title}" class="ad-bg" />`
        : '<div class="ad-bg-placeholder"></div>'
    }
    <div class="ad-badge">${listingBadge}</div>
    <div class="ad-price-badge">${formattedPrice}</div>
    <div class="ad-overlay">
      <div class="ad-title">${property.title}</div>
      <div class="ad-location">${location}</div>
      <div class="ad-specs">
        ${property.roomCount ? `<div class="ad-spec">${property.roomCount}</div>` : ''}
        ${property.grossSqm ? `<div class="ad-spec">${property.grossSqm} m&sup2;</div>` : ''}
        ${property.floorNumber != null ? `<div class="ad-spec">${property.floorNumber}. Kat</div>` : ''}
        ${property.buildingAge != null ? `<div class="ad-spec">${property.buildingAge} Yasinda</div>` : ''}
      </div>
      <div class="ad-branding">
        ${
          officeLogoUrl
            ? `<img src="${officeLogoUrl}" alt="${property.office.name}" class="ad-office-logo" />`
            : `<div class="ad-office-logo-placeholder">${property.office.name.charAt(0).toLocaleUpperCase('tr-TR')}</div>`
        }
        <div>
          <div class="ad-office-name">${property.office.name}</div>
          ${property.office.phone ? `<div class="ad-office-phone">${property.office.phone}</div>` : ''}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    logger.info(`Reklam gorseli olusturuldu: ilan ${propertyId}`);
    return html;
  }

  /**
   * Platform bazli hashtag olustur.
   */
  private generateHashtags(
    property: {
      propertyType: string;
      listingType: string;
      il?: { name: string } | null;
      ilce?: { name: string } | null;
      mahalle?: { name: string } | null;
      roomCount?: string | null;
      features: Array<{ feature: { nameTr: string; category: string } }>;
    },
    platform: 'facebook' | 'instagram'
  ): string[] {
    const tags: string[] = [];

    // Temel hashtag'ler
    tags.push('#emlak', '#gayrimenkul', '#turkiyeemlak');

    const listingType = property.listingType.toLocaleUpperCase('tr-TR');
    if (listingType.includes('SATILIK')) {
      tags.push('#satilik', '#satilikemlak');
    } else {
      tags.push('#kiralik', '#kiralikemlak');
    }

    // Gayrimenkul tipi
    const pType = property.propertyType.toLocaleLowerCase('tr-TR');
    if (pType.includes('daire')) tags.push('#daire', '#satiliknev', '#satilikdaire');
    if (pType.includes('villa')) tags.push('#villa', '#satilikvilla');
    if (pType.includes('arsa')) tags.push('#arsa', '#satilikarsa');
    if (pType.includes('dublex')) tags.push('#dublex');
    if (pType.includes('residence')) tags.push('#residence');

    // Konum hashtag'leri
    if (property.il?.name) {
      const ilSlug = property.il.name.toLocaleLowerCase('tr-TR').replace(/\s+/g, '');
      tags.push(`#${ilSlug}`, `#${ilSlug}emlak`);
    }
    if (property.ilce?.name) {
      const ilceSlug = property.ilce.name.toLocaleLowerCase('tr-TR').replace(/\s+/g, '');
      tags.push(`#${ilceSlug}`);
    }
    if (property.mahalle?.name) {
      const mahalleSlug = property.mahalle.name.toLocaleLowerCase('tr-TR').replace(/\s+/g, '');
      tags.push(`#${mahalleSlug}`);
    }

    // Oda sayisi
    if (property.roomCount) {
      tags.push(`#${property.roomCount.replace('+', 'arti')}`);
    }

    // Genel hashtag'ler
    tags.push('#emlakofisi', '#yatirimaraciyemlak', '#tasinmaz');

    if (platform === 'instagram') {
      // Instagram icin daha fazla hashtag
      tags.push(
        '#ev', '#evsahipliigi', '#yeniev', '#konut',
        '#insaat', '#mimari', '#dekorasyon', '#evdekorasyonu',
        '#yasam', '#yatirim', '#gayrimenkulyatirim',
        '#emlakdanismani', '#emlakcisi', '#satisasunuldu'
      );

      // 30 hashtag limitine uymak icin kes
      return [...new Set(tags)].slice(0, 30);
    }

    // Facebook icin daha az hashtag
    return [...new Set(tags)].slice(0, 15);
  }
}

export const socialAdsService = new SocialAdsService();
