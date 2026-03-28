# API Design Skill

Agents reference this document when designing, building, or reviewing Express.js API endpoints for the Emlak CRM backend. All API work MUST follow these conventions.

---

## 1. RESTful Conventions

### URL Structure
```
Base: /api/v1

Resources (nouns, plural, lowercase):
  /api/v1/properties
  /api/v1/contacts
  /api/v1/deals
  /api/v1/users
  /api/v1/offices
  /api/v1/commissions
  /api/v1/portals

Nested resources (max 1 level of nesting):
  /api/v1/offices/:officeId/properties
  /api/v1/properties/:propertyId/images
  /api/v1/deals/:dealId/commissions
  /api/v1/contacts/:contactId/activities

Actions (when CRUD does not fit):
  POST /api/v1/properties/:id/publish       (publish to portals)
  POST /api/v1/properties/:id/archive       (archive listing)
  POST /api/v1/deals/:id/advance            (advance pipeline stage)
  POST /api/v1/auth/login
  POST /api/v1/auth/logout
  POST /api/v1/auth/refresh
  GET  /api/v1/contacts/:id/kvkk-export     (KVKK data export)
  DELETE /api/v1/contacts/:id/kvkk-delete   (KVKK right to be forgotten)
```

### HTTP Methods

| Method | Usage | Idempotent | Response Code |
|---|---|---|---|
| GET | Retrieve resource(s) | Yes | 200 |
| POST | Create resource | No | 201 |
| PUT | Full replace | Yes | 200 |
| PATCH | Partial update | Yes | 200 |
| DELETE | Remove resource | Yes | 204 |

### Naming Rules
- Resource names: plural nouns in English (`properties`, not `gayrimenkul`).
- URL segments: kebab-case (`kvkk-export`, not `kvkkExport`).
- Query parameters: camelCase (`listingType`, `priceMin`, `sortBy`).
- Response field names: camelCase to match TypeScript conventions.

---

## 2. Zod Validation Patterns

### Request Validation Middleware
```typescript
// middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export function validate(schema: {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query) as any;
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params) as any;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Girilen veriler gecersiz',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
              code: e.code,
            })),
          },
        });
      }
      next(error);
    }
  };
}
```

### Schema Definition Pattern
```typescript
// schemas/property-schema.ts
import { z } from 'zod';

// Shared field definitions
const priceSchema = z.number().positive('Fiyat pozitif olmalidir');
const currencySchema = z.enum(['TRY', 'USD', 'EUR', 'GBP']).default('TRY');

// Create schema (POST)
export const createPropertySchema = z.object({
  title: z.string().min(5, 'Baslik en az 5 karakter olmalidir').max(200),
  description: z.string().max(5000).optional(),
  propertyType: z.enum([
    'DAIRE', 'VILLA', 'MUSTAKIL_EV', 'RESIDENCE',
    'ARSA', 'TARLA', 'ISYERI', 'OFIS', 'DUKKAN', 'DEPO',
  ]),
  listingType: z.enum(['SATILIK', 'KIRALIK', 'GUNLUK_KIRALIK', 'DEVREN_SATILIK']),
  price: priceSchema,
  currency: currencySchema,
  metreKare: z.number().int().positive().optional(),
  odaSayisi: z.number().int().min(0).optional(),
  binaYasi: z.number().int().min(0).optional(),
  kat: z.number().int().optional(),
  toplamKat: z.number().int().positive().optional(),
  ilId: z.string().uuid(),
  ilceId: z.string().uuid(),
  mahalleId: z.string().uuid().optional(),
});

// Update schema (PATCH) - all fields optional
export const updatePropertySchema = createPropertySchema.partial();

// Query schema (GET list)
export const propertyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['price', 'createdAt', 'metreKare', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  listingType: z.enum(['SATILIK', 'KIRALIK', 'GUNLUK_KIRALIK', 'DEVREN_SATILIK']).optional(),
  propertyType: z.string().optional(),
  ilId: z.string().uuid().optional(),
  ilceId: z.string().uuid().optional(),
  priceMin: z.coerce.number().positive().optional(),
  priceMax: z.coerce.number().positive().optional(),
  metreKareMin: z.coerce.number().positive().optional(),
  metreKareMax: z.coerce.number().positive().optional(),
  status: z.enum(['ACTIVE', 'PASSIVE', 'SOLD', 'RENTED']).optional(),
  search: z.string().max(200).optional(),
});

// Params schema
export const propertyParamsSchema = z.object({
  id: z.string().uuid('Gecersiz gayrimenkul ID'),
});

// Infer TypeScript types from schemas
export type CreatePropertyDto = z.infer<typeof createPropertySchema>;
export type UpdatePropertyDto = z.infer<typeof updatePropertySchema>;
export type PropertyQueryDto = z.infer<typeof propertyQuerySchema>;
```

