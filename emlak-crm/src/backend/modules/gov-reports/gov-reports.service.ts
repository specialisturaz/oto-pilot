import { PrismaClient, Prisma } from '@prisma/client';
import logger from '../../utils/logger';
import type { AuthenticatedUser } from '../../middleware/auth';

const prisma = new PrismaClient();

const KDV_RATE = 20; // %20 KDV

interface DateRangeFilter {
  from?: string;
  to?: string;
}

function formatTurkishPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function buildDateRange(filters: DateRangeFilter): { gte?: Date; lte?: Date } | undefined {
  if (!filters.from && !filters.to) return undefined;
  const range: { gte?: Date; lte?: Date } = {};
  if (filters.from) range.gte = new Date(filters.from);
  if (filters.to) range.lte = new Date(filters.to);
  return range;
}

export class GovReportsService {
  /**
   * EIDS Raporu - Emlak Idari Denetim Sistemi
   * Toplam islem, satis/kiralama dagilimi, komisyon toplamlari, danisman performansi
   */
  async generateEidsReport(filters: DateRangeFilter, user: AuthenticatedUser) {
    const officeId = user.officeId!;
    const dateRange = buildDateRange(filters);

    const dateWhere = dateRange ? { actualCloseDate: dateRange } : {};

    const [
      completedDeals,
      dealsByType,
      commissionSummary,
      agentPerformance,
      office,
    ] = await Promise.all([
      // Tamamlanan islemler
      prisma.deal.findMany({
        where: {
          officeId,
          stage: 'COMPLETED',
          ...dateWhere,
        },
        include: {
          property: {
            select: { title: true, propertyType: true, listingType: true },
          },
          contact: {
            select: { firstName: true, lastName: true },
          },
          assignedUser: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { actualCloseDate: 'desc' },
      }),

      // Tip bazinda dagılım
      prisma.deal.groupBy({
        by: ['type'],
        where: {
          officeId,
          stage: 'COMPLETED',
          ...dateWhere,
        },
        _count: true,
        _sum: { agreedPrice: true, commissionTotal: true },
      }),

      // Komisyon ozeti
      prisma.commission.aggregate({
        where: {
          officeId,
          ...(dateRange ? { createdAt: dateRange } : {}),
        },
        _sum: { amount: true, agentShareAmount: true, officeShareAmount: true },
        _count: true,
      }),

      // Danisman bazinda performans
      prisma.deal.groupBy({
        by: ['assignedUserId'],
        where: {
          officeId,
          stage: 'COMPLETED',
          ...dateWhere,
        },
        _count: true,
        _sum: { agreedPrice: true, commissionTotal: true },
      }),

      // Ofis bilgisi
      prisma.office.findUnique({
        where: { id: officeId },
        select: { name: true, licenseNumber: true, taxNumber: true, taxOffice: true, address: true, phone: true },
      }),
    ]);

    // Danisman isimlerini cek
    const agentIds = agentPerformance
      .map((a) => a.assignedUserId)
      .filter((id): id is string => id !== null);

    const agents = agentIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: agentIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];

    const agentMap = new Map(agents.map((a) => [a.id, `${a.firstName} ${a.lastName}`]));

    const totalCommission = Number(commissionSummary._sum.amount || 0);
    const kdvAmount = totalCommission * (KDV_RATE / 100);

    const fromStr = filters.from || '-';
    const toStr = filters.to || '-';

    const reportData = {
      reportType: 'EIDS',
      reportTitle: 'Emlak Idari Denetim Sistemi Raporu',
      office: office
        ? {
            name: office.name,
            licenseNumber: office.licenseNumber || '-',
            taxNumber: office.taxNumber || '-',
            taxOffice: office.taxOffice || '-',
            address: office.address || '-',
            phone: office.phone || '-',
          }
        : null,
      period: { from: fromStr, to: toStr },
      summary: {
        totalTransactions: completedDeals.length,
        totalVolume: Number(completedDeals.reduce((sum, d) => sum + (d.agreedPrice || 0), 0)),
        totalCommission,
        kdvAmount,
        totalWithKdv: totalCommission + kdvAmount,
      },
      byType: dealsByType.map((t) => ({
        type: t.type,
        typeLabel: t.type === 'SALE' ? 'Satis' : t.type === 'RENT' ? 'Kiralama' : t.type,
        count: t._count,
        volume: Number(t._sum.agreedPrice || 0),
        commission: Number(t._sum.commissionTotal || 0),
      })),
      agentPerformance: agentPerformance.map((a) => ({
        agentName: a.assignedUserId ? (agentMap.get(a.assignedUserId) || 'Bilinmiyor') : 'Atanmamis',
        transactionCount: a._count,
        totalVolume: Number(a._sum.agreedPrice || 0),
        totalCommission: Number(a._sum.commissionTotal || 0),
      })),
      transactions: completedDeals.map((d) => ({
        date: d.actualCloseDate ? formatDate(d.actualCloseDate) : '-',
        type: d.type === 'SALE' ? 'Satis' : d.type === 'RENT' ? 'Kiralama' : d.type,
        property: d.property.title,
        propertyType: d.property.propertyType,
        client: `${d.contact.firstName} ${d.contact.lastName}`,
        agent: d.assignedUser ? `${d.assignedUser.firstName} ${d.assignedUser.lastName}` : '-',
        amount: Number(d.agreedPrice || 0),
        commission: Number(d.commissionTotal || 0),
      })),
      generatedAt: formatDate(new Date()),
    };

    // HTML rapor olustur
    const html = this.renderEidsHtml(reportData);

    logger.info(`EIDS raporu olusturuldu: ofis ${officeId}, donem ${fromStr} - ${toStr}`);

    return { data: reportData, html };
  }

