# Frontend Patterns Skill

Agents reference this document when building or reviewing frontend code in the Emlak CRM Next.js 14 application. All frontend work MUST follow these patterns.

---

## 1. App Router Patterns (Next.js 14)

### Directory Structure
```
src/frontend/
  app/
    (auth)/                    # Route group: unauthenticated pages
      login/page.tsx
      register/page.tsx
      forgot-password/page.tsx
    (dashboard)/               # Route group: authenticated layout
      layout.tsx               # Sidebar + header layout
      dashboard/page.tsx       # Main dashboard
      properties/
        page.tsx               # Property list (server component)
        [id]/
          page.tsx             # Property detail
          edit/page.tsx        # Property edit form
        new/page.tsx           # New property form
      contacts/
        page.tsx
        [id]/page.tsx
      deals/
        page.tsx
        [id]/page.tsx
      reports/
        page.tsx
      settings/
        page.tsx
    api/                       # API routes (BFF pattern for portal callbacks)
      portal-webhook/route.ts
    layout.tsx                 # Root layout (providers, fonts)
    not-found.tsx
    error.tsx
    loading.tsx
  components/
    ui/                        # shadcn/ui base components
    shared/                    # App-wide shared components
    properties/                # Property-specific components
    contacts/                  # Contact-specific components
    deals/                     # Deal-specific components
  hooks/                       # Custom React hooks
  stores/                      # Zustand stores
  lib/                         # Utility functions, API client
  types/                       # Frontend-specific types
```

### Route Conventions
- `page.tsx` - The page component (required).
- `layout.tsx` - Shared layout for nested routes.
- `loading.tsx` - Loading UI (Suspense boundary).
- `error.tsx` - Error boundary for the route segment.
- `not-found.tsx` - 404 page for the route segment.

### Server vs Client Decision (see Section 2)
- `page.tsx` files are Server Components by default. Keep them that way unless they need interactivity.
- `layout.tsx` files should be Server Components.
- Interactive sub-sections are extracted into Client Components and composed in.

---

## 2. Server/Client Component Decisions

### Decision Matrix

| Need | Component Type | Reasoning |
|---|---|---|
| Fetch data from DB/API | Server Component | Runs on server, no client bundle |
| Display static content | Server Component | No JS sent to client |
| Use `useState`, `useEffect` | Client Component | Requires browser APIs |
| Handle user interactions (click, type) | Client Component | Event handlers need JS |
| Use browser APIs (localStorage, geolocation) | Client Component | Browser-only APIs |
| Access React Query / Zustand | Client Component | Client-side state |
| Render a form | Client Component | Needs interactivity |
| Display a data table with sorting | Client Component | Interactive sorting |
| Show a map (Leaflet/Google Maps) | Client Component | Browser-only library |

### Pattern: Server Component with Client Islands
```tsx
// app/(dashboard)/properties/page.tsx (SERVER COMPONENT - no 'use client')
import { PropertyFilters } from '@/components/properties/property-filters';
import { PropertyList } from '@/components/properties/property-list';

interface SearchParams {
  page?: string;
  listingType?: string;
  il?: string;
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Data fetching happens on the server
  const response = await fetch(
    `${process.env.API_URL}/api/properties?${new URLSearchParams(searchParams as Record<string, string>)}`,
    { next: { revalidate: 60 } }, // ISR: revalidate every 60 seconds
  );
  const data = await response.json();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gayrimenkul Listesi</h1>
      {/* Client component for interactive filters */}
      <PropertyFilters initialFilters={searchParams} />
      {/* Client component for interactive list with favorites, pagination */}
      <PropertyList initialData={data} />
    </div>
  );
}
```

```tsx
// components/properties/property-filters.tsx (CLIENT COMPONENT)
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function PropertyFilters({ initialFilters }: { initialFilters: Record<string, string | undefined> }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleFilterChange(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page'); // Reset pagination on filter change
    router.push(`/properties?${params.toString()}`);
  }

  return (
    <div className="flex gap-4">
      <Select
        defaultValue={initialFilters.listingType}
        onValueChange={(v) => handleFilterChange('listingType', v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Ilan Tipi" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="SATILIK">Satilik</SelectItem>
          <SelectItem value="KIRALIK">Kiralik</SelectItem>
        </SelectContent>
      </Select>
      {/* More filters... */}
    </div>
  );
}
```

