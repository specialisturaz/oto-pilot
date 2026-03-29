import { PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../middleware/errorHandler';
import logger from '../../utils/logger';
import type { AuthenticatedUser } from '../../middleware/auth';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScoreBreakdown {
  location: number;
  budget: number;
  type: number;
  size: number;
  features: number;
  total: number;
}

interface ContactMatchResult {
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
    budgetMin: number | null;
    budgetMax: number | null;
    preferredLocations: string | null;
    preferredPropertyTypes: string | null;
    interestType: string | null;
    assignedUser: { id: string; firstName: string; lastName: string } | null;
  };
  score: ScoreBreakdown;
}

interface PropertyMatchResult {
  property: {
    id: string;
    title: string;
    price: number;
    propertyType: string;
    listingType: string;
    roomCount: string | null;
    grossSqm: number | null;
    ilId: string | null;
    ilceId: string | null;
    mahalleId: string | null;
    address: string | null;
    photos: Array<{ id: string; url: string; thumbnailUrl: string | null }>;
    assignedUser: { id: string; firstName: string; lastName: string } | null;
  };
  score: ScoreBreakdown;
}

// ---------------------------------------------------------------------------
// Residential vs Commercial category mapping
// ---------------------------------------------------------------------------

const RESIDENTIAL_TYPES = [
  'APARTMENT', 'VILLA', 'DETACHED', 'RESIDENCE',
];

const COMMERCIAL_TYPES = [
  'OFFICE', 'SHOP', 'STORE', 'WAREHOUSE', 'FACTORY', 'HOTEL', 'APART_HOTEL',
];

function getPropertyCategory(propertyType: string): 'residential' | 'commercial' | 'land' {
  const upper = propertyType.toLocaleUpperCase('tr-TR');
  if (RESIDENTIAL_TYPES.includes(upper)) return 'residential';
  if (COMMERCIAL_TYPES.includes(upper)) return 'commercial';
  return 'land';
}

// ---------------------------------------------------------------------------
// Score calculation helpers
// ---------------------------------------------------------------------------

function calculateLocationScore(
  contact: { preferredLocations: string | null },
  property: { ilId: string | null; ilceId: string | null; mahalleId: string | null }
): number {
  if (!contact.preferredLocations) return 50; // no preference = neutral

  let locations: string[] = [];
  try {
    const parsed = JSON.parse(contact.preferredLocations);
    if (Array.isArray(parsed)) {
      locations = parsed;
    } else if (typeof contact.preferredLocations === 'string') {
      locations = contact.preferredLocations.split(',').map((s) => s.trim()).filter(Boolean);
    }
  } catch {
    locations = contact.preferredLocations.split(',').map((s) => s.trim()).filter(Boolean);
  }

  if (locations.length === 0) return 50;

  // Check if property location IDs match any preferred location
  if (property.mahalleId && locations.includes(property.mahalleId)) return 100;
  if (property.ilceId && locations.includes(property.ilceId)) return 70;
  if (property.ilId && locations.includes(property.ilId)) return 40;

  return 0;
}

function calculateBudgetScore(
  contact: { budgetMin: number | null; budgetMax: number | null },
  property: { price: number }
): number {
  const price = property.price;
  const min = contact.budgetMin ?? 0;
  const max = contact.budgetMax ?? Number.MAX_SAFE_INTEGER;

  if (!contact.budgetMin && !contact.budgetMax) return 50; // no preference = neutral

  // Price within budget range
  if (price >= min && price <= max) return 100;

  // Check how far over budget
  if (max > 0 && price > max) {
    const overPercentage = ((price - max) / max) * 100;
    if (overPercentage <= 10) return 70;
    if (overPercentage <= 20) return 40;
    return 0;
  }

  // Price below budget_min (still a valid match, just not ideal)
  if (min > 0 && price < min) {
    const underPercentage = ((min - price) / min) * 100;
    if (underPercentage <= 10) return 80;
    if (underPercentage <= 30) return 60;
    return 30;
  }

  return 0;
}

function calculateTypeScore(
  contact: { preferredPropertyTypes: string | null },
  property: { propertyType: string }
): number {
  if (!contact.preferredPropertyTypes) return 50; // no preference = neutral

  let types: string[] = [];
  try {
    const parsed = JSON.parse(contact.preferredPropertyTypes);
    if (Array.isArray(parsed)) {
      types = parsed.map((t) => String(t).toLocaleUpperCase('tr-TR'));
    } else if (typeof contact.preferredPropertyTypes === 'string') {
      types = contact.preferredPropertyTypes
        .split(',')
        .map((s) => s.trim().toLocaleUpperCase('tr-TR'))
        .filter(Boolean);
    }
  } catch {
    types = contact.preferredPropertyTypes
      .split(',')
      .map((s) => s.trim().toLocaleUpperCase('tr-TR'))
      .filter(Boolean);
  }

  if (types.length === 0) return 50;

  const propTypeUpper = property.propertyType.toLocaleUpperCase('tr-TR');

  // Exact match
  if (types.includes(propTypeUpper)) return 100;

  // Same category match
  const propCategory = getPropertyCategory(propTypeUpper);
  const contactCategories = types.map(getPropertyCategory);
  if (contactCategories.includes(propCategory)) return 50;

  return 0;
}

