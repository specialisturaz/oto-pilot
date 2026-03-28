# Database Review Skill

Agents reference this document when reviewing Prisma schema changes, writing migrations, optimizing queries, or auditing data compliance. Every database-related change MUST pass these checks.

---

## 1. Prisma Schema Validation

### Model Structure
- [ ] Every model has an `id` field (UUID string, `@default(uuid())`).
- [ ] Every model has `createdAt` and `updatedAt` timestamps with `@default(now())` and `@updatedAt`.
- [ ] All field names use `camelCase` in Prisma; database columns use `snake_case` via `@map()`.
- [ ] Model names use `PascalCase` and `@@map()` to snake_case table names.
- [ ] Enums use `UPPER_SNAKE_CASE` and `@@map()` to lowercase table names.

### Example Model Pattern
```prisma
model Property {
  id          String   @id @default(uuid()) @map("id")
  title       String   @map("title")
  description String?  @map("description") @db.Text
  price       Decimal  @map("price") @db.Decimal(15, 2)
  currency    Currency @default(TRY) @map("currency")
  status      PropertyStatus @default(ACTIVE) @map("status")

  // Turkish-specific fields
  metreKare   Int?     @map("metre_kare")
  odaSayisi   Int?     @map("oda_sayisi")
  binaYasi    Int?     @map("bina_yasi")
  kat         Int?     @map("kat")
  toplamKat   Int?     @map("toplam_kat")
  adaNo       String?  @map("ada_no")
  parselNo    String?  @map("parsel_no")
  tapuDurumu  TapuDurumu? @map("tapu_durumu")
  iskanlimi   Boolean  @default(false) @map("iskanli_mi")
  daskVar     Boolean  @default(false) @map("dask_var")

  // Relations
  officeId    String   @map("office_id")
  office      Office   @relation(fields: [officeId], references: [id])
  agentId     String   @map("agent_id")
  agent       User     @relation("AgentProperties", fields: [agentId], references: [id])
  ilId        String   @map("il_id")
  il          Il       @relation(fields: [ilId], references: [id])
  ilceId      String   @map("ilce_id")
  ilce        Ilce     @relation(fields: [ilceId], references: [id])
  mahalleId   String?  @map("mahalle_id")
  mahalle     Mahalle? @relation(fields: [mahalleId], references: [id])

  // Metadata
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  // Indexes
  @@index([officeId, status])
  @@index([ilId, ilceId, status])
  @@index([agentId])
  @@index([price])
  @@index([createdAt])

  @@map("properties")
}
```

### Relation Rules
- [ ] Every foreign key has a corresponding `@relation` directive.
- [ ] Cascade delete is used ONLY where parent-child ownership is clear (e.g., Office -> User).
- [ ] For soft-delete entities, use `deletedAt DateTime?` instead of actual deletion.
- [ ] Many-to-many relations use explicit join tables (not implicit Prisma relations) for auditability.

### Field Type Guidelines

| Data Type | Prisma Type | Notes |
|---|---|---|
| Money/Price | `Decimal @db.Decimal(15, 2)` | Never use `Float` for money |
| Turkish Text | `String @db.Text` | For long descriptions |
| Phone Number | `String` | Store as `+90XXXXXXXXXX` format |
| TC Kimlik No | `String` | 11-digit, store encrypted |
| Email | `String` | Lowercase, validated |
| Date only | `DateTime` | Use `@db.Date` for date-only fields |
| Coordinates | `Float` | Separate `latitude`/`longitude` fields |
| JSON data | `Json` | Only for truly dynamic/unstructured data |

---

## 2. Index Optimization

### Required Indexes
Every query that appears in a WHERE clause on a list endpoint MUST have a supporting index.

#### Core Indexes for Property Search
```prisma
// Property listing filters
@@index([officeId, status])                    // Office's active listings
@@index([ilId, ilceId, status])               // Location-based search
@@index([listingType, propertyType, status])   // Type filters
@@index([price])                               // Price range filter
@@index([metreKare])                           // Size range filter
@@index([createdAt])                           // Sort by newest
@@index([status, createdAt])                   // Active listings by date
```

#### Core Indexes for Contact Search
```prisma
@@index([officeId, status])           // Office's contacts
@@index([assignedAgentId])            // Agent's contacts
@@index([email])                      // Email lookup (unique constraint)
@@index([phone])                      // Phone lookup
@@index([createdAt])                  // Recent contacts
```

#### Core Indexes for Deal Pipeline
```prisma
@@index([officeId, stage])            // Pipeline view
@@index([agentId, stage])             // Agent's pipeline
@@index([propertyId])                 // Deals for a property
@@index([contactId])                  // Deals for a contact
@@index([expectedCloseDate])          // Upcoming closings
```

