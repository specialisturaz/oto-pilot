# TDD Workflow Skill

Agents reference this document when writing tests or implementing features using Test-Driven Development. All feature code in Emlak CRM follows the Red-Green-Refactor cycle.

---

## 1. Red-Green-Refactor Cycle

### Phase 1: RED - Write a Failing Test
1. Understand the requirement (from the task's `acceptanceCriteria`).
2. Write the smallest possible test that captures the requirement.
3. Run the test. Confirm it **fails** for the right reason (not a syntax error or import issue).
4. Commit with message: `test: add failing test for {feature}`.

### Phase 2: GREEN - Make It Pass
1. Write the **minimum** code to make the test pass.
2. Do not add extra functionality, error handling, or optimizations beyond what the test demands.
3. Run the test. Confirm it **passes**.
4. Run the full test suite to ensure nothing is broken.
5. Commit with message: `feat: implement {feature} (green)`.

### Phase 3: REFACTOR - Improve the Code
1. Clean up duplication, extract helpers, improve naming.
2. Apply project patterns (repository pattern, service layer, etc.).
3. Run the full test suite. All tests MUST still pass.
4. Commit with message: `refactor: clean up {feature} implementation`.

### Iteration
- Repeat for the next requirement. Each cycle should take 5-15 minutes.
- If a cycle takes longer than 30 minutes, the scope is too large. Break it down.

---

## 2. Vitest Patterns (Backend)

### Configuration
The project uses Vitest with the following setup:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/backend/**/*.test.ts', 'tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules/', 'tests/', '**/*.d.ts'],
    },
    alias: {
      '@backend': path.resolve(__dirname, 'src/backend'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
});
```

### Test File Structure
```typescript
// src/backend/services/__tests__/property-service.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PropertyService } from '../property-service';
import { PropertyRepository } from '../../repositories/property-repository';
import { createMockProperty } from '@tests/factories/property-factory';

// Mock the repository layer
vi.mock('../../repositories/property-repository');

describe('PropertyService', () => {
  let service: PropertyService;
  let mockRepo: vi.Mocked<PropertyRepository>;

  beforeEach(() => {
    mockRepo = new PropertyRepository() as vi.Mocked<PropertyRepository>;
    service = new PropertyService(mockRepo);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findActiveListings', () => {
    it('should return only ACTIVE properties for the given office', async () => {
      // Arrange
      const officeId = 'office-1';
      const activeProps = [
        createMockProperty({ status: 'ACTIVE', officeId }),
        createMockProperty({ status: 'ACTIVE', officeId }),
      ];
      mockRepo.findMany.mockResolvedValue(activeProps);

      // Act
      const result = await service.findActiveListings(officeId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(p => p.status === 'ACTIVE')).toBe(true);
      expect(mockRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { officeId, status: 'ACTIVE' },
        }),
      );
    });

    it('should return empty array when no active listings exist', async () => {
      mockRepo.findMany.mockResolvedValue([]);

      const result = await service.findActiveListings('office-1');

      expect(result).toEqual([]);
    });
  });
});
```

### Test Naming Convention
```
describe('{ServiceName}')
  describe('{methodName}')
    it('should {expected behavior} when {condition}')
```

Examples:
- `it('should throw UnauthorizedError when JWT is expired')`
- `it('should calculate 2% commission for sales above 1M TRY')`
- `it('should mask TC Kimlik number in KVKK export')`

### Mocking Patterns

#### Mock Prisma
```typescript
import { vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'vitest-mock-extended';

export type MockPrismaClient = DeepMockProxy<PrismaClient>;

export function createMockPrisma(): MockPrismaClient {
  return mockDeep<PrismaClient>();
}
```

#### Mock External APIs (Portal Integrations)
```typescript
import { vi } from 'vitest';
import { SahibindenAdapter } from '@integrations/sahibinden';

vi.mock('@integrations/sahibinden', () => ({
  SahibindenAdapter: vi.fn().mockImplementation(() => ({
    publishListing: vi.fn().mockResolvedValue({ externalId: 'shb-12345' }),
    updateListing: vi.fn().mockResolvedValue({ success: true }),
    removeListing: vi.fn().mockResolvedValue({ success: true }),
    getListingStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
  })),
}));
```

#### Factory Functions
```typescript
// tests/factories/property-factory.ts
import type { Property } from '@prisma/client';

let counter = 0;

export function createMockProperty(overrides: Partial<Property> = {}): Property {
  counter += 1;
  return {
    id: `prop-${counter}`,
    title: `Test Gayrimenkul ${counter}`,
    description: 'Test ilan aciklamasi',
    propertyType: 'DAIRE',
    listingType: 'SATILIK',
    status: 'ACTIVE',
    price: 2500000,
    currency: 'TRY',
    metreKare: 120,
    odaSayisi: 3,
    binaYasi: 5,
    kat: 4,
    toplamKat: 10,
    ispinable: false,
    officeId: 'office-default',
    agentId: 'agent-default',
    ilId: 'istanbul',
    ilceId: 'kadikoy',
    mahalleId: 'caferaga',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

---

## 3. React Testing Library Patterns (Frontend)

### Component Test Structure
```typescript
// src/frontend/components/__tests__/property-card.test.tsx

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PropertyCard } from '../property-card';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  );
}

describe('PropertyCard', () => {
  const mockProperty = {
    id: 'prop-1',
    title: '3+1 Daire Kadikoy',
    price: 2500000,
    currency: 'TRY',
    metreKare: 120,
    odaSayisi: 3,
    imageUrl: '/images/prop-1.jpg',
  };

  it('should display property title and formatted price', () => {
    renderWithProviders(<PropertyCard property={mockProperty} />);

    expect(screen.getByText('3+1 Daire Kadikoy')).toBeInTheDocument();
    expect(screen.getByText(/2[.,]500[.,]000/)).toBeInTheDocument();
    expect(screen.getByText('TRY')).toBeInTheDocument();
  });

  it('should call onFavorite when heart icon is clicked', async () => {
    const user = userEvent.setup();
    const onFavorite = vi.fn();

    renderWithProviders(
      <PropertyCard property={mockProperty} onFavorite={onFavorite} />,
    );

    await user.click(screen.getByRole('button', { name: /favori/i }));
    expect(onFavorite).toHaveBeenCalledWith('prop-1');
  });

  it('should display metre kare and oda sayisi', () => {
    renderWithProviders(<PropertyCard property={mockProperty} />);

    expect(screen.getByText('120 m2')).toBeInTheDocument();
    expect(screen.getByText('3 Oda')).toBeInTheDocument();
  });
});
```

### Query Patterns
- Use `getBy*` when the element should be present (fails immediately if not found).
- Use `queryBy*` when asserting an element is NOT present.
- Use `findBy*` when the element appears asynchronously (returns a promise).
- Prefer `getByRole` and `getByLabelText` over `getByTestId` for accessibility.

### Testing User Interactions
```typescript
// Always use userEvent.setup() for realistic event simulation
const user = userEvent.setup();
await user.click(button);
await user.type(input, 'Kadikoy');
await user.clear(input);
await user.selectOptions(select, 'SATILIK');
await user.keyboard('{Enter}');
```

### Testing Forms
```typescript
it('should submit property form with valid data', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();

  renderWithProviders(<PropertyForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText(/baslik/i), '3+1 Daire');
  await user.type(screen.getByLabelText(/fiyat/i), '2500000');
  await user.selectOptions(screen.getByLabelText(/ilan tipi/i), 'SATILIK');
  await user.selectOptions(screen.getByLabelText(/il/i), 'istanbul');

  await user.click(screen.getByRole('button', { name: /kaydet/i }));

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      title: '3+1 Daire',
      price: 2500000,
      listingType: 'SATILIK',
    }),
  );
});
```

---

## 4. Playwright E2E Patterns

### Test Structure
```typescript
// tests/e2e/property-listing.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Property Listing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@emlakcrm.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should display property listings with filters', async ({ page }) => {
    await page.goto('/properties');

    // Verify listings are visible
    await expect(page.getByTestId('property-list')).toBeVisible();
    const cards = page.getByTestId('property-card');
    await expect(cards.first()).toBeVisible();

    // Apply filter
    await page.selectOption('[data-testid="filter-listing-type"]', 'SATILIK');
    await page.click('[data-testid="filter-apply"]');

    // Verify filtered results
    await expect(page.getByText('KIRALIK')).not.toBeVisible();
  });

  test('should create a new property listing', async ({ page }) => {
    await page.goto('/properties/new');

    await page.fill('[name="title"]', 'E2E Test Daire');
    await page.fill('[name="price"]', '1500000');
    await page.selectOption('[name="propertyType"]', 'DAIRE');
    await page.selectOption('[name="listingType"]', 'SATILIK');
    await page.selectOption('[name="il"]', 'istanbul');
    await page.selectOption('[name="ilce"]', 'kadikoy');

    await page.click('button[type="submit"]');

    // Verify redirect to the new property
    await expect(page).toHaveURL(/\/properties\/[\w-]+/);
    await expect(page.getByText('E2E Test Daire')).toBeVisible();
  });
});
```

### Page Object Pattern
```typescript
// tests/e2e/pages/login-page.ts

import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[name="email"]');
    this.passwordInput = page.locator('[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[data-testid="login-error"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

### E2E Best Practices for Emlak CRM
- Seed test data before E2E runs using `npm run db:seed -- --env=test`.
- Use unique identifiers in test data to avoid flaky collisions (timestamp-based names).
- Test the full CRUD cycle: create, read, update, delete for core entities (Property, Contact, Deal).
- Test the deal pipeline flow: INQUIRY -> SHOWING -> NEGOTIATION -> OFFER -> DEPOSIT -> CONTRACT -> TAPU_TRANSFER -> COMPLETED.
- Test portal sync scenarios: publish to sahibinden, verify status update.

---

## 5. Test Naming in Turkish Context

When tests involve Turkish domain concepts, use the Turkish term in the test description:

```typescript
describe('KomisyonService', () => {
  it('should calculate %2 komisyon for satis above 1M TRY', async () => {});
  it('should apply KDV (VAT) to komisyon amount', async () => {});
  it('should track KVKK consent before processing musteri data', async () => {});
});

describe('TapuTransferService', () => {
  it('should validate DASK policy is active before tapu transfer', async () => {});
  it('should check iskan status for new construction', async () => {});
  it('should record ada/parsel from tapu records', async () => {});
});

describe('PortalSyncService', () => {
  it('should generate sahibinden XML feed with Turkish characters', async () => {});
  it('should map il/ilce/mahalle to portal location codes', async () => {});
});
```

---

## 6. Coverage Targets

| Area | Minimum Coverage | Target Coverage |
|---|---|---|
| Services (business logic) | 80% | 95% |
| Controllers (HTTP layer) | 70% | 85% |
| Repositories (data access) | 60% | 75% |
| Shared utilities | 90% | 100% |
| React components | 70% | 85% |
| E2E critical paths | N/A | All deal pipeline stages |

### Running Coverage
```bash
# Full coverage report
npm run test -- --coverage

# Coverage for a specific file
npm run test -- --coverage src/backend/services/property-service.ts

# Watch mode during TDD
npm run test -- --watch src/backend/services/property-service.test.ts
```
