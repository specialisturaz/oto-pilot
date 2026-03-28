# Code Review Skill

Agents reference this document when performing code reviews on the Emlak CRM codebase. Every pull request, task output, or code change MUST be evaluated against the checklist below before being marked COMPLETED.

---

## 1. Architecture Compliance

### Layer Boundaries
- Backend code (`src/backend/`) MUST NOT import from `src/frontend/`.
- Frontend code (`src/frontend/`) MUST NOT import from `src/backend/` directly; it communicates via API calls only.
- Shared types (`src/shared/`) MUST NOT import from either backend or frontend.
- Integration modules (`src/integrations/`) may import from `src/shared/` and `src/backend/services/` but NOT from controllers or routes.

### Module Structure
- Each backend module follows: `routes/ -> controllers/ -> services/ -> repositories/`.
- Controllers handle HTTP concerns (request parsing, response shaping). They MUST NOT contain business logic.
- Services contain business logic. They MUST NOT access `req` or `res` objects.
- Repositories encapsulate Prisma queries. Services call repositories, never Prisma directly.

### Naming Conventions
- Files: `kebab-case.ts` (e.g., `property-service.ts`).
- Classes/Interfaces: `PascalCase` (e.g., `PropertyService`, `CreatePropertyDto`).
- Functions/variables: `camelCase` (e.g., `findActiveListings`).
- Database columns: `snake_case` via Prisma `@map()`.
- Enums: `UPPER_SNAKE_CASE` (e.g., `TAPU_TRANSFER`, `KAT_MULKIYETI`).
- Turkish characters appear in data values and user-facing strings only, never in code identifiers.

---

## 2. Security Review (OWASP Top 10 + KVKK)

### Authentication & Authorization
- [ ] All non-public endpoints require JWT authentication middleware.
- [ ] Role-based access control (RBAC) is enforced: `ADMIN`, `MANAGER`, `AGENT`, `VIEWER`.
- [ ] JWT tokens have reasonable expiry (access: 15min, refresh: 7d).
- [ ] Refresh token rotation is implemented (old tokens are invalidated).
- [ ] Password hashing uses `bcryptjs` with salt rounds >= 12.

### Injection Prevention
- [ ] All user input is validated with Zod schemas BEFORE reaching services.
- [ ] Prisma parameterized queries are used exclusively; no raw SQL with string interpolation.
- [ ] File upload names are sanitized; no path traversal is possible.
- [ ] HTML output is escaped; React's JSX auto-escaping is not bypassed with `dangerouslySetInnerHTML` without explicit sanitization.

### KVKK (Kisisel Verilerin Korunmasi Kanunu) Compliance
- [ ] Personal data fields (TC Kimlik No, telefon, email, adres) are identified and documented.
- [ ] Data access is logged for audit (who accessed which personal data, when).
- [ ] Data retention policies are enforced: inactive contacts archived after the configured period.
- [ ] Data export endpoint exists for "right to access" requests (`GET /api/contacts/:id/kvkk-export`).
- [ ] Data deletion endpoint exists for "right to be forgotten" requests (`DELETE /api/contacts/:id/kvkk-delete`).
- [ ] Consent tracking fields exist on Contact model (`kvkkConsentDate`, `kvkkConsentType`).
- [ ] Personal data is never logged in plaintext (mask TC Kimlik, phone numbers in log output).

### Common Vulnerabilities
- [ ] CORS is configured to allow only the frontend origin, not `*`.
- [ ] Rate limiting is applied to authentication endpoints (max 5 attempts/minute).
- [ ] HTTP security headers are set (Helmet.js): `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`.
- [ ] Sensitive data (passwords, tokens) never appears in API responses.
- [ ] Error responses do not leak stack traces or internal details in production.

---

## 3. TypeScript Best Practices

### Type Safety
- [ ] `strict: true` is maintained in `tsconfig.json`; no `// @ts-ignore` or `// @ts-expect-error` without a documented reason.
- [ ] `any` is not used. If a type is truly unknown, use `unknown` with type guards.
- [ ] Return types are explicitly declared on exported functions and public methods.
- [ ] Union types are exhaustively handled (use `satisfies` or `switch` with `never` default).

### Code Quality
- [ ] No unused imports or variables (enforced by ESLint `no-unused-vars`).
- [ ] `const` is preferred over `let`; `let` is used only when reassignment is necessary.
- [ ] Async/await is used consistently; no mixing of `.then()` chains and `await`.
- [ ] Error handling: `try/catch` blocks catch specific errors, not generic `catch (e)` that swallows everything silently.
- [ ] Magic numbers and strings are extracted into named constants.