### Rules
1. Never add `'use client'` to a page or layout unless absolutely necessary.
2. Pass serializable data from Server Components to Client Components as props.
3. Do not pass functions as props from Server to Client Components.
4. Fetch data in Server Components; use React Query in Client Components only for mutations and real-time updates.

---

## 3. shadcn/ui Component Usage

### Installation Pattern
```bash
# Add a component
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add data-table
```

Components are installed into `src/frontend/components/ui/` and can be customized.

### Theming
```typescript
// tailwind.config.ts - Emlak CRM theme colors
const config = {
  theme: {
    extend: {
      colors: {
        // Primary: Professional blue (trust, reliability)
        primary: {
          DEFAULT: 'hsl(215, 70%, 45%)',
          foreground: 'hsl(0, 0%, 100%)',
        },
        // Secondary: Warm accent
        secondary: {
          DEFAULT: 'hsl(35, 90%, 50%)',
          foreground: 'hsl(0, 0%, 100%)',
        },
        // Status colors for deals pipeline
        pipeline: {
          inquiry: 'hsl(200, 70%, 50%)',
          showing: 'hsl(180, 60%, 45%)',
          negotiation: 'hsl(45, 85%, 50%)',
          offer: 'hsl(30, 80%, 50%)',
          deposit: 'hsl(20, 75%, 45%)',
          contract: 'hsl(150, 60%, 40%)',
          tapu: 'hsl(120, 50%, 40%)',
          completed: 'hsl(140, 70%, 35%)',
        },
      },
    },
  },
};
```

### Common Component Patterns

#### Data Table with Turkish Headers
```tsx
'use client';

import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import type { Property } from '@/types/property';
import { formatCurrency } from '@/lib/format';

const columns: ColumnDef<Property>[] = [
  {
    accessorKey: 'title',
    header: 'Baslik',
  },
  {
    accessorKey: 'propertyType',
    header: 'Tip',
    cell: ({ row }) => propertyTypeLabels[row.original.propertyType],
  },
  {
    accessorKey: 'price',
    header: 'Fiyat',
    cell: ({ row }) => formatCurrency(row.original.price, row.original.currency),
  },
  {
    accessorKey: 'il',
    header: 'Il',
    cell: ({ row }) => row.original.il.name,
  },
  {
    accessorKey: 'status',
    header: 'Durum',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

const propertyTypeLabels: Record<string, string> = {
  DAIRE: 'Daire',
  VILLA: 'Villa',
  MUSTAKIL_EV: 'Mustakil Ev',
  ARSA: 'Arsa',
  ISYERI: 'Isyeri',
  OFIS: 'Ofis',
};
```

#### Form with Zod + React Hook Form
```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const propertyFormSchema = z.object({
  title: z.string().min(5, 'Baslik en az 5 karakter olmalidir'),
  price: z.number().positive('Fiyat pozitif olmalidir'),
  metreKare: z.number().int().positive('Metre kare pozitif olmalidir').optional(),
  odaSayisi: z.number().int().min(0).optional(),
  description: z.string().max(5000, 'Aciklama en fazla 5000 karakter olabilir').optional(),
});

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

export function PropertyForm({ onSubmit }: { onSubmit: (data: PropertyFormValues) => void }) {
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      title: '',
      price: 0,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ilan Basligi</FormLabel>
              <FormControl>
                <Input placeholder="Ornek: 3+1 Daire Kadikoy" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* More fields... */}
        <Button type="submit">Kaydet</Button>
      </form>
    </Form>
  );
}
```

---

## 4. Zustand Store Patterns

### Store Structure
Each domain area gets its own store. Stores are thin and focused.