### Route Registration
```typescript
// routes/property-routes.ts
import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { PropertyController } from '../controllers/property-controller';
import {
  createPropertySchema,
  updatePropertySchema,
  propertyQuerySchema,
  propertyParamsSchema,
} from '../schemas/property-schema';

const router = Router();
const controller = new PropertyController();

router.get(
  '/',
  authenticate,
  validate({ query: propertyQuerySchema }),
  controller.list,
);

router.get(
  '/:id',
  authenticate,
  validate({ params: propertyParamsSchema }),
  controller.getById,
);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'MANAGER', 'AGENT'),
  validate({ body: createPropertySchema }),
  controller.create,
);

router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER', 'AGENT'),
  validate({ params: propertyParamsSchema, body: updatePropertySchema }),
  controller.update,
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  validate({ params: propertyParamsSchema }),
  controller.delete,
);

export default router;
```

---

## 3. Error Response Standards

### Envelope Pattern
All API responses follow a consistent envelope:

```typescript
// Success response
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error response
interface ErrorResponse {
  success: false;
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Turkish user-facing message
    details?: unknown[];    // Validation details, debug info
    requestId?: string;     // For tracing
  };
}
```

### Standard Error Codes

| HTTP Status | Code | Turkish Message |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Girilen veriler gecersiz |
| 400 | `BAD_REQUEST` | Gecersiz istek |
| 401 | `UNAUTHORIZED` | Oturum acmaniz gerekiyor |
| 401 | `TOKEN_EXPIRED` | Oturumunuz sona erdi, lutfen tekrar giris yapin |
| 403 | `FORBIDDEN` | Bu islemi yapma yetkiniz yok |
| 404 | `NOT_FOUND` | Kayit bulunamadi |
| 404 | `PROPERTY_NOT_FOUND` | Gayrimenkul bulunamadi |
| 404 | `CONTACT_NOT_FOUND` | Musteri bulunamadi |
| 404 | `DEAL_NOT_FOUND` | Satis sureci bulunamadi |
| 409 | `CONFLICT` | Bu kayit zaten mevcut |
| 409 | `DUPLICATE_EMAIL` | Bu email adresi zaten kayitli |
| 422 | `UNPROCESSABLE` | Islem gerceklestirilemedi |
| 429 | `RATE_LIMITED` | Cok fazla istek gonderdiniz, lutfen bekleyin |
| 500 | `INTERNAL_ERROR` | Bir hata olustu, lutfen daha sonra tekrar deneyin |
| 503 | `SERVICE_UNAVAILABLE` | Servis gecici olarak kullanilamaz |

### Error Handler Middleware
```typescript
// middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Log the full error internally
  console.error(`[ERROR] ${req.method} ${req.path}:`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    requestId: req.headers['x-request-id'],
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId: req.headers['x-request-id'],
      },
    });
    return;
  }

  // Unexpected errors: never expose internals
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Bir hata olustu, lutfen daha sonra tekrar deneyin',
      requestId: req.headers['x-request-id'],
    },
  });
}
```

### Custom Error Classes
```typescript
// utils/app-error.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Kayit') {
    super(404, 'NOT_FOUND', `${resource} bulunamadi`);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Oturum acmaniz gerekiyor') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super(403, 'FORBIDDEN', 'Bu islemi yapma yetkiniz yok');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Bu kayit zaten mevcut') {
    super(409, 'CONFLICT', message);
  }
}
```

---

## 4. Pagination

### Offset-Based Pagination (Admin Tables)
Used for: property lists, contact lists, any table with page numbers.