### Project-Specific Patterns
- [ ] Zod schemas are defined alongside their TypeScript types using `z.infer<typeof schema>`.
- [ ] DTOs (Data Transfer Objects) are separate from Prisma model types.
- [ ] All API route handlers are wrapped in an `asyncHandler` to catch unhandled promise rejections.
- [ ] Shared enums between frontend and backend live in `src/shared/constants/`.

---

## 4. Prisma Query Optimization

### Query Efficiency
- [ ] `select` or `include` is used to fetch only needed fields; no bare `findMany()` without field selection on large tables.
- [ ] Pagination is implemented on all list endpoints (cursor-based for infinite scroll, offset-based for admin tables).
- [ ] `count` queries use `_count` aggregation, not fetching all records and counting in JS.
- [ ] Batch operations use `createMany`, `updateMany`, or `deleteMany` where applicable.

### Relation Loading
- [ ] N+1 queries are avoided: related data is loaded via `include` in a single query, not in a loop.
- [ ] Deep nesting in `include` is limited to 2 levels; deeper data is fetched in separate queries.
- [ ] `findFirst` is used instead of `findMany()[0]` when only one record is needed.

### Transaction Safety
- [ ] Operations that modify multiple tables use `prisma.$transaction()`.
- [ ] Transaction timeout is set appropriately (default 5s, extended for bulk operations).
- [ ] Optimistic concurrency control is used for frequently updated records (e.g., `version` field on Property).

---

## 5. Turkish Domain Terminology Validation

When reviewing code that deals with real estate domain concepts, verify correct usage:

| Turkish Term | English Context | Where Used |
|---|---|---|
| Gayrimenkul | Property/Listing | Property model, search |
| Musteri | Client/Contact | Contact model |
| Danisman | Agent/Advisor | User role |
| Tapu | Title Deed | Deal stage, Property field |
| DASK | Earthquake Insurance | Property field |
| Iskan | Occupancy Permit | Property field |
| Ada/Parsel | Block/Parcel | Property land registry |
| Aidat | Monthly Dues | Property field |
| Kat Mulkiyeti | Condo Ownership | Property ownership type |
| Kat Irtifaki | Construction Servitude | Property ownership type |
| Komisyon | Commission | Commission model |
| Il/Ilce/Mahalle | Province/District/Neighborhood | Location hierarchy |
| Emlak Ofisi | Real Estate Office | Office model |
| Satis Sureci | Sales Process | Deal pipeline |

- [ ] Enum values match standard Turkish RE terminology.
- [ ] User-facing labels use proper Turkish (with i/I, o/u, c/s/g distinctions).
- [ ] Error messages intended for end users are in Turkish.
- [ ] Internal logs and developer-facing messages remain in English.

---

## 6. Performance Patterns

### Backend
- [ ] Database queries that power listing search use appropriate indexes (verified in schema).
- [ ] Expensive computations (commission calculations, report generation) are offloaded to Bull queues.
- [ ] Redis caching is applied to: portal listing status, user sessions, frequently-read reference data (Il/Ilce lists).
- [ ] Cache invalidation strategy is documented and implemented for each cached resource.
- [ ] File uploads stream to storage; no in-memory buffering of large files.

### Frontend
- [ ] Images use Next.js `<Image>` component with proper `sizes` and `priority` attributes.
- [ ] Large lists use virtualization (e.g., `@tanstack/react-virtual`).
- [ ] Bundle size: no unnecessary imports from large libraries; use tree-shakeable imports.
- [ ] React Query stale times are set appropriately: reference data (5min), listings (1min), user data (30s).
- [ ] Client components are minimized; prefer Server Components for data-fetching pages.

### General
- [ ] No synchronous file I/O in request handlers (backend).
- [ ] Environment variables are validated at startup, not on first use.
- [ ] Health check endpoint (`GET /api/health`) exists and responds within 100ms.

---

## Review Output Format

When an agent completes a code review, it MUST produce output in this structure:

```json
{
  "reviewId": "review-{timestamp}",
  "taskId": "the-task-being-reviewed",
  "verdict": "APPROVED | CHANGES_REQUESTED | BLOCKED",
  "summary": "One-line summary of findings",
  "findings": [
    {
      "severity": "CRITICAL | HIGH | MEDIUM | LOW | INFO",
      "category": "security | architecture | typescript | prisma | domain | performance",
      "file": "path/to/file.ts",
      "line": 42,
      "message": "Description of the issue",
      "suggestion": "How to fix it"
    }
  ],
  "checklist": {
    "architecture": true,
    "security": true,
    "typescript": true,
    "prisma": true,
    "domain": true,
    "performance": true
  }
}
```

A review with any CRITICAL finding MUST have verdict `BLOCKED`. A review with HIGH findings SHOULD have verdict `CHANGES_REQUESTED` unless there is a documented justification.