### Composite Index Rules
- Place the most selective column first (e.g., `officeId` before `status`).
- Include columns that appear in both WHERE and ORDER BY in a single composite index.
- Avoid indexes wider than 3 columns; they consume storage and slow writes.
- Review `EXPLAIN ANALYZE` output for queries that take > 100ms.

### Index Anti-Patterns
- Do NOT index boolean fields alone (low cardinality).
- Do NOT create separate single-column indexes when a composite would serve both queries.
- Do NOT index `Json` fields (use computed/extracted columns instead).
- Do NOT forget to index foreign keys (Prisma does NOT auto-create FK indexes).

---

## 3. N+1 Query Detection

### What to Look For
An N+1 query occurs when code fetches a list of records, then fetches related data for each record individually.

#### Bad Pattern (N+1)
```typescript
// DO NOT DO THIS
const properties = await prisma.property.findMany({ where: { officeId } });
for (const prop of properties) {
  const agent = await prisma.user.findUnique({ where: { id: prop.agentId } });
  prop.agentName = agent?.name;
}
```

#### Good Pattern (Eager Loading)
```typescript
// USE THIS INSTEAD
const properties = await prisma.property.findMany({
  where: { officeId },
  include: {
    agent: { select: { id: true, name: true, avatar: true } },
    il: { select: { name: true } },
    ilce: { select: { name: true } },
  },
});
```

#### Good Pattern (Batch Loading)
```typescript
// WHEN INCLUDE IS TOO HEAVY
const properties = await prisma.property.findMany({ where: { officeId } });
const agentIds = [...new Set(properties.map(p => p.agentId))];
const agents = await prisma.user.findMany({
  where: { id: { in: agentIds } },
  select: { id: true, name: true, avatar: true },
});
const agentMap = new Map(agents.map(a => [a.id, a]));
```

### Detection Checklist
- [ ] No Prisma calls inside `for`, `forEach`, `map`, or `reduce` loops.
- [ ] List endpoints use `include` or batch queries for related data.
- [ ] Dashboard aggregations use `groupBy` or raw aggregation queries, not JS loops.
- [ ] Prisma query logging is enabled in development (`log: ['query']`) to spot N+1 patterns.

---

## 4. Turkish Locale Handling in PostgreSQL

### Collation
```sql
-- Database should be created with Turkish collation
CREATE DATABASE emlak_crm
  WITH ENCODING = 'UTF8'
  LC_COLLATE = 'tr_TR.UTF-8'
  LC_CTYPE = 'tr_TR.UTF-8'
  TEMPLATE = template0;
```

### Case-Insensitive Search with Turkish Characters
Turkish has special case rules: `I` lowercases to `i` (not `i`), `I` lowercases to `i`.

```sql
-- Use COLLATE "tr_TR" for Turkish-aware comparisons
SELECT * FROM properties
WHERE title COLLATE "tr_TR" ILIKE '%kadikoy%';
```

In Prisma, use raw queries for Turkish-aware case-insensitive search:
```typescript
const results = await prisma.$queryRaw`
  SELECT * FROM properties
  WHERE title COLLATE "tr_TR" ILIKE ${`%${searchTerm}%`}
  AND status = 'ACTIVE'
  ORDER BY created_at DESC
  LIMIT ${limit} OFFSET ${offset}
`;
```

### Turkish Character Considerations
- Sort order: Turkish alphabet has `c, g, i, o, s, u` which sort differently than their dotless/unaccented counterparts.
- Store data in UTF-8 always.
- Search should be accent-insensitive: searching "Kadikoy" should match "Kadikoy" (use `unaccent` extension).

```sql
-- Enable unaccent extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Use in queries
SELECT * FROM properties
WHERE unaccent(title) ILIKE unaccent('%kadikoy%');
```

### Prisma Schema for Turkish Locale
```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## 5. Migration Safety Checks

### Pre-Migration Checklist
- [ ] Migration SQL has been reviewed (run `npx prisma migrate diff` to preview).
- [ ] No `DROP COLUMN` on columns that still have application code referencing them.
- [ ] No `NOT NULL` constraint added to existing columns without a `DEFAULT` or data migration.
- [ ] No column type changes that would lose data (e.g., `String` -> `Int`).
- [ ] Large table alterations use `ALTER TABLE ... ADD COLUMN` (non-blocking) not full table rewrites.

### Migration Naming Convention
```
YYYYMMDDHHMMSS_descriptive_name
```
Examples:
- `20260315120000_add_dask_field_to_properties`
- `20260320090000_create_portal_sync_logs_table`
- `20260325140000_add_kvkk_consent_fields_to_contacts`

### Rollback Strategy
- Every migration that modifies data MUST have a documented rollback plan.
- For additive changes (new columns, new tables): rollback is safe (just remove).
- For destructive changes (drop column, rename): require a two-phase migration:
  1. Phase 1: Add new column, deploy code that writes to both old and new.
  2. Phase 2: Migrate data, deploy code that reads only from new, drop old column.

### Zero-Downtime Migration Rules
1. Never rename a column in a single migration. Use add-copy-drop across 3 deployments.
2. Never drop a table or column that is still read by running application code.
3. Add new `NOT NULL` columns with a `DEFAULT` value first, then remove the default later.
4. Create new indexes with `CREATE INDEX CONCURRENTLY` (use raw SQL in migration for this).

### Running Migrations
```bash
# Development (creates migration file and applies)
npx prisma migrate dev --name description_here