  /**
   * GIB BTRANS Raporu - Gelir Idaresi Tasinmaz Bildirimi
   * CSV format: tamamlanan satislar, alici/satici, tasinmaz bilgileri
   */
  async generateBtransReport(filters: DateRangeFilter, user: AuthenticatedUser) {
    const officeId = user.officeId!;
    const dateRange = buildDateRange(filters);
    const dateWhere = dateRange ? { actualCloseDate: dateRange } : {};

    const deals = await prisma.deal.findMany({
      where: {
        officeId,
        stage: 'COMPLETED',
        type: 'SALE',
        ...dateWhere,
      },
      include: {
        property: {
          include: {
            il: { select: { name: true } },
            ilce: { select: { name: true } },
            mahalle: { select: { name: true } },
          },
        },
        contact: {
          select: { firstName: true, lastName: true, tcKimlikNo: true, phone: true },
        },
      },
      orderBy: { actualCloseDate: 'asc' },
    });

    const office = await prisma.office.findUnique({
      where: { id: officeId },
      select: { name: true, taxNumber: true, licenseNumber: true },
    });

    // CSV baslik satiri
    const headers = [
      'Sira No',
      'Islem Tarihi',
      'Alici Adi',
      'Alici TC (Maskelenmis)',
      'Il',
      'Ilce',
      'Mahalle',
      'Ada No',
      'Parsel No',
      'Tapu Turu',
      'Gayrimenkul Tipi',
      'Brut m2',
      'Net m2',
      'Satis Bedeli (TL)',
      'Komisyon (TL)',
      'Emlak Ofisi',
      'Vergi No',
    ];

    const rows = deals.map((deal, index) => {
      const tc = deal.contact.tcKimlikNo || '';
      const maskedTc = tc.length >= 5 ? tc.substring(0, 3) + '*'.repeat(tc.length - 5) + tc.substring(tc.length - 2) : '***';

      return [
        String(index + 1),
        deal.actualCloseDate ? formatDate(deal.actualCloseDate) : '',
        `${deal.contact.firstName} ${deal.contact.lastName}`,
        maskedTc,
        deal.property.il?.name || '',
        deal.property.ilce?.name || '',
        deal.property.mahalle?.name || '',
        deal.property.adaNo || '',
        deal.property.parselNo || '',
        deal.property.deedType || '',
        deal.property.propertyType || '',
        String(deal.property.grossSqm || ''),
        String(deal.property.netSqm || ''),
        formatTurkishPrice(deal.agreedPrice || 0),
        formatTurkishPrice(deal.commissionTotal || 0),
        office?.name || '',
        office?.taxNumber || '',
      ];
    });

    // CSV olustur (BOM ile Turkce karakter destegi)
    const csvLines = [headers.join(';'), ...rows.map((r) => r.join(';'))];
    const csv = '\uFEFF' + csvLines.join('\n');

    const fromStr = filters.from || '-';
    const toStr = filters.to || '-';

    logger.info(`GIB BTRANS raporu olusturuldu: ofis ${officeId}, ${deals.length} islem`);

    return {
      data: {
        reportType: 'GIB_BTRANS',
        reportTitle: 'GIB Tasinmaz Bildirimi (BTRANS)',
        period: { from: fromStr, to: toStr },
        totalTransactions: deals.length,
        totalVolume: deals.reduce((sum, d) => sum + (d.agreedPrice || 0), 0),
        office: office ? { name: office.name, taxNumber: office.taxNumber || '-' } : null,
      },
      csv,
    };
  }

