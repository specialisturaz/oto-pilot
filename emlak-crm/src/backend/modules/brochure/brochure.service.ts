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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

const heatingLabels: Record<string, string> = {
  dogalgaz_kombi: 'Dogalgaz Kombi',
  merkezi: 'Merkezi Sistem',
  soba: 'Soba',
  yerden_isitma: 'Yerden Isitma',
  klima: 'Klima',
  diger: 'Diger',
  yok: 'Yok',
  DOGALGAZ_KOMBI: 'Dogalgaz Kombi',
  MERKEZI: 'Merkezi Sistem',
  SOBA: 'Soba',
  YERDEN_ISITMA: 'Yerden Isitma',
  KLIMA: 'Klima',
  NONE: 'Yok',
};

const deedLabels: Record<string, string> = {
  kat_mulkiyeti: 'Kat Mulkiyeti',
  kat_irtifaki: 'Kat Irtifaki',
  arsa_tapusu: 'Arsa Tapusu',
  hisseli: 'Hisseli Tapu',
  diger: 'Diger',
  KAT_MULKIYETI: 'Kat Mulkiyeti',
  KAT_IRTIFAKI: 'Kat Irtifaki',
  ARSA_TAPUSU: 'Arsa Tapusu',
  HISSELI: 'Hisseli Tapu',
};