# Production (applies pending migrations only)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Reset (DEVELOPMENT ONLY - destroys all data)
npx prisma migrate reset
```

---

## 6. KVKK Data Retention Compliance

### Personal Data Inventory

| Field | Model | Sensitivity | Retention |
|---|---|---|---|
| TC Kimlik No | Contact | HIGH | Encrypt at rest, delete on KVKK request |
| Full Name | Contact, User | MEDIUM | Retain while account active |
| Email | Contact, User | MEDIUM | Retain while account active |
| Phone | Contact, User | MEDIUM | Retain while account active |
| Address | Contact, Property | MEDIUM | Retain while relevant |
| IP Address | AuditLog | LOW | 90 days |
| Session Data | Session | LOW | 30 days |

### Data Retention Policies

#### Automatic Cleanup
```typescript
// Scheduled job: runs nightly
async function enforceDataRetention(): Promise<void> {
  const now = new Date();

  // 1. Delete expired sessions (30 days)
  await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: now },
    },
  });

  // 2. Anonymize audit logs older than 90 days
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  await prisma.auditLog.updateMany({
    where: {
      createdAt: { lt: ninetyDaysAgo },
      anonymized: false,
    },
    data: {
      ipAddress: null,
      userAgent: null,
      anonymized: true,
    },
  });

  // 3. Flag contacts without activity for 2 years for review
  const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
  await prisma.contact.updateMany({
    where: {
      lastActivityAt: { lt: twoYearsAgo },
      retentionFlag: null,
    },
    data: {
      retentionFlag: 'REVIEW_REQUIRED',
    },
  });
}
```

#### KVKK Right to Be Forgotten
```typescript
async function handleKvkkDeletionRequest(contactId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 1. Anonymize the contact record (do not delete - preserve deal history)
    await tx.contact.update({
      where: { id: contactId },
      data: {
        firstName: 'ANONYMIZED',
        lastName: 'ANONYMIZED',
        email: `deleted-${contactId}@anonymized.local`,
        phone: null,
        tcKimlikNo: null,
        address: null,
        notes: null,
        kvkkDeletedAt: new Date(),
      },
    });

    // 2. Delete related personal documents
    await tx.document.deleteMany({
      where: { contactId, isPersonal: true },
    });

    // 3. Log the deletion for audit
    await tx.auditLog.create({
      data: {
        action: 'KVKK_DELETION',
        entityType: 'Contact',
        entityId: contactId,
        details: 'Contact data anonymized per KVKK deletion request',
      },
    });
  });
}
```

### Encryption at Rest
- TC Kimlik numbers MUST be encrypted using AES-256-GCM before storage.
- The encryption key is stored in environment variables, never in code or database.
- Prisma middleware handles transparent encrypt/decrypt:

```typescript
prisma.$use(async (params, next) => {
  // Encrypt TC Kimlik on write
  if (params.model === 'Contact' && ['create', 'update'].includes(params.action)) {
    if (params.args.data?.tcKimlikNo) {
      params.args.data.tcKimlikNo = encrypt(params.args.data.tcKimlikNo);
    }
  }

  const result = await next(params);

  // Decrypt TC Kimlik on read
  if (params.model === 'Contact' && result?.tcKimlikNo) {
    result.tcKimlikNo = decrypt(result.tcKimlikNo);
  }

  return result;
});
```

---

## Review Output Format

When an agent completes a database review, produce output as:

```json
{
  "reviewId": "db-review-{timestamp}",
  "scope": "schema | migration | query | retention",
  "verdict": "APPROVED | CHANGES_REQUESTED | BLOCKED",
  "findings": [
    {
      "severity": "CRITICAL | HIGH | MEDIUM | LOW",
      "category": "schema | index | n-plus-one | locale | migration | kvkk",
      "location": "prisma/schema.prisma:42 or src/backend/...",
      "message": "Description",
      "suggestion": "Fix recommendation"
    }
  ]
}
```