function calculateSizeScore(
  contact: { preferredPropertyTypes: string | null; budgetMin: number | null; budgetMax: number | null },
  property: { roomCount: string | null; grossSqm: number | null }
): number {
  // Since contacts don't have explicit room count / sqm preferences in the schema,
  // we compute a partial score based on available data.
  // This is a softer score since the current Contact model doesn't have
  // explicit room/sqm preference fields.
  let score = 50; // neutral default
  let factors = 0;

  // If property has room count, give a mid-range score (can't compare without contact pref)
  if (property.roomCount) {
    score += 0;
    factors += 1;
  }

  if (property.grossSqm) {
    // Larger properties tend to be more desirable - slight bonus
    if (property.grossSqm >= 50 && property.grossSqm <= 250) {
      score += 10;
    }
    factors += 1;
  }

  if (factors === 0) return 50;
  return Math.min(100, score);
}

function calculateFeaturesScore(
  contactFeatureCount: number,
  matchedFeatureCount: number
): number {
  if (contactFeatureCount === 0) return 50; // no preference = neutral
  return Math.round((matchedFeatureCount / contactFeatureCount) * 100);
}

function calculateTotalScore(breakdown: Omit<ScoreBreakdown, 'total'>): number {
  return Math.round(
    breakdown.location * 0.30 +
    breakdown.budget * 0.25 +
    breakdown.type * 0.20 +
    breakdown.size * 0.15 +
    breakdown.features * 0.10
  );
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class MatchingService {
  /**
   * Calculate detailed match score between a contact and a property.
   */
  calculateMatchScore(
    contact: {
      budgetMin: number | null;
      budgetMax: number | null;
      preferredLocations: string | null;
      preferredPropertyTypes: string | null;
    },
    property: {
      price: number;
      propertyType: string;
      ilId: string | null;
      ilceId: string | null;
      mahalleId: string | null;
      roomCount: string | null;
      grossSqm: number | null;
    },
    contactFeatureCount: number = 0,
    matchedFeatureCount: number = 0
  ): ScoreBreakdown {
    const location = calculateLocationScore(contact, property);
    const budget = calculateBudgetScore(contact, property);
    const type = calculateTypeScore(contact, property);
    const size = calculateSizeScore(contact, property);
    const features = calculateFeaturesScore(contactFeatureCount, matchedFeatureCount);

    const total = calculateTotalScore({ location, budget, type, size, features });

    return { location, budget, type, size, features, total };
  }

  /**
   * Find properties matching a contact's preferences.
   */
  async findMatchesForContact(contactId: string, user: AuthenticatedUser): Promise<PropertyMatchResult[]> {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) throw NotFoundError('Musteri');
    if (contact.officeId !== user.officeId) throw ForbiddenError('Bu musteriye erisim yetkiniz yok');

    // Get active properties for the office
    const properties = await prisma.property.findMany({
      where: {
        officeId: user.officeId!,
        propertyStatus: { in: ['ACTIVE', 'active'] },
      },
      include: {
        photos: {
          take: 1,
          orderBy: { orderIndex: 'asc' },
          select: { id: true, url: true, thumbnailUrl: true },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        features: {
          include: { feature: true },
        },
      },
    });

    const results: PropertyMatchResult[] = [];

    for (const property of properties) {
      const score = this.calculateMatchScore(
        contact,
        property,
        0, // contact features not tracked separately
        0
      );

      if (score.total >= 20) {
        results.push({
          property: {
            id: property.id,
            title: property.title,
            price: property.price,
            propertyType: property.propertyType,
            listingType: property.listingType,
            roomCount: property.roomCount,
            grossSqm: property.grossSqm,
            ilId: property.ilId,
            ilceId: property.ilceId,
            mahalleId: property.mahalleId,
            address: property.address,
            photos: property.photos,
            assignedUser: property.assignedUser,
          },
          score,
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score.total - a.score.total);

    return results;
  }

  /**
   * Find contacts who might want a given property.
   */
  async findMatchesForProperty(propertyId: string, user: AuthenticatedUser): Promise<ContactMatchResult[]> {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        features: { include: { feature: true } },
      },
    });

    if (!property) throw NotFoundError('Emlak ilani');
    if (property.officeId !== user.officeId) throw ForbiddenError('Bu ilana erisim yetkiniz yok');

    // Get contacts with buyer/investor interest
    const contacts = await prisma.contact.findMany({
      where: {
        officeId: user.officeId!,
        interestType: { in: ['BUYER', 'INVESTOR', 'RENTER'] },
      },
      include: {
        assignedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const propertyFeatureNames = property.features.map((pf) => pf.feature.nameTr);

    const results: ContactMatchResult[] = [];

    for (const contact of contacts) {
      const score = this.calculateMatchScore(
        contact,
        property,
        0,
        0
      );

      if (score.total >= 20) {
        results.push({
          contact: {
            id: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            phone: contact.phone,
            email: contact.email,
            budgetMin: contact.budgetMin,
            budgetMax: contact.budgetMax,
            preferredLocations: contact.preferredLocations,
            preferredPropertyTypes: contact.preferredPropertyTypes,
            interestType: contact.interestType,
            assignedUser: contact.assignedUser,
          },
          score,
        });
      }
    }

    results.sort((a, b) => b.score.total - a.score.total);

    return results;
  }

  /**
   * Get top matches across all contacts and properties in the office.
   */
  async getTopMatches(
    user: AuthenticatedUser,
    limit: number = 20
  ): Promise<Array<{ contact: ContactMatchResult['contact']; property: PropertyMatchResult['property']; score: ScoreBreakdown }>> {
    const [contacts, properties] = await Promise.all([
      prisma.contact.findMany({
        where: {
          officeId: user.officeId!,
          interestType: { in: ['BUYER', 'INVESTOR', 'RENTER'] },
        },
        include: {
          assignedUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.property.findMany({
        where: {
          officeId: user.officeId!,
          propertyStatus: { in: ['ACTIVE', 'active'] },
        },
        include: {
          photos: {
            take: 1,
            orderBy: { orderIndex: 'asc' },
            select: { id: true, url: true, thumbnailUrl: true },
          },
          assignedUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    const allMatches: Array<{
      contact: ContactMatchResult['contact'];
      property: PropertyMatchResult['property'];
      score: ScoreBreakdown;
    }> = [];

    for (const contact of contacts) {
      for (const property of properties) {
        const score = this.calculateMatchScore(contact, property);

        if (score.total >= 40) {
          allMatches.push({
            contact: {
              id: contact.id,
              firstName: contact.firstName,
              lastName: contact.lastName,
              phone: contact.phone,
              email: contact.email,
              budgetMin: contact.budgetMin,
              budgetMax: contact.budgetMax,
              preferredLocations: contact.preferredLocations,
              preferredPropertyTypes: contact.preferredPropertyTypes,
              interestType: contact.interestType,
              assignedUser: contact.assignedUser,
            },
            property: {
              id: property.id,
              title: property.title,
              price: property.price,
              propertyType: property.propertyType,
              listingType: property.listingType,
              roomCount: property.roomCount,
              grossSqm: property.grossSqm,
              ilId: property.ilId,
              ilceId: property.ilceId,
              mahalleId: property.mahalleId,
              address: property.address,
              photos: property.photos,
              assignedUser: property.assignedUser,
            },
            score,
          });
        }
      }
    }

    // Sort by total score descending, take top N
    allMatches.sort((a, b) => b.score.total - a.score.total);

    return allMatches.slice(0, limit);
  }

  /**
   * Get matching statistics for the office.
   */
  async getMatchingStats(user: AuthenticatedUser) {
    const [contactCount, propertyCount] = await Promise.all([
      prisma.contact.count({
        where: {
          officeId: user.officeId!,
          interestType: { in: ['BUYER', 'INVESTOR', 'RENTER'] },
        },
      }),
      prisma.property.count({
        where: {
          officeId: user.officeId!,
          propertyStatus: { in: ['ACTIVE', 'active'] },
        },
      }),
    ]);

    // Get top matches for stats
    const topMatches = await this.getTopMatches(user, 100);

    const totalMatches = topMatches.length;
    const averageScore = totalMatches > 0
      ? Math.round(topMatches.reduce((sum, m) => sum + m.score.total, 0) / totalMatches)
      : 0;

    // Find top performing properties (most matches)
    const propertyMatchCounts: Record<string, { count: number; title: string; avgScore: number; totalScore: number }> = {};
    for (const match of topMatches) {
      if (!propertyMatchCounts[match.property.id]) {
        propertyMatchCounts[match.property.id] = { count: 0, title: match.property.title, avgScore: 0, totalScore: 0 };
      }
      propertyMatchCounts[match.property.id].count++;
      propertyMatchCounts[match.property.id].totalScore += match.score.total;
    }

    const topProperties = Object.entries(propertyMatchCounts)
      .map(([id, data]) => ({
        propertyId: id,
        title: data.title,
        matchCount: data.count,
        averageScore: Math.round(data.totalScore / data.count),
      }))
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 5);

    // Score distribution
    const scoreDistribution = {
      excellent: topMatches.filter((m) => m.score.total >= 80).length,
      good: topMatches.filter((m) => m.score.total >= 60 && m.score.total < 80).length,
      fair: topMatches.filter((m) => m.score.total >= 40 && m.score.total < 60).length,
    };

    return {
      totalContacts: contactCount,
      totalProperties: propertyCount,
      totalMatches,
      averageScore,
      topProperties,
      scoreDistribution,
    };
  }
}

export const matchingService = new MatchingService();
