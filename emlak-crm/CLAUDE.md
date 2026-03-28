# CLAUDE.md - Emlak CRM Project Instructions

## Project Overview

Emlak CRM is a comprehensive Customer Relationship Management system designed specifically for the Turkish real estate market (Turkiye Emlak Piyasasi). It manages properties (gayrimenkul), clients (musteri), deals (satis surecleri), commissions (komisyon), and integrates with Turkish property portals (sahibinden.com, hepsiemlak.com, etc.).

## Tech Stack

- **Backend:** Node.js + Express + TypeScript
- **Frontend:** Next.js 14 + React 18 + TailwindCSS
- **Database:** PostgreSQL 16 (with Turkish locale support)
- **ORM:** Prisma 6
- **Cache/Queue:** Redis 7 + Bull
- **Testing:** Vitest (unit) + Playwright (e2e)
- **State Management:** Zustand (frontend), React Query (server state)
- **Auth:** JWT (access + refresh tokens) with bcryptjs
- **Validation:** Zod schemas
- **Agent System:** Multi-agent AI orchestrator (see agents/ directory)

## How to Run Locally

### Quick Setup (recommended)
```bash
bash infrastructure/scripts/setup.sh
```

### Manual Setup
```bash
# 1. Start PostgreSQL and Redis
docker compose -f infrastructure/docker/docker-compose.yml up -d

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Run migrations
npx prisma migrate dev

# 5. Seed database
npm run db:seed

# 6. Start development servers
npm run dev
```

### Access URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- Prisma Studio: `npx prisma studio`

### Demo Credentials
- Email: admin@emlakcrm.com
- Password: password123

## Project Structure

```
emlak-crm/
├── src/
│   ├── backend/         # Express API server (port 3001)
│   ├── frontend/        # Next.js app (port 3000)
│   ├── shared/          # Shared types, utils, constants
│   └── integrations/    # Portal API integrations
├── prisma/
│   ├── schema.prisma    # Database schema (all models)
│   └── seed.ts          # Database seed script
├── agents/              # AI agent system
│   ├── orchestrator/    # Main agent coordinator
│   ├── backend-dev/     # Backend development agent
│   ├── frontend-dev/    # Frontend development agent
│   ├── testing/         # Test generation agent
│   └── ...
├── infrastructure/
│   ├── docker/          # Docker Compose, Dockerfiles, nginx
│   ├── scripts/         # Setup and utility scripts
│   └── seeds/           # JSON seed data (features, portals)
├── tests/               # Test files
└── .github/workflows/   # CI/CD pipeline
```

## Key Commands

```bash
# Development
npm run dev                 # Start both frontend and backend
npm run dev:backend         # Start backend only
npm run dev:frontend        # Start frontend only

# Database
npm run db:generate         # Generate Prisma client
npm run db:push             # Push schema to DB (no migration)
npm run db:migrate          # Run migrations
npm run db:seed             # Seed database
npm run db:studio           # Open Prisma Studio

# Build
npm run build               # Build everything
npm run build:backend       # Build backend (TypeScript)
npm run build:frontend      # Build frontend (Next.js)

# Testing
npm run test                # Run Vitest tests
npm run test:e2e            # Run Playwright E2E tests

# Code Quality
npm run lint                # ESLint check
npm run format              # Prettier format

# Agent System
npm run agent:start         # Start AI agent orchestrator
```

## Database Schema Key Models

- **Office** (Emlak Ofisi) - Multi-tenant root entity
- **User** (Kullanici/Danisman) - Agents, managers, admins
- **Contact** (Musteri) - Leads, prospects, clients
- **Property** (Gayrimenkul) - Listings with Turkish-specific fields
- **Deal** (Satis Sureci) - Sales pipeline with stages: INQUIRY -> SHOWING -> NEGOTIATION -> OFFER -> DEPOSIT -> CONTRACT -> TAPU_TRANSFER -> COMPLETED
- **Commission** (Komisyon) - Buyer-side, seller-side, referral
- **Portal** - sahibinden.com, hepsiemlak, emlakjet, zingat, endeksa
- **Il/Ilce/Mahalle** - Turkish administrative locations (81 provinces)
- **Feature** - Property features (Ic/Dis Ozellikler, Muhit, Ulasim, etc.)

## Turkish Real Estate Domain Notes

- **Tapu**: Title deed (property ownership document)
- **DASK**: Compulsory earthquake insurance
- **Iskan**: Occupancy permit
- **Ada/Parsel**: Land registry block/parcel numbers
- **Kat Mulkiyeti/Irtifaki**: Condominium ownership types
- **Aidat (Dues)**: Monthly building maintenance fees
- Currency is primarily TRY but USD/EUR/GBP also supported
- Commission rates are typically 2% buyer + 2% seller for sales
- For rentals, commission is typically one month's rent

## Testing Instructions

### Backend Unit Tests
```bash
npm run test                    # Run all tests
npm run test -- --run           # Run once (no watch)
npm run test -- --coverage      # With coverage report
```

### E2E Tests
```bash
npx playwright install          # Install browsers (first time)
npm run test:e2e                # Run Playwright tests
```

### Test Database
Tests use a separate database. Set `DATABASE_URL` to a test database in your test environment.

## Agent System Overview

The project includes a multi-agent AI system under `agents/`:

- **Orchestrator** (`agents/orchestrator/`) - Coordinates all agents, manages state
- **Architect** (`agents/architect/`) - System design and architecture decisions
- **Backend Dev** (`agents/backend-dev/`) - Backend code generation
- **Frontend Dev** (`agents/frontend-dev/`) - Frontend code generation
- **Testing** (`agents/testing/`) - Test generation and validation
- **Integration** (`agents/integration/`) - Portal integration development
- **Research** (`agents/research/`) - Market research and analysis
- **DevOps** (`agents/devops/`) - Infrastructure and deployment

Agent state is managed in `agents/state/` and logs in `agents/logs/`. Contracts between agents are defined in `agents/contracts/`.

## Important Conventions

- All Prisma models use `@map()` for snake_case database column names
- TypeScript strict mode is enabled
- Backend path aliases: `@shared/*`, `@backend/*`, `@agents/*`
- All times are in Europe/Istanbul timezone
- Turkish characters in data, English in code identifiers
- Enums use UPPER_SNAKE_CASE matching Turkish real estate terminology
