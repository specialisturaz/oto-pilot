---
name: nextjs-react
description: Use when building Next.js pages, React components, implementing client-side state management, or working on the frontend of the Emlak CRM project
---

# Next.js + React Patterns for Emlak CRM

## Overview
Reference guide for Next.js 14 App Router with React 18, TailwindCSS, Zustand, and React Query patterns used in this Turkish real estate CRM frontend.

## Component Decision Tree

1. Does the component need interactivity (click handlers, state, effects)?
   - YES -> Client Component ("use client")
   - NO -> Server Component (default)

2. Does the component fetch data?
   - Server-side data -> Server Component with async/await
   - Client-side data -> Client Component with React Query

3. Does the component use browser APIs (localStorage, window)?
   - YES -> Client Component with dynamic import (ssr: false)
   - NO -> Either type works

## Key Patterns

### Page with Server-Side Data

```tsx
// src/frontend/app/(dashboard)/properties/page.tsx
import { PropertyList } from "@/components/properties/PropertyList";

export default function PropertiesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Ilanlar</h1>
      <PropertyList />
    </div>
  );
}
```

### Client Component with React Query

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Property } from "@shared/types";

export function PropertyList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["properties", filters],
    queryFn: () => api.get<Property[]>("/properties", { params: filters }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) return <PropertyListSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data?.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
```

### Zustand Store Pattern

```typescript
// src/frontend/stores/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(persist(
  (set) => ({
    user: null,
    isAuthenticated: false,
    login: async (email, password) => {
      const { user, token } = await api.post("/auth/login", { email, password });
      set({ user, isAuthenticated: true });
    },
    logout: () => {
      set({ user: null, isAuthenticated: false });
      api.post("/auth/logout");
    },
  }),
  { name: "emlak-auth" }
));
```

### Form with React Hook Form + Zod

```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { propertySchema, type PropertyInput } from "@shared/schemas";

export function PropertyForm({ onSubmit }: Props) {
  const form = useForm<PropertyInput>({
    resolver: zodResolver(propertySchema),
    defaultValues: { currency: "TRY", propertyType: "APARTMENT", listingType: "SALE" },
  });
  // Turkish-specific fields: Ada/Parsel, DASK, Iskan, Aidat
}
```

## Performance Checklist

- Use next/image for all property photos
- Virtual scrolling for lists > 50 items
- Lazy load charts: dynamic(() => import("./DashboardChart"), { ssr: false })
- Debounce search inputs (300ms)
- Use React.memo for PropertyCard in large lists
- Prefetch on hover: <Link prefetch={true}>
- Use staleTime in React Query to avoid unnecessary refetches

## Turkish UI Considerations

- All user-facing labels in Turkish
- Date formatting: date-fns with tr locale
- Currency: Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" })
- Number formatting: Turkish uses comma for decimal, dot for thousands
- Responsive design for Turkish text (can be longer than English)