```typescript
// stores/property-store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface PropertyFilters {
  listingType: string | null;
  propertyType: string | null;
  ilId: string | null;
  ilceId: string | null;
  priceMin: number | null;
  priceMax: number | null;
  metreKareMin: number | null;
  metreKareMax: number | null;
}

interface PropertyStore {
  // State
  filters: PropertyFilters;
  viewMode: 'grid' | 'list' | 'map';
  selectedPropertyIds: Set<string>;

  // Actions
  setFilter: <K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) => void;
  resetFilters: () => void;
  setViewMode: (mode: 'grid' | 'list' | 'map') => void;
  togglePropertySelection: (id: string) => void;
  clearSelection: () => void;
}

const defaultFilters: PropertyFilters = {
  listingType: null,
  propertyType: null,
  ilId: null,
  ilceId: null,
  priceMin: null,
  priceMax: null,
  metreKareMin: null,
  metreKareMax: null,
};

export const usePropertyStore = create<PropertyStore>()(
  devtools(
    persist(
      (set) => ({
        filters: { ...defaultFilters },
        viewMode: 'grid',
        selectedPropertyIds: new Set(),

        setFilter: (key, value) =>
          set((state) => ({
            filters: { ...state.filters, [key]: value },
          })),

        resetFilters: () =>
          set({ filters: { ...defaultFilters } }),

        setViewMode: (mode) =>
          set({ viewMode: mode }),

        togglePropertySelection: (id) =>
          set((state) => {
            const next = new Set(state.selectedPropertyIds);
            if (next.has(id)) {
              next.delete(id);
            } else {
              next.add(id);
            }
            return { selectedPropertyIds: next };
          }),

        clearSelection: () =>
          set({ selectedPropertyIds: new Set() }),
      }),
      {
        name: 'property-store',
        partialize: (state) => ({
          filters: state.filters,
          viewMode: state.viewMode,
        }),
      },
    ),
    { name: 'PropertyStore' },
  ),
);
```

### Store Rules
1. Stores hold ONLY client-side UI state (filters, view preferences, selections).
2. Server data (property lists, contacts) lives in React Query, NOT in Zustand.
3. Use `persist` middleware only for user preferences that should survive page reload.
4. Use `devtools` middleware in all stores for debugging.
5. Keep stores flat. If you need nested state, split into multiple stores.
6. Actions MUST be synchronous. Async operations go through React Query mutations.

### Store Usage in Components
```tsx
'use client';

import { usePropertyStore } from '@/stores/property-store';
import { shallow } from 'zustand/shallow';

export function PropertyViewToggle() {
  // Use shallow comparison for object selections
  const { viewMode, setViewMode } = usePropertyStore(
    (s) => ({ viewMode: s.viewMode, setViewMode: s.setViewMode }),
    shallow,
  );

  return (
    <div className="flex gap-2">
      <Button variant={viewMode === 'grid' ? 'default' : 'outline'} onClick={() => setViewMode('grid')}>
        Grid
      </Button>
      <Button variant={viewMode === 'list' ? 'default' : 'outline'} onClick={() => setViewMode('list')}>
        Liste
      </Button>
      <Button variant={viewMode === 'map' ? 'default' : 'outline'} onClick={() => setViewMode('map')}>
        Harita
      </Button>
    </div>
  );
}
```

---

## 5. React Query Caching Strategies

### Query Client Configuration
```typescript
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,           // 30 seconds default
        gcTime: 5 * 60 * 1000,          // 5 minutes garbage collection
        retry: 2,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
      },
    },
  });
}
```

### Stale Time Strategy

| Data Type | Stale Time | Reasoning |
|---|---|---|
| Reference data (Il/Ilce, Features) | 10 min | Rarely changes |
| Property list | 1 min | Other agents may update |
| Property detail | 30 sec | Active editing possible |
| Contact list | 1 min | Multiple agents access |
| Deal pipeline | 30 sec | Frequent status changes |
| User/Auth | 5 min | Rarely changes within session |
| Notifications | 15 sec | Near real-time needed |
| Portal sync status | 30 sec | Background sync updates |

### Query Key Convention
```typescript
// Query keys follow a hierarchical structure
export const queryKeys = {
  properties: {
    all: ['properties'] as const,
    lists: () => [...queryKeys.properties.all, 'list'] as const,
    list: (filters: PropertyFilters) => [...queryKeys.properties.lists(), filters] as const,
    details: () => [...queryKeys.properties.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.properties.details(), id] as const,
  },
  contacts: {
    all: ['contacts'] as const,
    lists: () => [...queryKeys.contacts.all, 'list'] as const,
    list: (filters: ContactFilters) => [...queryKeys.contacts.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.contacts.all, 'detail', id] as const,
  },
  deals: {
    all: ['deals'] as const,
    pipeline: (officeId: string) => [...queryKeys.deals.all, 'pipeline', officeId] as const,
    detail: (id: string) => [...queryKeys.deals.all, 'detail', id] as const,
  },
  reference: {
    iller: ['reference', 'iller'] as const,
    ilceler: (ilId: string) => ['reference', 'ilceler', ilId] as const,
    mahalleler: (ilceId: string) => ['reference', 'mahalleler', ilceId] as const,
    features: ['reference', 'features'] as const,
  },
};
```

### Mutation with Optimistic Updates
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api-client';