export class BrochureService {
  /**
   * Brosur icin emlak verisini getir.
   */
  async getBrochureData(propertyId: string, user: AuthenticatedUser) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        office: {
          select: { id: true, name: true, phone: true, email: true, address: true, logoUrl: true, website: true },
        },
        il: { select: { name: true } },
        ilce: { select: { name: true } },
        mahalle: { select: { name: true } },
        photos: { orderBy: { orderIndex: 'asc' } },
        features: {
          include: { feature: true },
        },
      },
    });

    if (!property) {
      throw NotFoundError('Emlak ilani');
    }

    if (property.officeId !== user.officeId) {
      throw ForbiddenError('Bu ilana erisim yetkiniz yok');
    }

    const featuresByCategory: Record<string, string[]> = {};
    for (const pf of property.features) {
      const cat = pf.feature.category || 'Diger';
      if (!featuresByCategory[cat]) {
        featuresByCategory[cat] = [];
      }
      featuresByCategory[cat].push(pf.feature.nameTr);
    }

    const baseUrl = config.server.frontendUrl || 'http://localhost:3000';

    return {
      property: {
        id: property.id,
        title: property.title,
        description: property.description,
        listingType: property.listingType,
        propertyType: property.propertyType,
        price: property.price,
        currency: property.currency,
        formattedPrice: formatTurkishPrice(property.price, property.currency || 'TRY'),
        location: {
          il: property.il?.name || '',
          ilce: property.ilce?.name || '',
          mahalle: property.mahalle?.name || '',
          address: property.address || '',
        },
        specs: {
          roomCount: property.roomCount || '-',
          bathroomCount: property.bathroomCount ?? '-',
          grossSqm: property.grossSqm ?? '-',
          netSqm: property.netSqm ?? '-',
          floorNumber: property.floorNumber ?? '-',
          totalFloors: property.totalFloors ?? '-',
          buildingAge: property.buildingAge ?? '-',
          heatingType: property.heatingType
            ? (heatingLabels[property.heatingType] || property.heatingType)
            : '-',
          isFurnished: property.isFurnished ?? false,
          duesAmount: property.duesAmount ?? null,
        },
        tapu: {
          deedType: property.deedType
            ? (deedLabels[property.deedType] || property.deedType)
            : '-',
          adaNo: property.adaNo || '-',
          parselNo: property.parselNo || '-',
          hasIskan: property.hasIskan ?? null,
          hasDask: property.hasDask ?? null,
          daskPolicyNo: property.daskPolicyNo || null,
        },
        features: featuresByCategory,
        photos: property.photos.map((p) => ({
          id: p.id,
          url: p.url.startsWith('http') ? p.url : `${baseUrl}${p.url}`,
          thumbnailUrl: p.thumbnailUrl
            ? (p.thumbnailUrl.startsWith('http') ? p.thumbnailUrl : `${baseUrl}${p.thumbnailUrl}`)
            : null,
        })),
        createdAt: formatDate(property.createdAt),
      },
      agent: property.assignedUser
        ? {
            name: `${property.assignedUser.firstName} ${property.assignedUser.lastName}`,
            phone: property.assignedUser.phone || '',
            email: property.assignedUser.email,
          }
        : null,
      office: {
        name: property.office.name,
        phone: property.office.phone || '',
        email: property.office.email || '',
        address: property.office.address || '',
        logoUrl: property.office.logoUrl
          ? (property.office.logoUrl.startsWith('http') ? property.office.logoUrl : `${baseUrl}${property.office.logoUrl}`)
          : null,
        website: property.office.website || '',
      },
      listingUrl: `${baseUrl}/ilanlar/${property.id}`,
    };
  }

  /**
   * HTML brosur olustur.
   */
  async generateBrochure(propertyId: string, user: AuthenticatedUser): Promise<string> {
    const data = await this.getBrochureData(propertyId, user);
    const { property, agent, office, listingUrl } = data;

    const mainPhoto = property.photos[0]?.url || '';
    const additionalPhotos = property.photos.slice(1, 5);

    const listingBadge = property.listingType.toLocaleUpperCase('tr-TR').includes('SATILIK')
      ? 'SATILIK'
      : property.listingType.toLocaleUpperCase('tr-TR').includes('KIRALIK')
        ? 'KIRALIK'
        : property.listingType.toLocaleUpperCase('tr-TR');

    const locationStr = [property.location.mahalle, property.location.ilce, property.location.il]
      .filter(Boolean)
      .join(', ');

    // Ozellikler listesi
    let featuresHtml = '';
    for (const [category, items] of Object.entries(property.features)) {
      featuresHtml += `<div style="margin-bottom:8px;"><strong>${category}:</strong> ${items.join(', ')}</div>`;
    }

    // Ek fotograflar grid
    let photosGridHtml = '';
    if (additionalPhotos.length > 0) {
      const photoItems = additionalPhotos
        .map(
          (p) =>
            `<div style="flex:1;min-width:45%;"><img src="${p.url}" alt="Fotograf" style="width:100%;height:180px;object-fit:cover;border-radius:8px;" /></div>`
        )
        .join('');
      photosGridHtml = `
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:16px;">
          ${photoItems}
        </div>
      `;
    }

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${property.title} - Brosur</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1a1a1a;
      background: #ffffff;
      font-size: 14px;
      line-height: 1.5;
    }
    .page {
      max-width: 210mm;
      margin: 0 auto;
      padding: 24px;
    }
    @media print {
      body { background: white; }
      .page { padding: 16px; max-width: 100%; }
      .no-print { display: none !important; }
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .office-logo {
      width: 60px;
      height: 60px;
      object-fit: contain;
      border-radius: 8px;
    }
    .office-logo-placeholder {
      width: 60px;
      height: 60px;
      background: #2563eb;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 20px;
    }
    .office-name { font-size: 18px; font-weight: 700; color: #2563eb; }
    .office-contact { font-size: 11px; color: #6b7280; }
    .listing-badge {
      display: inline-block;
      background: #2563eb;
      color: white;
      padding: 4px 16px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 1px;
    }
    .main-photo {
      width: 100%;
      height: 320px;
      object-fit: cover;
      border-radius: 12px;
      margin-bottom: 16px;
    }
    .main-photo-placeholder {
      width: 100%;
      height: 320px;
      background: #f3f4f6;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      font-size: 16px;
      margin-bottom: 16px;
    }
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }
    .property-title { font-size: 22px; font-weight: 700; color: #111827; flex: 1; }
    .property-price { font-size: 24px; font-weight: 800; color: #2563eb; white-space: nowrap; margin-left: 16px; }
    .location { font-size: 13px; color: #6b7280; margin-bottom: 16px; }
    .specs-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .specs-table td {
      padding: 8px 12px;
      border: 1px solid #e5e7eb;
      font-size: 13px;
    }
    .specs-table td:nth-child(odd) {
      background: #f9fafb;
      font-weight: 600;
      width: 35%;
      color: #374151;
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 2px solid #e5e7eb;
    }
    .features-section { margin-bottom: 16px; font-size: 13px; color: #374151; }
    .tapu-section { margin-bottom: 16px; }
    .description-section {
      margin-bottom: 16px;
      font-size: 13px;
      color: #4b5563;
      white-space: pre-wrap;
    }
    .agent-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #f0f5ff;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .agent-avatar {
      width: 50px;
      height: 50px;
      background: #2563eb;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 18px;
    }
    .agent-name { font-weight: 700; font-size: 15px; color: #111827; }
    .agent-detail { font-size: 12px; color: #6b7280; }
    .qr-section {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
    }
    .qr-placeholder {
      width: 80px;
      height: 80px;
      background: #e5e7eb;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #9ca3af;
      text-align: center;
    }
    .qr-text { font-size: 12px; color: #6b7280; }
    .qr-url { font-size: 11px; color: #2563eb; word-break: break-all; }
    .footer {
      border-top: 3px solid #2563eb;
      padding-top: 12px;
      text-align: center;
      font-size: 11px;
      color: #6b7280;
    }
    .footer strong { color: #2563eb; }
    .print-btn {
      position: fixed;
      top: 16px;
      right: 16px;
      background: #2563eb;
      color: white;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(37,99,235,0.3);
    }
    .print-btn:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Yazdir / PDF Kaydet</button>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        ${
          office.logoUrl
            ? `<img src="${office.logoUrl}" alt="${office.name}" class="office-logo" />`
            : `<div class="office-logo-placeholder">${office.name.charAt(0).toLocaleUpperCase('tr-TR')}</div>`
        }
        <div>
          <div class="office-name">${office.name}</div>
          <div class="office-contact">${[office.phone, office.email].filter(Boolean).join(' | ')}</div>
        </div>
      </div>
      <div class="listing-badge">${listingBadge}</div>
    </div>

    <!-- Ana Fotograf -->
    ${
      mainPhoto
        ? `<img src="${mainPhoto}" alt="${property.title}" class="main-photo" />`
        : '<div class="main-photo-placeholder">Fotograf Yok</div>'
    }

    <!-- Baslik ve Fiyat -->
    <div class="title-row">
      <div class="property-title">${property.title}</div>
      <div class="property-price">${property.formattedPrice}</div>
    </div>
    <div class="location">${locationStr || '-'}</div>

    <!-- Temel Ozellikler Tablosu -->
    <div class="section-title">Temel Bilgiler</div>
    <table class="specs-table">
      <tr>
        <td>Oda Sayisi</td>
        <td>${property.specs.roomCount}</td>
        <td>Banyo</td>
        <td>${property.specs.bathroomCount}</td>
      </tr>
      <tr>
        <td>Brut m&sup2;</td>
        <td>${property.specs.grossSqm}</td>
        <td>Net m&sup2;</td>
        <td>${property.specs.netSqm}</td>
      </tr>
      <tr>
        <td>Bulundugu Kat</td>
        <td>${property.specs.floorNumber}/${property.specs.totalFloors}</td>
        <td>Bina Yasi</td>
        <td>${property.specs.buildingAge !== '-' ? property.specs.buildingAge + ' yil' : '-'}</td>
      </tr>
      <tr>
        <td>Isitma</td>
        <td>${property.specs.heatingType}</td>
        <td>Esyali</td>
        <td>${property.specs.isFurnished ? 'Evet' : 'Hayir'}</td>
      </tr>
      ${
        property.specs.duesAmount
          ? `<tr><td>Aidat</td><td colspan="3">${formatTurkishPrice(property.specs.duesAmount)}/ay</td></tr>`
          : ''
      }
    </table>

    <!-- Ozellikler -->
    ${
      featuresHtml
        ? `<div class="section-title">Ozellikler</div><div class="features-section">${featuresHtml}</div>`
        : ''
    }

    <!-- Tapu Bilgileri -->
    <div class="section-title">Tapu Bilgileri</div>
    <div class="tapu-section">
      <table class="specs-table">
        <tr>
          <td>Tapu Turu</td>
          <td>${property.tapu.deedType}</td>
          <td>Ada / Parsel</td>
          <td>${property.tapu.adaNo} / ${property.tapu.parselNo}</td>
        </tr>
        <tr>
          <td>Iskan</td>
          <td>${property.tapu.hasIskan === true ? 'Var' : property.tapu.hasIskan === false ? 'Yok' : '-'}</td>
          <td>DASK</td>
          <td>${property.tapu.hasDask === true ? 'Var' : property.tapu.hasDask === false ? 'Yok' : '-'}${property.tapu.daskPolicyNo ? ` (${property.tapu.daskPolicyNo})` : ''}</td>
        </tr>
      </table>
    </div>

    <!-- Aciklama -->
    ${
      property.description
        ? `<div class="section-title">Ilan Aciklamasi</div><div class="description-section">${property.description}</div>`
        : ''
    }

    <!-- Ek Fotograflar -->
    ${photosGridHtml ? `<div class="section-title">Fotograflar</div>${photosGridHtml}` : ''}

    <!-- Danisman Bilgisi -->
    ${
      agent
        ? `
    <div class="section-title">Iletisim</div>
    <div class="agent-card">
      <div class="agent-avatar">${agent.name.split(' ').map((n: string) => n[0]).join('').toLocaleUpperCase('tr-TR')}</div>
      <div>
        <div class="agent-name">${agent.name}</div>
        ${agent.phone ? `<div class="agent-detail">Tel: ${agent.phone}</div>` : ''}
        <div class="agent-detail">E-posta: ${agent.email}</div>
      </div>
    </div>
    `
        : ''
    }

    <!-- QR Kod Alani -->
    <div class="qr-section">
      <div class="qr-placeholder">QR Kod</div>
      <div>
        <div class="qr-text">Bu ilani cevrimici goruntulemek icin QR kodu taratiniz</div>
        <div class="qr-url">${listingUrl}</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <strong>${office.name}</strong> | ${office.address || ''} ${office.phone ? `| Tel: ${office.phone}` : ''} ${office.website ? `| ${office.website}` : ''}
      <br />
      Bu brosur ${formatDate(new Date())} tarihinde olusturulmustur. Bilgiler guncellenmis olmayabilir.
    </div>
  </div>
</body>
</html>`;

    logger.info(`Brosur olusturuldu: ilan ${propertyId}`);
    return html;
  }
}

export const brochureService = new BrochureService();
