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

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.substring(0, max - 3) + '...';
}

// ---- Types ----

interface PropertyData {
  id: string;
  title: string;
  description: string | null;
  propertyType: string;
  listingType: string;
  price: number;
  currency: string | null;
  roomCount: string | null;
  grossSqm: number | null;
  netSqm: number | null;
  floorNumber: number | null;
  totalFloors: number | null;
  buildingAge: number | null;
  il: { name: string } | null;
  ilce: { name: string } | null;
  mahalle: { name: string } | null;
  photos: Array<{ url: string; orderIndex: number }>;
  features: Array<{ feature: { nameTr: string; category: string } }>;
  office: { name: string; phone: string | null; email: string | null; logoUrl: string | null; website: string | null };
  assignedUser: { firstName: string; lastName: string; phone: string | null } | null;
}

export interface FacebookAdPack {
  headlines: string[];
  primaryTexts: string[];
  descriptions: string[];
  cta: string;
  imageSpecs: { feed: string; square: string; story: string };
  targeting: TargetingSuggestion;
  budget: BudgetRecommendation;
  estimatedReach: { daily: string; weekly: string };
  propertyTitle: string;
  propertyPrice: string;
  location: string;
  roomCount: string;
  sqm: string;
}

export interface InstagramAdPack {
  feedCaption: string;
  storyTextOverlays: string[];
  hashtags: { high: string[]; medium: string[]; niche: string[] };
  bestPostingTime: string;
  carouselSuggestions: string[];
  locationTag: string;
  targeting: TargetingSuggestion;
  budget: BudgetRecommendation;
  propertyTitle: string;
  propertyPrice: string;
  location: string;
  roomCount: string;
  sqm: string;
}

export interface GoogleAdPack {
  headlines: string[];
  descriptions: string[];
  displayUrlPaths: string[];
  keywords: { primary: string[]; secondary: string[]; negative: string[] };
  bidStrategy: string;
  targeting: TargetingSuggestion;
  budget: BudgetRecommendation;
  propertyTitle: string;
  propertyPrice: string;
  location: string;
  roomCount: string;
  sqm: string;
}

export interface KeywordsResult {
  primary: string[];
  secondary: string[];
  negative: string[];
  propertyTitle: string;
  location: string;
}

export interface TargetingSuggestion {
  location: string;
  radius: string;
  ageRange: string;
  interests: string[];
  behaviors: string[];
  customAudiences: string[];
}

export interface BudgetRecommendation {
  dailyBudget: number;
  weeklyBudget: number;
  currency: string;
  estimatedImpressions: { daily: string; weekly: string };
  estimatedClicks: { daily: string; weekly: string };
  reasoning: string;
}