export function useUpdatePropertyStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/properties/${id}/status`, { status }),

    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.properties.detail(id) });

      // Snapshot previous value
      const previousProperty = queryClient.getQueryData(queryKeys.properties.detail(id));

      // Optimistically update
      queryClient.setQueryData(queryKeys.properties.detail(id), (old: any) => ({
        ...old,
        status,
      }));

      return { previousProperty };
    },

    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousProperty) {
        queryClient.setQueryData(queryKeys.properties.detail(id), context.previousProperty);
      }
    },

    onSettled: (_data, _error, { id }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.lists() });
    },
  });
}
```

---

## 6. Turkish i18n Patterns

### Number Formatting
```typescript
// lib/format.ts

export function formatCurrency(amount: number, currency: string = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Output: "2.500.000 TL" (Turkish uses . as thousand separator)

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('tr-TR').format(value);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

// Output: "28 Mart 2026"

export function formatRelativeDate(date: string | Date): string {
  const rtf = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' });
  const diffMs = new Date(date).getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    return rtf.format(diffHours, 'hour');
  }
  return rtf.format(diffDays, 'day');
}

// Output: "2 gun once", "3 saat sonra"
```

### Phone Number Formatting
```typescript
export function formatPhoneNumber(phone: string): string {
  // Input: +905551234567
  // Output: +90 (555) 123 45 67
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('90') && cleaned.length === 12) {
    return `+90 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10, 12)}`;
  }
  return phone;
}
```

### Static Labels
Turkish UI labels are stored as constants, not in separate i18n files (since the app is Turkish-only):

```typescript
// lib/labels.ts

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  DAIRE: 'Daire',
  VILLA: 'Villa',
  MUSTAKIL_EV: 'Mustakil Ev',
  RESIDENCE: 'Residence',
  ARSA: 'Arsa',
  TARLA: 'Tarla',
  ISYERI: 'Isyeri',
  OFIS: 'Ofis',
  DUKKAN: 'Dukkan',
  DEPO: 'Depo',
};

export const LISTING_TYPE_LABELS: Record<string, string> = {
  SATILIK: 'Satilik',
  KIRALIK: 'Kiralik',
  GUNLUK_KIRALIK: 'Gunluk Kiralik',
  DEVREN_SATILIK: 'Devren Satilik',
};

export const DEAL_STAGE_LABELS: Record<string, string> = {
  INQUIRY: 'Bilgi Alma',
  SHOWING: 'Gosterim',
  NEGOTIATION: 'Muzakere',
  OFFER: 'Teklif',
  DEPOSIT: 'Kapora',
  CONTRACT: 'Sozlesme',
  TAPU_TRANSFER: 'Tapu Devir',
  COMPLETED: 'Tamamlandi',
};
```

---

## 7. Responsive Design Guidelines

### Breakpoints (Tailwind defaults)
- `sm`: 640px (Mobile landscape)
- `md`: 768px (Tablet portrait)
- `lg`: 1024px (Tablet landscape / small desktop)
- `xl`: 1280px (Desktop)
- `2xl`: 1536px (Large desktop)

### Layout Strategy
- **Mobile first**: Write base styles for mobile, add breakpoint overrides for larger screens.
- **Dashboard sidebar**: Hidden on mobile (hamburger menu), visible from `lg` breakpoint.
- **Property grid**: 1 column on mobile, 2 columns on `md`, 3 columns on `lg`, 4 columns on `xl`.
- **Data tables**: Horizontal scroll on mobile with pinned first column.
- **Forms**: Single column on mobile, two columns on `md` and above.

### Critical Responsive Patterns
```tsx
// Property grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {properties.map(p => <PropertyCard key={p.id} property={p} />)}
</div>

// Dashboard sidebar layout
<div className="flex min-h-screen">
  <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r">
    <Sidebar />
  </aside>
  <main className="flex-1 p-4 lg:p-6">
    {children}
  </main>
</div>

// Responsive form
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <FormField name="title" className="md:col-span-2" /> {/* Full width */}
  <FormField name="price" />       {/* Half width on md+ */}
  <FormField name="currency" />    {/* Half width on md+ */}
  <FormField name="metreKare" />
  <FormField name="odaSayisi" />
</div>
```

### Touch Targets
- All clickable elements: minimum 44x44px touch target on mobile.
- Spacing between interactive elements: minimum 8px.
- Use `p-3` or larger for buttons on mobile.
