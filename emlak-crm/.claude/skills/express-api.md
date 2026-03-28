---
name: express-api
description: Use when building Express.js API endpoints, middleware, controllers, or services for the Emlak CRM backend
---

# Express.js API Patterns for Emlak CRM

## Overview
Reference guide for building Express.js REST API endpoints with TypeScript, Zod validation, JWT auth, and Prisma ORM for the Turkish real estate CRM backend.

## API Architecture

Routes -> Middleware -> Controllers -> Services -> Repositories (Prisma)

## Route Pattern

```typescript
// src/backend/routes/property.routes.ts
import { Router } from "express";
import { authenticate, authorize } from "@backend/middleware/auth";
import { validate } from "@backend/middleware/validate";
import { propertyController } from "@backend/controllers/property.controller";
import { createPropertySchema, updatePropertySchema } from "@shared/schemas";

const router = Router();
router.use(authenticate);

router.get("/", validate(listPropertySchema, "query"), propertyController.list);
router.get("/:id", propertyController.getById);
router.post("/", authorize("ADMIN", "MANAGER", "AGENT"), validate(createPropertySchema), propertyController.create);
router.put("/:id", authorize("ADMIN", "MANAGER", "AGENT"), validate(updatePropertySchema), propertyController.update);
router.delete("/:id", authorize("ADMIN", "MANAGER"), propertyController.delete);

export default router;
```

## Controller Pattern

```typescript
// src/backend/controllers/property.controller.ts
import { Request, Response, NextFunction } from "express";
import { propertyService } from "@backend/services/property.service";

export const propertyController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, pageSize, status, propertyType, ilId } = req.query;
      const result = await propertyService.list({
        officeId: req.user.officeId, // Always scope by office
        page: Number(page) || 0,
        pageSize: Math.min(Number(pageSize) || 20, 100),
        status, propertyType, ilId,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
```

## Service Pattern

```typescript
// src/backend/services/property.service.ts
import { prisma } from "@backend/lib/prisma";

export const propertyService = {
  async list(params: ListParams) {
    const { officeId, page, pageSize, ...filters } = params;
    const where = {
      officeId,
      deletedAt: null,
      ...(filters.status && { status: filters.status }),
      ...(filters.propertyType && { propertyType: filters.propertyType }),
      ...(filters.ilId && { ilId: Number(filters.ilId) }),
    };
    const [items, total] = await Promise.all([
      prisma.property.findMany({
        where,
        select: { /* only needed fields */ },
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: page * pageSize,
      }),
      prisma.property.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },
};
```

## Middleware Patterns

### Authentication
```typescript
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Yetkilendirme gerekli" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = payload as TokenPayload;
    next();
  } catch {
    res.status(401).json({ error: "Gecersiz token" });
  }
};
```

### Authorization
```typescript
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Bu islem icin yetkiniz yok" });
    }
    next();
  };
};
```

### Validation with Zod
```typescript
export const validate = (schema: z.ZodSchema, source: "body" | "query" = "body") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: "Gecersiz veri",
        details: result.error.flatten().fieldErrors,
      });
    }
    req[source] = result.data;
    next();
  };
};
```

## Error Handling

```typescript
// src/backend/middleware/errorHandler.ts
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return res.status(409).json({ error: "Kayit zaten mevcut" });
    if (err.code === "P2025") return res.status(404).json({ error: "Kayit bulunamadi" });
  }
  console.error(err);
  res.status(500).json({ error: "Sunucu hatasi" });
};
```

## API Response Format

- Success: { data: T, meta?: { page, pageSize, total, totalPages } }
- Error: { error: string, details?: Record<string, string[]> }