export class SocialAdsService {
  /**
   * Emlak verisini reklam icin hazirla.
   */
  private async getPropertyForAd(propertyId: string, user: AuthenticatedUser): Promise<PropertyData> {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        office: {
          select: { name: true, phone: true, email: true, logoUrl: true, website: true },
        },
        il: { select: { name: true } },
        ilce: { select: { name: true } },
        mahalle: { select: { name: true } },
        photos: { orderBy: { orderIndex: 'asc' }, take: 10 },
        features: {
          include: { feature: true },
          take: 15,
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

  // ---- Helpers ----

  private getListingTypeLabel(listingType: string): string {
    return listingType.toLocaleUpperCase('tr-TR').includes('SATILIK') ? 'Satilik' : 'Kiralik';
  }

  private getListingTypeLabelUpper(listingType: string): string {
    return listingType.toLocaleUpperCase('tr-TR').includes('SATILIK') ? 'SATILIK' : 'KIRALIK';
  }

  private getLocation(property: PropertyData): string {
    return [property.mahalle?.name, property.ilce?.name, property.il?.name].filter(Boolean).join(', ');
  }

  private getShortLocation(property: PropertyData): string {
    return [property.ilce?.name, property.il?.name].filter(Boolean).join(', ');
  }

  private getFeatureNames(property: PropertyData): string[] {
    return property.features.map((pf) => pf.feature.nameTr);
  }

  /**
   * Hedef kitle onerisi olustur.
   */
  private generateTargeting(property: PropertyData): TargetingSuggestion {
    const il = property.il?.name || 'Turkiye';
    const ilce = property.ilce?.name;
    const locationStr = ilce ? `${ilce}, ${il}` : il;

    const pType = property.propertyType.toLocaleLowerCase('tr-TR');
    const price = property.price;
    const listingType = this.getListingTypeLabel(property.listingType);

    // Yas araligi: gayrimenkul tipine ve fiyata gore
    let ageRange = '25-55';
    if (pType.includes('villa') || price > 10_000_000) {
      ageRange = '35-65';
    } else if (pType.includes('studi') || pType.includes('1+0') || price < 1_500_000) {
      ageRange = '22-35';
    } else if (pType.includes('arsa') || pType.includes('tarla')) {
      ageRange = '30-60';
    }

    // Ilgi alanlari
    const interests: string[] = [
      'Gayrimenkul',
      'Emlak yatirimi',
      'Konut',
    ];

    if (listingType === 'Satilik') {
      interests.push('Konut kredisi', 'Tasinma hizmetleri', 'Ev dekorasyonu');
      if (price > 5_000_000) {
        interests.push('Luksemburg yasam', 'Yatirim', 'Tasarim');
      }
    } else {
      interests.push('Kiralik ev', 'Universite', 'Tasinma');
    }

    if (pType.includes('villa')) {
      interests.push('Villa yasam', 'Bahce', 'Havuz');
    }
    if (pType.includes('arsa')) {
      interests.push('Insaat', 'Arazi yatirimi', 'Muteahhitlik');
    }

    // Davranislar
    const behaviors: string[] = [
      'Gayrimenkul siteleri ziyaretcileri',
      'Emlak uygulamasi kullanicilari',
    ];

    if (listingType === 'Satilik') {
      behaviors.push('Banka kredi basvurusu yapanlar');
      if (price > 3_000_000) {
        behaviors.push('Yuksek gelir grubu');
      }
    }

    return {
      location: locationStr,
      radius: price > 5_000_000 ? '50 km (genis bolge - lux segment)' : '25 km',
      ageRange,
      interests,
      behaviors,
      customAudiences: [
        'Web sitesi ziyaretcileri (son 30 gun)',
        'Mevcut musteri listesi benzerleri',
        'Emlak portali etkilesimcileri',
      ],
    };
  }

  /**
   * Butce onerisi olustur.
   */
  private generateBudgetRecommendation(price: number, listingType: string): BudgetRecommendation {
    const isSale = listingType.toLocaleUpperCase('tr-TR').includes('SATILIK');
    const formattedPrice = formatTurkishPrice(price);

    let daily: number;
    let reasoning: string;

    if (isSale) {
      if (price > 20_000_000) {
        daily = 300;
        reasoning = `Bu ilan ${formattedPrice} degerinde lux segment bir gayrimenkul. Gunluk 300 TL butce ile hedef kitleye etkili erisim saglanabilir. Beklenen komisyon geliri yuksek oldugu icin reklam yatirimi makul.`;
      } else if (price > 10_000_000) {
        daily = 200;
        reasoning = `${formattedPrice} degerindeki bu ilan icin gunluk 200 TL reklam butcesi oneriyoruz. Ust segment alicilara ulasmak icin yeterli bir butce.`;
      } else if (price > 5_000_000) {
        daily = 150;
        reasoning = `${formattedPrice} fiyatli bu ilan icin gunluk 150 TL butce ile orta-ust segment alicilara ulasabilirsiniz.`;
      } else if (price > 2_000_000) {
        daily = 100;
        reasoning = `${formattedPrice} fiyat araligindaki ilanlar icin gunluk 100 TL reklam butcesi iyi bir baslangic noktasidir.`;
      } else {
        daily = 60;
        reasoning = `${formattedPrice} degerindeki bu ilan icin gunluk 60 TL butce ile yerel hedef kitleye etkili erisim saglanabilir.`;
      }
    } else {
      // Kiralik icin daha dusuk butce
      if (price > 50_000) {
        daily = 100;
        reasoning = `Aylik ${formattedPrice} kira bedelli bu ilan icin gunluk 100 TL reklam butcesi uygundur.`;
      } else if (price > 20_000) {
        daily = 60;
        reasoning = `Aylik ${formattedPrice} kira icin gunluk 60 TL butce yeterli olacaktir.`;
      } else {
        daily = 40;
        reasoning = `Aylik ${formattedPrice} kira bedeli icin gunluk 40 TL butce ile hizli sonuc alinabilir.`;
      }
    }

    const weekly = daily * 7;
    const cpm = 25; // Tahmini CPM (TRY)
    const ctr = 0.018; // Ortalama CTR

    const dailyImpressions = Math.round((daily / cpm) * 1000);
    const dailyClicks = Math.round(dailyImpressions * ctr);
    const weeklyImpressions = dailyImpressions * 7;
    const weeklyClicks = dailyClicks * 7;

    return {
      dailyBudget: daily,
      weeklyBudget: weekly,
      currency: 'TRY',
      estimatedImpressions: {
        daily: `${dailyImpressions.toLocaleString('tr-TR')} - ${Math.round(dailyImpressions * 1.4).toLocaleString('tr-TR')}`,
        weekly: `${weeklyImpressions.toLocaleString('tr-TR')} - ${Math.round(weeklyImpressions * 1.4).toLocaleString('tr-TR')}`,
      },
      estimatedClicks: {
        daily: `${dailyClicks} - ${Math.round(dailyClicks * 1.5)}`,
        weekly: `${weeklyClicks} - ${Math.round(weeklyClicks * 1.5)}`,
      },
      reasoning,
    };
  }

  /**
   * Hashtag'ler olustur (kategorilere ayrilmis).
   */
  private generateHashtags(property: PropertyData): { high: string[]; medium: string[]; niche: string[] } {
    const listingType = property.listingType.toLocaleUpperCase('tr-TR');
    const isSale = listingType.includes('SATILIK');
    const pType = property.propertyType.toLocaleLowerCase('tr-TR');

    // Yuksek hacim - genel emlak
    const high: string[] = [
      '#emlak',
      '#gayrimenkul',
      '#ev',
      '#konut',
      isSale ? '#satilik' : '#kiralik',
      isSale ? '#satilikemlak' : '#kiralikemlak',
      '#emlakofisi',
      '#tasinmaz',
      '#yatirim',
      '#turkiyeemlak',
    ];

    // Orta hacim - tip ve konum bazli
    const medium: string[] = [];

    if (pType.includes('daire')) {
      medium.push('#daire', isSale ? '#satilikdaire' : '#kiralikdaire', '#apartman');
    } else if (pType.includes('villa')) {
      medium.push('#villa', isSale ? '#satilikvilla' : '#kiralikvilla', '#mustakilev');
    } else if (pType.includes('arsa')) {
      medium.push('#arsa', '#satilikarsa', '#arsayatirim');
    } else if (pType.includes('dublex')) {
      medium.push('#dublex', '#dublexdaire');
    } else if (pType.includes('residence')) {
      medium.push('#residence', '#residencedaire');
    } else {
      medium.push('#gayrimenkulyatirim');
    }

    if (property.il?.name) {
      const ilSlug = property.il.name.toLocaleLowerCase('tr-TR').replace(/\s+/g, '').replace(/[^a-zA-Z0-9\u00C0-\u024F\u0100-\u017F]/g, '');
      medium.push(`#${ilSlug}`, `#${ilSlug}emlak`);
    }
    if (property.ilce?.name) {
      const ilceSlug = property.ilce.name.toLocaleLowerCase('tr-TR').replace(/\s+/g, '').replace(/[^a-zA-Z0-9\u00C0-\u024F\u0100-\u017F]/g, '');
      medium.push(`#${ilceSlug}`);
    }

    medium.push('#emlakdanismani', '#emlakcisi', '#gayrimenkulyatirim');

    // Dusuk hacim - nis
    const niche: string[] = [];

    if (property.mahalle?.name) {
      const mahalleSlug = property.mahalle.name.toLocaleLowerCase('tr-TR').replace(/\s+/g, '').replace(/[^a-zA-Z0-9\u00C0-\u024F\u0100-\u017F]/g, '');
      niche.push(`#${mahalleSlug}`);
    }
    if (property.roomCount) {
      niche.push(`#${property.roomCount.replace('+', 'arti')}`);
    }

    niche.push('#yeniev', '#evdekorasyonu', '#evsahipliigi', '#mimari');

    if (isSale) {
      niche.push('#konutkredisi', '#tapudevri', '#yatirimaracimlak');
    } else {
      niche.push('#ogrencieve', '#kiralikdairebul');
    }

    // Ozellik bazli
    const featureNames = this.getFeatureNames(property).map(f => f.toLocaleLowerCase('tr-TR'));
    if (featureNames.some(f => f.includes('havuz'))) niche.push('#havuzluev');
    if (featureNames.some(f => f.includes('deniz'))) niche.push('#denizmanzarali');
    if (featureNames.some(f => f.includes('bahce'))) niche.push('#bahcelieyasamm');

    niche.push('#insaat', '#satisasunuldu');

    return {
      high: [...new Set(high)].slice(0, 10),
      medium: [...new Set(medium)].slice(0, 10),
      niche: [...new Set(niche)].slice(0, 10),
    };
  }

  /**
   * SEO anahtar kelimeleri olustur.
   */
  private generateKeywords(property: PropertyData): { primary: string[]; secondary: string[]; negative: string[] } {
    const listingType = this.getListingTypeLabel(property.listingType).toLocaleLowerCase('tr-TR');
    const pType = property.propertyType.toLocaleLowerCase('tr-TR');
    const il = property.il?.name?.toLocaleLowerCase('tr-TR') || '';
    const ilce = property.ilce?.name?.toLocaleLowerCase('tr-TR') || '';
    const mahalle = property.mahalle?.name?.toLocaleLowerCase('tr-TR') || '';

    const primary: string[] = [];
    const secondary: string[] = [];

    // Ana anahtar kelimeler
    if (il) primary.push(`${listingType} ${pType} ${il}`);
    if (ilce) primary.push(`${listingType} ${pType} ${ilce}`);
    if (il && ilce) primary.push(`${ilce} ${listingType} ${pType}`);
    primary.push(`${listingType} ${pType}`);
    if (property.roomCount && il) {
      primary.push(`${property.roomCount} ${listingType} ${pType} ${il}`);
    }
    if (il) primary.push(`${il} emlak`);
    if (ilce) primary.push(`${ilce} emlak`);

    // Ikincil anahtar kelimeler
    if (mahalle) secondary.push(`${mahalle} ${listingType} ${pType}`);
    if (property.roomCount) secondary.push(`${property.roomCount} ${pType}`);
    if (property.grossSqm && il) secondary.push(`${property.grossSqm} m2 ${pType} ${il}`);
    secondary.push(`${listingType} ev`);
    secondary.push(`${listingType} konut`);
    if (il) secondary.push(`${il} gayrimenkul`);
    secondary.push('emlak ilanlari');
    secondary.push(`${listingType} gayrimenkul`);

    // Negatif anahtar kelimeler (rakip/alakasiz trafigi engellemek icin)
    const isSale = listingType === 'satilik';
    const negative: string[] = [
      isSale ? 'kiralik' : 'satilik',
      'ucretsiz',
      'bedava',
      'takas',
      'devren',
      'is yeri',
      'ofis',
      'depo',
      'fabrika',
      'ciftlik',
    ];

    return {
      primary: [...new Set(primary)].slice(0, 15),
      secondary: [...new Set(secondary)].slice(0, 10),
      negative: [...new Set(negative)].slice(0, 10),
    };
  }

  // ---- Public Methods ----

  /**
   * Facebook reklam paketi olustur (A/B test varyantlari ile).
   */
  async generateFacebookAd(propertyId: string, user: AuthenticatedUser): Promise<FacebookAdPack> {
    const property = await this.getPropertyForAd(propertyId, user);
    const location = this.getLocation(property);
    const shortLocation = this.getShortLocation(property);
    const listingType = this.getListingTypeLabel(property.listingType);
    const formattedPrice = formatTurkishPrice(property.price, property.currency || 'TRY');
    const featureNames = this.getFeatureNames(property);
    const topFeature = featureNames[0] || '';
    const targeting = this.generateTargeting(property);
    const budget = this.generateBudgetRecommendation(property.price, property.listingType);

    // 3 baslik varyanti (max 40 karakter)
    const headlines: string[] = [
      truncate(`${listingType} ${property.propertyType} - ${shortLocation}`, 40),
      truncate(`${shortLocation} ${listingType} ${property.propertyType}`, 40),
      truncate(`${formattedPrice} - ${shortLocation} ${property.propertyType}`, 40),
    ];

    // 3 birincil metin varyanti (max 125 karakter ideal)
    const roomInfo = property.roomCount ? `${property.roomCount}` : '';
    const sqmInfo = property.grossSqm ? `${property.grossSqm} m2` : '';
    const specs = [roomInfo, sqmInfo].filter(Boolean).join(', ');

    const primaryTexts: string[] = [
      truncate(`${listingType} ${property.propertyType} ${formattedPrice}. ${location}${specs ? ` | ${specs}` : ''}. Detayli bilgi icin tiklayin!`, 125),
      truncate(`${location} - ${formattedPrice}${specs ? `. ${specs}` : ''}${topFeature ? `. ${topFeature}` : ''}. Hemen inceleyin!`, 125),
      truncate(`Firsat! ${shortLocation} ${listingType.toLocaleLowerCase('tr-TR')} ${property.propertyType.toLocaleLowerCase('tr-TR')} ${formattedPrice}. ${specs || 'Detaylar icin tiklayin!'}`, 125),
    ];

    // 2 aciklama varyanti (max 30 karakter)
    const descriptions: string[] = [
      truncate(`${property.office.name} - Bilgi alin`, 30),
      truncate(`${shortLocation} ${listingType}`, 30),
    ];

    // Tahmini erisim
    const dailyImpressionBase = Math.round((budget.dailyBudget / 25) * 1000);
    const estimatedReach = {
      daily: `${Math.round(dailyImpressionBase * 0.6).toLocaleString('tr-TR')} - ${Math.round(dailyImpressionBase * 0.9).toLocaleString('tr-TR')} kisi`,
      weekly: `${Math.round(dailyImpressionBase * 0.6 * 5).toLocaleString('tr-TR')} - ${Math.round(dailyImpressionBase * 0.9 * 7).toLocaleString('tr-TR')} kisi`,
    };

    logger.info(`Facebook reklam paketi olusturuldu: ilan ${propertyId}`);

    return {
      headlines,
      primaryTexts,
      descriptions,
      cta: listingType === 'Satilik' ? 'Daha Fazla Bilgi' : 'Hemen Ara',
      imageSpecs: {
        feed: '1200x628 px (yatay, Facebook akisi)',
        square: '1080x1080 px (kare, carousel)',
        story: '1080x1920 px (dikey, hikaye)',
      },
      targeting,
      budget,
      estimatedReach,
      propertyTitle: property.title,
      propertyPrice: formattedPrice,
      location,
      roomCount: property.roomCount || '-',
      sqm: property.grossSqm ? `${property.grossSqm} m2` : '-',
    };
  }

  /**
   * Instagram reklam paketi olustur.
   */
  async generateInstagramAd(propertyId: string, user: AuthenticatedUser): Promise<InstagramAdPack> {
    const property = await this.getPropertyForAd(propertyId, user);
    const location = this.getLocation(property);
    const shortLocation = this.getShortLocation(property);
    const listingTypeUpper = this.getListingTypeLabelUpper(property.listingType);
    const formattedPrice = formatTurkishPrice(property.price, property.currency || 'TRY');
    const featureNames = this.getFeatureNames(property);
    const targeting = this.generateTargeting(property);
    const budget = this.generateBudgetRecommendation(property.price, property.listingType);
    const hashtags = this.generateHashtags(property);

    const specs: string[] = [];
    if (property.roomCount) specs.push(`${property.roomCount}`);
    if (property.grossSqm) specs.push(`${property.grossSqm} m\u00B2`);
    if (property.floorNumber != null) specs.push(`${property.floorNumber}. Kat`);
    if (property.buildingAge != null) specs.push(`${property.buildingAge} yasinda`);

    const featureText = featureNames.length > 0
      ? featureNames.slice(0, 4).join(' | ')
      : '';

    const agentLine = property.assignedUser
      ? `${property.assignedUser.firstName} ${property.assignedUser.lastName}${property.assignedUser.phone ? ' | ' + property.assignedUser.phone : ''}`
      : '';

    // Feed post caption
    const captionParts: string[] = [
      `\u2728 ${listingTypeUpper} | ${property.propertyType} \u2728`,
      '',
      `\uD83D\uDCB0 ${formattedPrice}`,
      `\uD83D\uDCCD ${location}`,
    ];
    if (specs.length > 0) {
      captionParts.push(`\uD83C\uDFE0 ${specs.join(' | ')}`);
    }
    if (featureText) {
      captionParts.push('');
      captionParts.push(`\u2705 ${featureText}`);
    }
    if (property.description) {
      const shortDesc = property.description.length > 150
        ? property.description.substring(0, 150) + '...'
        : property.description;
      captionParts.push('');
      captionParts.push(shortDesc);
    }
    captionParts.push('');
    captionParts.push('\uD83D\uDC49 Detayli bilgi icin DM gonderin veya profildeki linke tiklayin!');
    if (agentLine) {
      captionParts.push(`\uD83D\uDCDE ${agentLine}`);
    }
    captionParts.push(`\uD83C\uDFE2 ${property.office.name}`);
    captionParts.push('');
    const allHashtags = [...hashtags.high, ...hashtags.medium, ...hashtags.niche];
    captionParts.push(allHashtags.join(' '));

    const feedCaption = captionParts.join('\n');

    // Story text overlays
    const storyTextOverlays: string[] = [
      `${listingTypeUpper} | ${formattedPrice}`,
      `${shortLocation}`,
      specs.length > 0 ? specs.join(' | ') : property.propertyType,
      `${property.office.name}`,
    ];

    // Carousel onerileri
    const carouselSuggestions: string[] = [
      '1. Slide: Dis cephe / ana gorsel (dikkat cekici)',
      '2. Slide: Salon / oturma odasi',
      '3. Slide: Mutfak',
      '4. Slide: Yatak odalari',
      '5. Slide: Banyo',
    ];
    if (property.photos.length > 5) {
      carouselSuggestions.push('6. Slide: Balkon / bahce / manzara');
    }
    if (featureNames.length > 0) {
      carouselSuggestions.push(`Son Slide: Ozellikler listesi gorseli (${featureNames.slice(0, 5).join(', ')})`);
    }
    carouselSuggestions.push('Son Slide: Fiyat + iletisim bilgisi');

    // En iyi paylasim zamani
    const bestPostingTime = 'Hafta ici: 12:00-13:00 veya 19:00-21:00 | Hafta sonu: 10:00-12:00 (Turkiye yerel saati)';

    // Konum etiketi
    const locationTag = property.ilce?.name && property.il?.name
      ? `${property.ilce.name}, ${property.il.name}`
      : property.il?.name || 'Turkiye';

    logger.info(`Instagram reklam paketi olusturuldu: ilan ${propertyId}`);

    return {
      feedCaption,
      storyTextOverlays,
      hashtags,
      bestPostingTime,
      carouselSuggestions,
      locationTag,
      targeting,
      budget,
      propertyTitle: property.title,
      propertyPrice: formattedPrice,
      location,
      roomCount: property.roomCount || '-',
      sqm: property.grossSqm ? `${property.grossSqm} m2` : '-',
    };
  }

  /**
   * Google Ads reklam paketi olustur.
   */
  async generateGoogleAd(propertyId: string, user: AuthenticatedUser): Promise<GoogleAdPack> {
    const property = await this.getPropertyForAd(propertyId, user);
    const location = this.getLocation(property);
    const shortLocation = this.getShortLocation(property);
    const listingType = this.getListingTypeLabel(property.listingType);
    const formattedPrice = formatTurkishPrice(property.price, property.currency || 'TRY');
    const targeting = this.generateTargeting(property);
    const budget = this.generateBudgetRecommendation(property.price, property.listingType);
    const keywords = this.generateKeywords(property);

    const roomStr = property.roomCount ? `${property.roomCount}` : '';
    const sqmStr = property.grossSqm ? `${property.grossSqm} m2` : '';

    // 3 baslik (max 30 karakter)
    const headlines: string[] = [
      truncate(`${listingType} ${property.propertyType} ${shortLocation}`, 30),
      truncate(`${formattedPrice}${roomStr ? ` ${roomStr}` : ''}`, 30),
      truncate(`${property.office.name} Emlak`, 30),
    ];

    // 2 aciklama (max 90 karakter)
    const specParts = [roomStr, sqmStr].filter(Boolean).join(', ');
    const descriptions: string[] = [
      truncate(`${shortLocation} ${listingType.toLocaleLowerCase('tr-TR')} ${property.propertyType.toLocaleLowerCase('tr-TR')}. ${specParts ? specParts + '.' : ''} Hemen bilgi alin!`, 90),
      truncate(`${formattedPrice} fiyatli ${property.propertyType.toLocaleLowerCase('tr-TR')}. ${location}. Detayli bilgi icin tiklayin.`, 90),
    ];

    // Gorunen URL yol onerileri
    const il = property.il?.name?.toLocaleLowerCase('tr-TR').replace(/\s+/g, '-') || 'emlak';
    const displayUrlPaths: string[] = [
      `${listingType.toLocaleLowerCase('tr-TR')}/${il}`,
      `emlak/${il}`,
    ];

    // Teklif stratejisi
    const isSale = listingType === 'Satilik';
    const bidStrategy = isSale
      ? 'Hedef EBM (Edinme Basina Maliyet): Satis ilanlarinda donusum odakli teklif stratejisi oneriyoruz. Baslangic EBM hedefi: 50-100 TL.'
      : 'Tiklama Sayisini En Ust Duzeye Cikarin: Kiralik ilanlarda trafik odakli strateji daha etkilidir. Gunluk butce siniri ile kontrol saglayin.';

    logger.info(`Google Ads reklam paketi olusturuldu: ilan ${propertyId}`);

    return {
      headlines,
      descriptions,
      displayUrlPaths,
      keywords,
      bidStrategy,
      targeting,
      budget,
      propertyTitle: property.title,
      propertyPrice: formattedPrice,
      location,
      roomCount: property.roomCount || '-',
      sqm: property.grossSqm ? `${property.grossSqm} m2` : '-',
    };
  }

  /**
   * Anahtar kelime raporu.
   */
  async generateKeywordsReport(propertyId: string, user: AuthenticatedUser): Promise<KeywordsResult> {
    const property = await this.getPropertyForAd(propertyId, user);
    const keywords = this.generateKeywords(property);
    const location = this.getLocation(property);

    logger.info(`Anahtar kelime raporu olusturuldu: ilan ${propertyId}`);

    return {
      ...keywords,
      propertyTitle: property.title,
      location,
    };
  }

  /**
   * Reklam gorseli icin HTML template olustur.
   */
  async generateAdImage(propertyId: string, user: AuthenticatedUser): Promise<string> {
    const property = await this.getPropertyForAd(propertyId, user);
    const baseUrl = config.server.frontendUrl || 'http://localhost:3000';

    const listingBadge = this.getListingTypeLabelUpper(property.listingType);
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
}

export const socialAdsService = new SocialAdsService();
