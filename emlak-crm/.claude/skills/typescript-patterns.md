---
name: typescript-patterns
description: Use when writing TypeScript code, defining types/interfaces, working with generics, or enforcing strict type safety in the Emlak CRM project
---

# TypeScript Patterns for Emlak CRM

## Overview
TypeScript strict mode patterns for a full-stack application with Express backend and Next.js frontend sharing types via src/shared/.

## Strict Mode Rules

This project enforces strict TypeScript:
- No implicit any
- Strict null checks
- No unchecked indexed access
- Exhaustive switch cases for enums

## Shared Type Patterns

### Domain Types (src/shared/types/)

```typescript
// src/shared/types/property.ts
import { PropertyType, ListingType, Currency } from "@prisma/client";

export interface Property {
  id: string;
  title: string;
  description: string | null;
  propertyType: PropertyType;
  listingType: ListingType;
  price: number;
  currency: Currency;
  roomCount: string | null; // "3+1", "2+1", etc.
  grossArea: number | null;
  netArea: number | null;
  floorNumber: number | null;
  totalFloors: number | null;
  buildingAge: number | null;
  hasElevator: boolean;
  hasFurniture: boolean;
  // Turkish-specific
  ada: string | null;        // Land registry block
  parsel: string | null;     // Land registry parcel
  iskan: boolean | null;     // Occupancy permit
  daskNo: string | null;     // Earthquake insurance number
  aidat: number | null;      // Monthly building dues (TRY)
  officeId: string;
  ilId: number;
  ilceId: number | null;
  mahalleId: number | null;
}
```

### API Response Types

```typescript
// src/shared/types/api.ts
export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}
```

### Zod Schema Patterns (src/shared/schemas/)

```typescript
// src/shared/schemas/property.schema.ts
import { z } from "zod";

export const createPropertySchema = z.object({
  title: z.string().min(5, "Baslik en az 5 karakter olmali").max(200),
  description: z.string().max(5000).optional(),
  propertyType: z.enum(["APARTMENT", "VILLA", "OFFICE", "LAND", "SHOP", "WAREHOUSE"]),
  listingType: z.enum(["SALE", "RENT", "DAILY_RENT"]),
  price: z.number().positive("Fiyat pozitif olmali"),
  currency: z.enum(["TRY", "USD", "EUR", "GBP"]).default("TRY"),
  roomCount: z.string().regex(/^d++d+$/, "Oda sayisi formati: 3+1").optional(),
  grossArea: z.number().positive().optional(),
  netArea: z.number().positive().optional(),
  ilId: z.number().int().min(1).max(81),
  ilceId: z.number().int().optional(),
  mahalleId: z.number().int().optional(),
  // Turkish-specific
  ada: z.string().max(20).optional(),
  parsel: z.string().max(20).optional(),
  iskan: z.boolean().optional(),
  daskNo: z.string().max(30).optional(),
  aidat: z.number().nonnegative().optional(),
});

export type PropertyInput = z.infer<typeof createPropertySchema>;
```

## Utility Type Patterns

```typescript
// Exhaustive switch helper
function assertNever(value: never): never {
  throw new Error("Unexpected value: " + value);
}

// Deal stage handler with exhaustive check
function getDealStageLabel(stage: DealStage): string {
  switch (stage) {
    case "INQUIRY": return "Basvuru";
    case "SHOWING": return "Gosterim";
    case "NEGOTIATION": return "Muzakere";
    case "OFFER": return "Teklif";
    case "DEPOSIT": return "Kapora";
    case "CONTRACT": return "Sozlesme";
    case "TAPU_TRANSFER": return "Tapu Devri";
    case "COMPLETED": return "Tamamlandi";
    default: return assertNever(stage);
  }
}
```

## Path Aliases

Configured in tsconfig.json:
- @shared/* -> src/shared/*
- @backend/* -> src/backend/*
- @agents/* -> agents/*

## Convention Rules

- Interfaces for domain objects, types for unions/utilities
- No enums in shared code -- use const objects with as const for portability
- Prisma-generated enums are acceptable since they come from the schema
- Prefer unknown over any, narrow with type guards
- All function parameters and return types explicitly typed
- Use readonly arrays/objects where mutation is not needed