```typescript
// Request: GET /api/v1/properties?page=2&limit=20

// Response:
{
  "success": true,
  "data": [ /* 20 items */ ],
  "meta": {
    "page": 2,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

Implementation:
```typescript
async function listProperties(query: PropertyQueryDto) {
  const { page, limit, sortBy, sortOrder, ...filters } = query;
  const skip = (page - 1) * limit;

  const where = buildWhereClause(filters);

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        agent: { select: { id: true, name: true } },
        il: { select: { name: true } },
        ilce: { select: { name: true } },
      },
    }),
    prisma.property.count({ where }),
  ]);

  return {
    data: properties,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

### Cursor-Based Pagination (Infinite Scroll)
Used for: activity feeds, message threads, portal sync logs.

```typescript
// Request: GET /api/v1/activities?cursor=abc123&limit=20

// Response:
{
  "success": true,
  "data": [ /* 20 items */ ],
  "meta": {
    "nextCursor": "def456",
    "hasMore": true
  }
}
```

Implementation:
```typescript
async function listActivities(cursor?: string, limit: number = 20) {
  const activities = await prisma.activity.findMany({
    take: limit + 1, // Fetch one extra to determine hasMore
    ...(cursor ? {
      cursor: { id: cursor },
      skip: 1, // Skip the cursor itself
    } : {}),
    orderBy: { createdAt: 'desc' },
  });

  const hasMore = activities.length > limit;
  const data = hasMore ? activities.slice(0, -1) : activities;
  const nextCursor = hasMore ? data[data.length - 1].id : undefined;

  return {
    data,
    meta: { nextCursor, hasMore },
  };
}
```

### When to Use Which
- **Offset**: When users need to jump to specific pages, see total count, or export ranges.
- **Cursor**: When data is chronologically ordered, frequently updated, or used in infinite scroll.

---

## 5. Rate Limiting Strategies

### Configuration
```typescript
// middleware/rate-limiter.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../lib/redis';

// Global rate limiter (all endpoints)
export const globalLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args: string[]) => redis.call(...args) }),
  windowMs: 60 * 1000,    // 1 minute window
  max: 100,                // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Cok fazla istek gonderdiniz, lutfen bekleyin',
    },
  },
});

// Strict limiter for auth endpoints
export const authLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args: string[]) => redis.call(...args) }),
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 5,                    // 5 attempts
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Cok fazla basarisiz giris denemesi. Lutfen 15 dakika bekleyin.',
    },
  },
});

// Upload limiter
export const uploadLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args: string[]) => redis.call(...args) }),
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Cok fazla dosya yukleme denemesi, lutfen bekleyin',
    },
  },
});
```

### Limiter Assignments

| Endpoint Pattern | Limiter | Max Requests |
|---|---|---|
| `POST /auth/login` | authLimiter | 5 per 15 min |
| `POST /auth/register` | authLimiter | 5 per 15 min |
| `POST /auth/forgot-password` | authLimiter | 3 per 15 min |
| `POST */upload` | uploadLimiter | 10 per min |
| `POST /properties/*/publish` | uploadLimiter | 10 per min |
| All other endpoints | globalLimiter | 100 per min |

---

## 6. Turkish Error Messages

All user-facing error messages MUST be in Turkish. Internal error messages (logs, developer tools) remain in English.

### Validation Error Messages (Zod)
```typescript
// Use Turkish messages in Zod schemas
z.string().min(5, 'Baslik en az 5 karakter olmalidir')
z.number().positive('Fiyat pozitif olmalidir')
z.string().email('Gecerli bir email adresi giriniz')
z.string().regex(/^\+90\d{10}$/, 'Gecerli bir telefon numarasi giriniz (+90XXXXXXXXXX)')
z.string().length(11, 'TC Kimlik numarasi 11 haneli olmalidir')
z.enum(['SATILIK', 'KIRALIK'], { errorMap: () => ({ message: 'Gecerli bir ilan tipi seciniz' }) })
z.string().uuid('Gecersiz ID formati')
```

### Custom Turkish Error Map for Zod
```typescript
// lib/zod-turkish.ts
import { z } from 'zod';

const turkishErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return { message: `En az ${issue.minimum} karakter olmalidir` };
      }
      if (issue.type === 'number') {
        return { message: `Deger en az ${issue.minimum} olmalidir` };
      }
      break;
    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') {
        return { message: `En fazla ${issue.maximum} karakter olabilir` };
      }
      if (issue.type === 'number') {
        return { message: `Deger en fazla ${issue.maximum} olabilir` };
      }
      break;
    case z.ZodIssueCode.invalid_type:
      if (issue.expected === 'string') return { message: 'Metin degeri bekleniyor' };
      if (issue.expected === 'number') return { message: 'Sayisal deger bekleniyor' };
      break;
    case z.ZodIssueCode.invalid_enum_value:
      return { message: `Gecerli degerler: ${issue.options.join(', ')}` };
  }
  return { message: ctx.defaultError };
};

z.setErrorMap(turkishErrorMap);
```

---

## 7. Controller Pattern

Every controller follows this structure:

```typescript
// controllers/property-controller.ts
import { Request, Response, NextFunction } from 'express';
import { PropertyService } from '../services/property-service';
import { asyncHandler } from '../utils/async-handler';
import type { CreatePropertyDto, UpdatePropertyDto, PropertyQueryDto } from '../schemas/property-schema';

export class PropertyController {
  private service: PropertyService;

  constructor() {
    this.service = new PropertyService();
  }

  list = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as PropertyQueryDto;
    const officeId = req.user!.officeId;
    const result = await this.service.list(officeId, query);

    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const officeId = req.user!.officeId;
    const property = await this.service.getById(id, officeId);

    res.json({
      success: true,
      data: property,
    });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const dto = req.body as CreatePropertyDto;
    const agentId = req.user!.id;
    const officeId = req.user!.officeId;
    const property = await this.service.create(dto, agentId, officeId);

    res.status(201).json({
      success: true,
      data: property,
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const dto = req.body as UpdatePropertyDto;
    const officeId = req.user!.officeId;
    const property = await this.service.update(id, dto, officeId);

    res.json({
      success: true,
      data: property,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const officeId = req.user!.officeId;
    await this.service.softDelete(id, officeId);

    res.status(204).send();
  });
}
```

### Async Handler Utility
```typescript
// utils/async-handler.ts
import { Request, Response, NextFunction } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

export function asyncHandler(fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```
