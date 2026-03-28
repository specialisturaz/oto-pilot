---
name: prisma-postgresql
description: Use when working with Prisma schema, writing database queries, creating migrations, optimizing PostgreSQL performance, or managing the database layer of the Emlak CRM project
---

# Prisma + PostgreSQL Patterns for Emlak CRM

## Overview
Reference guide for Prisma 6 with PostgreSQL 16 patterns specific to this Turkish real estate CRM. Covers schema design, query optimization, migrations, and Turkish locale handling.

## Schema Conventions

All models in this project follow these rules:
- Fields use @map() for snake_case database columns
- Models use @@map() for snake_case table names
- IDs are UUIDs with @default(uuid())
- Timestamps: createdAt @default(now()), updatedAt @updatedAt
- Soft delete: deletedAt DateTime? field
- Multi-tenant: officeId required on all tenant-scoped models
- Currency: Decimal type (not Float) for money fields
- Enums: UPPER_SNAKE_CASE matching Turkish real estate terminology

## Common Query Patterns

### Tenant-Isolated List with Pagination

```typescript
const properties = await prisma.property.findMany({
  where: {
    officeId,
    status: "ACTIVE",
    deletedAt: null,
    ...(propertyType && { propertyType }),
    ...(ilId && { ilId }),
  },
  select: {
    id: true, title: true, price: true, currency: true,
    propertyType: true, listingType: true, roomCount: true,
    grossArea: true, netArea: true,
    il: { select: { name: true } },
    ilce: { select: { name: true } },
    images: { select: { url: true }, take: 1 },
  },
  orderBy: { createdAt: "desc" },
  take: pageSize,
  skip: page * pageSize,
});
```

### Transaction for Deal Stage Change

```typescript
await prisma.$transaction(async (tx) => {
  const deal = await tx.deal.update({
    where: { id: dealId },
    data: { stage: newStage, updatedAt: new Date() },
  });

  await tx.dealHistory.create({
    data: {
      dealId, fromStage: oldStage, toStage: newStage,
      changedById: userId,
    },
  });

  if (newStage === "COMPLETED") {
    await tx.commission.updateMany({
      where: { dealId },
      data: { status: "PAYABLE" },
    });
  }
  return deal;
});
```

### Full-Text Search (Turkish)

```sql
SELECT id, title, price, property_type
FROM property
WHERE office_id = ${officeId}
  AND to_tsvector("turkish", title || " " || COALESCE(description, ""))
      @@ plainto_tsquery("turkish", ${searchTerm})
  AND deleted_at IS NULL
ORDER BY ts_rank(
  to_tsvector("turkish", title || " " || COALESCE(description, "")),
  plainto_tsquery("turkish", ${searchTerm})
) DESC
LIMIT 20;
```

## Index Strategy

Essential indexes for this project:
- property(office_id, status) -- most common filter
- property(office_id, listing_type, property_type) -- listing page filters
- property(office_id, il_id, ilce_id) -- location-based search
- contact(office_id, status) -- contact list
- contact(office_id, source) -- lead source analysis
- deal(office_id, stage) -- pipeline view
- deal(office_id, agent_id, stage) -- agent performance
- commission(deal_id, status) -- commission tracking

## Migration Safety Rules

1. Never drop columns in the same migration that adds replacements
2. Add new columns as nullable first, backfill, then add NOT NULL constraint
3. Test migrations against production-size data (81 provinces x thousands of properties)
4. Always have a rollback plan
5. Use prisma migrate dev for development, prisma migrate deploy for production

## Turkish Locale Handling

- Use "turkish" dictionary for full-text search
- Be aware of Turkish I/i case sensitivity (I != i in Turkish)
- Store all dates as UTC, display in Europe/Istanbul timezone
- Currency: TRY as default, support USD/EUR/GBP with exchange rates