  /**
   * Emlak Odasi Raporu
   * Aktif ilanlar, tamamlanan islemler, komisyon geliri
   */
  async generateChamberReport(filters: DateRangeFilter, user: AuthenticatedUser) {
    const officeId = user.officeId!;
    const dateRange = buildDateRange(filters);
    const dateWhere = dateRange ? { actualCloseDate: dateRange } : {};
    const createdDateWhere = dateRange ? { createdAt: dateRange } : {};

    const [
      activeListings,
      completedDeals,
      commissionSummary,
      listingsByType,
      office,
    ] = await Promise.all([
      // Aktif ilan sayisi
      prisma.property.count({
        where: { officeId, propertyStatus: 'ACTIVE' },
      }),

      // Tamamlanan islemler
      prisma.deal.aggregate({
        where: {
          officeId,
          stage: 'COMPLETED',
          ...dateWhere,
        },
        _count: true,
        _sum: { agreedPrice: true, commissionTotal: true },
      }),

      // Komisyon ozeti
      prisma.commission.aggregate({
        where: {
          officeId,
          ...(dateRange ? { createdAt: dateRange } : {}),
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Ilan tipi dagilimi
      prisma.property.groupBy({
        by: ['listingType'],
        where: { officeId, propertyStatus: 'ACTIVE' },
        _count: true,
      }),

      // Ofis bilgisi
      prisma.office.findUnique({
        where: { id: officeId },
        select: {
          name: true, licenseNumber: true, taxNumber: true, taxOffice: true,
          address: true, phone: true, email: true,
        },
      }),
    ]);

    // Danisman sayisi
    const agentCount = await prisma.user.count({
      where: { officeId, isActive: true, role: { in: ['AGENT', 'MANAGER'] } },
    });

    const totalCommission = Number(commissionSummary._sum.amount || 0);
    const kdvAmount = totalCommission * (KDV_RATE / 100);

    const fromStr = filters.from || '-';
    const toStr = filters.to || '-';

    const reportData = {
      reportType: 'CHAMBER',
      reportTitle: 'Emlak Odasi Faaliyet Raporu',
      office: office
        ? {
            name: office.name,
            licenseNumber: office.licenseNumber || '-',
            taxNumber: office.taxNumber || '-',
            taxOffice: office.taxOffice || '-',
            address: office.address || '-',
            phone: office.phone || '-',
            email: office.email || '-',
          }
        : null,
      period: { from: fromStr, to: toStr },
      summary: {
        activeListings,
        agentCount,
        completedTransactions: completedDeals._count,
        totalVolume: Number(completedDeals._sum.agreedPrice || 0),
        totalCommission,
        kdvAmount,
        totalWithKdv: totalCommission + kdvAmount,
        commissionCount: commissionSummary._count,
      },
      listingsByType: listingsByType.map((l) => ({
        type: l.listingType,
        typeLabel: l.listingType.toLocaleUpperCase('tr-TR').includes('SATILIK')
          ? 'Satilik'
          : l.listingType.toLocaleUpperCase('tr-TR').includes('KIRALIK')
            ? 'Kiralik'
            : l.listingType,
        count: l._count,
      })),
      generatedAt: formatDate(new Date()),
    };

    // HTML rapor olustur
    const html = this.renderChamberHtml(reportData);

    logger.info(`Emlak Odasi raporu olusturuldu: ofis ${officeId}`);

    return { data: reportData, html };
  }

  // ---- HTML Render Yardimcilari ----

  private renderEidsHtml(data: Record<string, unknown>): string {
    const d = data as {
      reportTitle: string;
      office: { name: string; licenseNumber: string; taxNumber: string; taxOffice: string; address: string; phone: string } | null;
      period: { from: string; to: string };
      summary: { totalTransactions: number; totalVolume: number; totalCommission: number; kdvAmount: number; totalWithKdv: number };
      byType: Array<{ typeLabel: string; count: number; volume: number; commission: number }>;
      agentPerformance: Array<{ agentName: string; transactionCount: number; totalVolume: number; totalCommission: number }>;
      transactions: Array<{ date: string; type: string; property: string; client: string; agent: string; amount: number; commission: number }>;
      generatedAt: string;
    };

    const byTypeRows = d.byType
      .map(
        (t) =>
          `<tr><td>${t.typeLabel}</td><td>${t.count}</td><td>${formatTurkishPrice(t.volume)} TL</td><td>${formatTurkishPrice(t.commission)} TL</td></tr>`
      )
      .join('');

    const agentRows = d.agentPerformance
      .map(
        (a) =>
          `<tr><td>${a.agentName}</td><td>${a.transactionCount}</td><td>${formatTurkishPrice(a.totalVolume)} TL</td><td>${formatTurkishPrice(a.totalCommission)} TL</td></tr>`
      )
      .join('');

    const txRows = d.transactions
      .map(
        (t) =>
          `<tr><td>${t.date}</td><td>${t.type}</td><td>${t.property}</td><td>${t.client}</td><td>${t.agent}</td><td>${formatTurkishPrice(t.amount)} TL</td><td>${formatTurkishPrice(t.commission)} TL</td></tr>`
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"/><title>${d.reportTitle}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;color:#1a1a1a;background:#fff;}
.page{max-width:210mm;margin:0 auto;padding:24px;}
@media print{.page{padding:16px;max-width:100%;}.no-print{display:none!important;}}
h1{font-size:18px;color:#1e3a5f;margin-bottom:4px;}
h2{font-size:15px;color:#1e3a5f;margin:16px 0 8px;border-bottom:2px solid #e5e7eb;padding-bottom:4px;}
.meta{font-size:12px;color:#6b7280;margin-bottom:16px;}
table{width:100%;border-collapse:collapse;margin-bottom:16px;}
th,td{border:1px solid #d1d5db;padding:6px 10px;text-align:left;font-size:12px;}
th{background:#f3f4f6;font-weight:600;color:#374151;}
.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;}
.summary-card{background:#f0f5ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;text-align:center;}
.summary-card .value{font-size:20px;font-weight:700;color:#2563eb;}
.summary-card .label{font-size:11px;color:#6b7280;}
.footer{border-top:2px solid #e5e7eb;padding-top:8px;font-size:11px;color:#6b7280;text-align:center;margin-top:24px;}
.print-btn{position:fixed;top:16px;right:16px;background:#2563eb;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;z-index:1000;}
.print-btn:hover{background:#1d4ed8;}
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">Yazdir</button>
<div class="page">
<h1>${d.reportTitle}</h1>
<div class="meta">
${d.office ? `${d.office.name} | Ruhsat: ${d.office.licenseNumber} | VKN: ${d.office.taxNumber}<br/>${d.office.address} | Tel: ${d.office.phone}` : ''}
<br/>Donem: ${d.period.from} - ${d.period.to} | Rapor Tarihi: ${d.generatedAt}
</div>

<div class="summary-grid">
<div class="summary-card"><div class="value">${d.summary.totalTransactions}</div><div class="label">Toplam Islem</div></div>
<div class="summary-card"><div class="value">${formatTurkishPrice(d.summary.totalVolume)} TL</div><div class="label">Toplam Hacim</div></div>
<div class="summary-card"><div class="value">${formatTurkishPrice(d.summary.totalWithKdv)} TL</div><div class="label">Komisyon (KDV Dahil)</div></div>
</div>

<h2>Islem Tipi Dagilimi</h2>
<table><thead><tr><th>Tip</th><th>Adet</th><th>Hacim</th><th>Komisyon</th></tr></thead><tbody>${byTypeRows || '<tr><td colspan="4">Kayit bulunamadi</td></tr>'}</tbody></table>

<h2>Danisman Performansi</h2>
<table><thead><tr><th>Danisman</th><th>Islem Sayisi</th><th>Toplam Hacim</th><th>Toplam Komisyon</th></tr></thead><tbody>${agentRows || '<tr><td colspan="4">Kayit bulunamadi</td></tr>'}</tbody></table>

<h2>Islem Detaylari</h2>
<table><thead><tr><th>Tarih</th><th>Tip</th><th>Gayrimenkul</th><th>Musteri</th><th>Danisman</th><th>Tutar</th><th>Komisyon</th></tr></thead><tbody>${txRows || '<tr><td colspan="7">Kayit bulunamadi</td></tr>'}</tbody></table>

<div class="footer">
Bu rapor ${d.generatedAt} tarihinde otomatik olarak olusturulmustur.<br/>
Emlak CRM - ${d.office?.name || ''}
</div>
</div></body></html>`;
  }

  private renderChamberHtml(data: Record<string, unknown>): string {
    const d = data as {
      reportTitle: string;
      office: { name: string; licenseNumber: string; taxNumber: string; taxOffice: string; address: string; phone: string; email: string } | null;
      period: { from: string; to: string };
      summary: {
        activeListings: number;
        agentCount: number;
        completedTransactions: number;
        totalVolume: number;
        totalCommission: number;
        kdvAmount: number;
        totalWithKdv: number;
        commissionCount: number;
      };
      listingsByType: Array<{ typeLabel: string; count: number }>;
      generatedAt: string;
    };

    const listingRows = d.listingsByType
      .map((l) => `<tr><td>${l.typeLabel}</td><td>${l.count}</td></tr>`)
      .join('');

    return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"/><title>${d.reportTitle}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;color:#1a1a1a;background:#fff;}
.page{max-width:210mm;margin:0 auto;padding:24px;}
@media print{.page{padding:16px;max-width:100%;}.no-print{display:none!important;}}
h1{font-size:18px;color:#1e3a5f;margin-bottom:4px;}
h2{font-size:15px;color:#1e3a5f;margin:16px 0 8px;border-bottom:2px solid #e5e7eb;padding-bottom:4px;}
.meta{font-size:12px;color:#6b7280;margin-bottom:16px;}
table{width:100%;border-collapse:collapse;margin-bottom:16px;}
th,td{border:1px solid #d1d5db;padding:6px 10px;text-align:left;font-size:12px;}
th{background:#f3f4f6;font-weight:600;color:#374151;}
.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;}
.summary-card{background:#f0f5ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;text-align:center;}
.summary-card .value{font-size:20px;font-weight:700;color:#2563eb;}
.summary-card .label{font-size:11px;color:#6b7280;}
.footer{border-top:2px solid #e5e7eb;padding-top:8px;font-size:11px;color:#6b7280;text-align:center;margin-top:24px;}
.print-btn{position:fixed;top:16px;right:16px;background:#2563eb;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;z-index:1000;}
.print-btn:hover{background:#1d4ed8;}
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">Yazdir</button>
<div class="page">
<h1>${d.reportTitle}</h1>
<div class="meta">
${d.office ? `${d.office.name} | Ruhsat: ${d.office.licenseNumber} | VKN: ${d.office.taxNumber} | V.D.: ${d.office.taxOffice}<br/>${d.office.address} | Tel: ${d.office.phone} | E-posta: ${d.office.email}` : ''}
<br/>Donem: ${d.period.from} - ${d.period.to} | Rapor Tarihi: ${d.generatedAt}
</div>

<div class="summary-grid">
<div class="summary-card"><div class="value">${d.summary.activeListings}</div><div class="label">Aktif Ilan</div></div>
<div class="summary-card"><div class="value">${d.summary.agentCount}</div><div class="label">Aktif Danisman</div></div>
<div class="summary-card"><div class="value">${d.summary.completedTransactions}</div><div class="label">Tamamlanan Islem</div></div>
</div>

<div class="summary-grid">
<div class="summary-card"><div class="value">${formatTurkishPrice(d.summary.totalVolume)} TL</div><div class="label">Toplam Islem Hacmi</div></div>
<div class="summary-card"><div class="value">${formatTurkishPrice(d.summary.totalCommission)} TL</div><div class="label">Toplam Komisyon</div></div>
<div class="summary-card"><div class="value">${formatTurkishPrice(d.summary.totalWithKdv)} TL</div><div class="label">Komisyon (KDV Dahil)</div></div>
</div>

<h2>Aktif Ilan Dagilimi</h2>
<table><thead><tr><th>Ilan Tipi</th><th>Adet</th></tr></thead><tbody>${listingRows || '<tr><td colspan="2">Kayit bulunamadi</td></tr>'}</tbody></table>

<h2>Komisyon Bilgileri</h2>
<table>
<thead><tr><th>Kalem</th><th>Tutar</th></tr></thead>
<tbody>
<tr><td>Toplam Komisyon (KDV Haric)</td><td>${formatTurkishPrice(d.summary.totalCommission)} TL</td></tr>
<tr><td>KDV (%${KDV_RATE})</td><td>${formatTurkishPrice(d.summary.kdvAmount)} TL</td></tr>
<tr><td><strong>Toplam (KDV Dahil)</strong></td><td><strong>${formatTurkishPrice(d.summary.totalWithKdv)} TL</strong></td></tr>
</tbody>
</table>

<div class="footer">
Bu rapor ${d.generatedAt} tarihinde otomatik olarak olusturulmustur.<br/>
Emlak CRM - ${d.office?.name || ''}
</div>
</div></body></html>`;
  }
}

export const govReportsService = new GovReportsService();
