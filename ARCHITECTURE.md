# Emlak CRM -- Multi-Agent Architecture Blueprint
## Turkish Real Estate CRM System

**Version:** 1.0
**Date:** 2026-03-28
**Status:** Design Phase

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Domain Analysis: Turkish Real Estate](#2-domain-analysis)
3. [Agent Architecture](#3-agent-architecture)
4. [Agent Communication Protocol](#4-agent-communication-protocol)
5. [Database Schema Design](#5-database-schema-design)
6. [API Architecture](#6-api-architecture)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Integration Architecture](#8-integration-architecture)
9. [Development Workflow](#9-development-workflow)
10. [GitHub Workflow](#10-github-workflow)
11. [Project Structure](#11-project-structure)
12. [Security Architecture](#12-security-architecture)
13. [Testing Strategy](#13-testing-strategy)
14. [DevOps and Infrastructure](#14-devops-and-infrastructure)
15. [Risk Register](#15-risk-register)

---

## 1. Executive Summary

This document defines the complete architecture for **Emlak CRM**, a Turkish real estate customer relationship management system. The system is purpose-built for the Turkish market, handling Turkish-specific requirements such as tapu (title deed) workflows, DASK (mandatory earthquake insurance), iskan (habitation certificate) tracking, kat irtifaki/kat mulkiyeti distinctions, and integration with major Turkish property portals.

**Tech Stack:**
- Backend: Node.js + Express.js (v18+ LTS)
- Frontend: Next.js 14 (App Router)
- Database: PostgreSQL 16 + Prisma ORM
- Runtime: Local development, Docker-ready
- Language: TypeScript throughout

**Key Numbers:**
- ~45 database tables
- ~120 API endpoints
- ~60 frontend pages/views
- 6 external portal integrations
- 3 messaging integrations (WhatsApp, SMS, email)

---

## 2. Domain Analysis

### 2.1 Turkish Real Estate Market Specifics

**Property Types (Emlak Turleri):**
- Konut (Residential): Daire (apartment), Villa, Mustakil Ev (detached), Yazlik (summer house), Residence
- Ticari (Commercial): Ofis, Dukkan, Magaza, Depo, Fabrika, Arsa (land)
- Arsa/Arazi (Land): Imarlı, Imarsız, Tarla, Bahce
- Turistik (Tourism): Otel, Apart, Pansiyon
- Projeden Satis (Off-plan): Under construction from developers

**Transaction Types:**
- Satilik (For Sale)
- Kiralik (For Rent)
- Devren Satilik (Business Transfer)
- Gunluk Kiralik (Daily Rental)
- Takas (Exchange)

**Turkish-Specific Regulatory/Process Requirements:**
- Tapu Mudurlugu (Title Deed Office) integration concepts
- DASK (Dogal Afet Sigortalari Kurumu) -- mandatory earthquake insurance
- Iskan Belgesi (Habitation Certificate)
- Imar Durumu (Zoning Status)
- Kat Irtifaki vs. Kat Mulkiyeti (floor easement vs. floor ownership)
- Yapi Ruhsati (Building Permit)
- Enerji Kimlik Belgesi (Energy Identity Certificate)
- Emlak Vergisi (Property Tax)
- Tapu Harci (Title Deed Fee -- typically 4%, split buyer/seller)
- Komisyon (Agent Commission -- typically 2%+2% from both parties)
- Cins Tashihi (Type Correction on title deed)
- Ipotek (Mortgage/Lien) tracking
- Kat Karsiligi (Build-and-share agreements)

**Key Market Portals:**
- sahibinden.com (dominant marketplace)
- hepsiemlak.com
- emlakjet.com
- endeksa.com (valuation data)
- zingat.com
- n11 Emlak

**Communication Channels in Turkish RE:**
- WhatsApp is the primary communication tool (>80% of agent-client communication)
- Phone calls
- SMS for notifications and appointment reminders
- Email for formal documents
- In-person meetings for showings

### 2.2 CRM Feature Requirements

**Core CRM:**
- Contact management (Musteri Yonetimi)
- Property/Listing management (Ilan Yonetimi)
- Deal pipeline (Satis Sureci)
- Activity tracking (Aktivite Takibi)
- Task management (Gorev Yonetimi)
- Calendar and appointments (Randevu/Takvim)
- Document management (Evrak Yonetimi)
- Commission tracking (Komisyon Takibi)

**Turkish RE Specific:**
- Tapu transaction workflow
- DASK policy tracking
- Multi-portal listing syndication
- Matching engine (property-to-buyer)
- Area/neighborhood database (Mahalle/Semt/Ilce/Il)
- Building/Site (Site/Bina) database
- Valuation/comparison tools (Deger Analizi)
- Mortgage calculator (Kredi Hesaplama)

**Communication:**
- WhatsApp Business integration
- SMS (Netgsm/Iletimerkezi)
- Email (SMTP + templates)
- Notification center
- Auto-responders
- Bulk messaging campaigns

**Reporting:**
- Sales performance
- Agent performance
- Listing analytics
- Pipeline reports
- Commission reports
- Portal performance comparison

---

## 3. Agent Architecture

### 3.1 Hierarchical Agent Overview

```
                    ┌─────────────────────┐
                    │   ORCHESTRATOR      │
                    │   (Main Agent)      │
                    │                     │
                    │  - Task Queue       │
                    │  - Priority Mgmt    │
                    │  - State Machine    │
                    │  - Progress Report  │
                    └─────────┬───────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────┴─────┐     ┌──────┴──────┐     ┌─────┴──────┐
    │ RESEARCH  │     │  ARCHITECT  │     │  TESTING   │
    │  AGENT    │     │   AGENT     │     │   AGENT    │
    └─────┬─────┘     └──────┬──────┘     └─────┬──────┘
          │                  │                   │
          │           ┌──────┼──────┐            │
          │           │      │      │            │
        ┌─┴───┐  ┌───┴──┐ ┌─┴───┐ ┌┴────┐  ┌───┴───┐
        │INTEG│  │BACK- │ │FRONT│ │INTEG│  │DEVOPS │
        │DATA │  │END   │ │END  │ │CODE │  │AGENT  │
        │     │  │DEV   │ │DEV  │ │     │  │       │
        └─────┘  └──────┘ └─────┘ └─────┘  └───────┘
```

### 3.2 Agent Definitions

#### 3.2.1 Orchestrator Agent (Main)

**Role:** Central coordinator, decision-maker, state manager.

**Responsibilities:**
- Maintains the master task queue (ordered by priority and dependency)
- Tracks the global project state machine (which phase, what is complete)
- Dispatches work to sub-agents with full context
- Resolves conflicts between agents (e.g., schema change requested by backend vs. frontend need)
- Aggregates progress and produces status reports
- Manages inter-agent dependencies (frontend cannot build a page until the API is ready)
- Handles error escalation (if a sub-agent fails 3 times, re-strategize)

**State Machine:**
```
INIT -> RESEARCH -> ARCHITECTURE -> CORE_BACKEND -> CORE_FRONTEND
     -> FEATURE_DEV -> INTEGRATIONS -> TESTING -> POLISH -> COMPLETE
```

**Decision Framework:**
- Priority 1: Blocking dependencies (database schema must precede API)
- Priority 2: Critical path items (auth, core CRUD)
- Priority 3: Feature work (parallelizable)
- Priority 4: Nice-to-haves (analytics, reporting)

**Context Window Management:**
- The orchestrator maintains a `project-state.json` file at root
- Each agent reads/writes to its own state file under `agents/state/`
- Orchestrator summarizes completed work into a `CHANGELOG.md` so agents do not need full history

#### 3.2.2 Research Agent

**Role:** Domain expert, requirements analyst.

**Responsibilities:**
- Produce a structured requirements document
- Analyze Turkish real estate domain terminology and workflows
- Define user personas (emlak danismani, ofis yoneticisi, patron, sekreter)
- Map out business processes (listing lifecycle, deal lifecycle, commission lifecycle)
- Identify compliance requirements (KVKK -- Turkish GDPR)
- Research competitor features (Proplist, RealtyBase, Salesforce RE)
- Define the data dictionary (Turkish-English field mappings)

**Outputs:**
- `docs/requirements/PRD.md` -- Product Requirements Document
- `docs/requirements/user-stories.md` -- Epics and user stories
- `docs/requirements/domain-glossary.md` -- Turkish RE term glossary
- `docs/requirements/business-processes.md` -- BPMN-style workflow descriptions
- `docs/requirements/data-dictionary.md` -- Field definitions and validations

**Activation:** Phase 1 only, then available on-demand for clarification.

#### 3.2.3 Architect Agent

**Role:** Technical designer, quality gatekeeper.

**Responsibilities:**
- Design the PostgreSQL schema (all tables, relations, indexes, constraints)
- Design the API contract (OpenAPI 3.1 spec)
- Design the frontend component hierarchy
- Define shared TypeScript types
- Review all PRs for architectural consistency
- Maintain ADR (Architecture Decision Records)
- Define coding standards and patterns

**Outputs:**
- `docs/architecture/database-schema.md` -- Full ERD description
- `docs/architecture/api-spec.yaml` -- OpenAPI specification
- `docs/architecture/frontend-components.md` -- Component tree
- `docs/architecture/adr/` -- Architecture Decision Records
- `prisma/schema.prisma` -- Prisma schema file
- `src/shared/types/` -- TypeScript type definitions

**Patterns Enforced:**
- Repository pattern for data access
- Service layer for business logic
- Controller layer for HTTP handling
- Middleware for cross-cutting concerns (auth, logging, validation)
- Atomic design for frontend (atoms, molecules, organisms, templates, pages)

#### 3.2.4 Backend Developer Agent

**Role:** Server-side implementation.

**Responsibilities:**
- Express.js server setup and configuration
- Prisma model implementation and migrations
- REST API endpoints (CRUD + business logic)
- Authentication (JWT + refresh tokens)
- Authorization (RBAC -- role-based access control)
- Input validation (Zod schemas)
- Error handling middleware
- File upload handling (property photos, documents)
- Background job processing (Bull queue)
- Caching layer (Redis)
- Search functionality (full-text search with PostgreSQL)

**Standards:**
- Every endpoint must have Zod validation
- Every service must be unit-testable (dependency injection)
- Every database query must use Prisma (no raw SQL except for complex reports)
- Response format: `{ success: boolean, data?: T, error?: { code: string, message: string } }`
- Pagination: cursor-based for listings, offset-based for admin tables
- Rate limiting on all public endpoints

**Key Modules to Implement:**
```
auth/           -- Login, register, password reset, 2FA
users/          -- User CRUD, profile, preferences
contacts/       -- Customer management, segmentation, merge
properties/     -- Listing CRUD, photos, features, matching
deals/          -- Pipeline stages, offers, negotiations
activities/     -- Calls, meetings, notes, emails logged
tasks/          -- Task assignment, reminders, recurring
calendar/       -- Appointments, showings, availability
documents/      -- Upload, categorize, tapu docs, contracts
commissions/    -- Calculation, splits, payment tracking
portals/        -- Syndication engine, status tracking
messaging/      -- WhatsApp, SMS, email orchestration
reports/        -- Analytics queries, export
notifications/  -- In-app, push, email, SMS triggers
settings/       -- Office config, custom fields, templates
locations/      -- Il/Ilce/Mahalle/Semt hierarchy
buildings/      -- Site/Bina database, unit tracking
```

#### 3.2.5 Frontend Developer Agent

**Role:** Client-side implementation.

**Responsibilities:**
- Next.js 14 App Router setup
- Page layouts and navigation
- Reusable component library
- Form handling (react-hook-form + Zod)
- State management (Zustand for client state, React Query for server state)
- Responsive design (Tailwind CSS)
- Dark mode support
- i18n setup (Turkish primary, English secondary)
- Accessibility (WCAG 2.1 AA)
- Performance optimization (lazy loading, virtualized lists)

**UI Framework Decisions:**
- Tailwind CSS for utility-first styling
- shadcn/ui as component foundation (radix primitives)
- Lucide icons
- React Query (TanStack Query) for data fetching
- Zustand for global client state
- react-hook-form for forms
- date-fns with Turkish locale for date handling
- Leaflet or Mapbox for map views
- recharts for analytics charts

**Key Pages/Views:**
```
/                       -- Dashboard (ozet)
/login                  -- Authentication
/contacts               -- Contact list (musteri listesi)
/contacts/[id]          -- Contact detail
/contacts/new           -- New contact
/properties             -- Property list (ilan listesi)
/properties/[id]        -- Property detail (ilan detay)
/properties/new         -- New property form
/properties/[id]/edit   -- Edit property
/deals                  -- Pipeline board (kanban)
/deals/[id]             -- Deal detail
/calendar               -- Calendar view (takvim)
/tasks                  -- Task list (gorevler)
/messages               -- Message center (mesajlar)
/messages/whatsapp      -- WhatsApp conversations
/portals                -- Portal management (portal yonetimi)
/portals/publish        -- Multi-portal publishing
/reports                -- Report dashboard (raporlar)
/reports/sales          -- Sales reports
/reports/agents         -- Agent performance
/reports/commissions    -- Commission reports
/documents              -- Document manager (evraklar)
/settings               -- System settings (ayarlar)
/settings/office        -- Office configuration
/settings/users         -- User management
/settings/templates     -- Message/doc templates
/settings/custom-fields -- Custom field definitions
/settings/portals       -- Portal API keys
/map                    -- Map view of listings (harita)
/matching               -- Property-buyer matching (eslestirme)
```

**Component Hierarchy (Atomic Design):**
```
atoms/
  Button, Input, Badge, Avatar, Icon, Tooltip, Spinner
molecules/
  SearchBar, PropertyCard, ContactCard, StatCard, FileUpload
  PriceInput (TL formatting), PhoneInput (TR format), TCKNInput
organisms/
  PropertyListTable, ContactListTable, DealPipelineBoard
  PropertyForm, ContactForm, DealForm
  ActivityTimeline, MessageThread, NotificationDropdown
  PropertyPhotoGallery, MapCluster, FilterPanel
templates/
  DashboardLayout, ListPageLayout, DetailPageLayout
  FormPageLayout, SettingsLayout
pages/
  (Next.js App Router pages as listed above)
```

#### 3.2.6 Integration Agent

**Role:** External system connector.

**Responsibilities:**
- Portal API integrations (sahibinden, hepsiemlak, emlakjet)
- WhatsApp Business API (via official Cloud API or provider like Wati/Twilio)
- SMS provider integration (Netgsm API)
- Email service (Nodemailer + SMTP, or Resend/SendGrid)
- Map services (geocoding, reverse geocoding)
- Turkish address database (il/ilce/mahalle)
- Currency/exchange rate feeds (for foreign buyer pricing)
- Government service concepts (e-Devlet integrations if applicable)

**Portal Integration Details:**

*sahibinden.com:*
- XML feed export (most common integration method)
- Photo upload specifications (min 800x600, max 20 photos)
- Category mapping (sahibinden category IDs)
- Field mapping (sahibinden-specific fields)
- Listing status sync
- Lead capture from sahibinden messages

*hepsiemlak.com:*
- REST API or XML feed
- Different category taxonomy
- Photo requirements
- Lead webhook integration

*emlakjet.com:*
- API-based integration
- Listing push/pull
- Performance analytics API

**WhatsApp Business Integration:**
- Official WhatsApp Cloud API (Meta Business)
- Template message management (HSM -- highly structured messages)
- Session message handling (24-hour window)
- Media message support (property photos)
- Quick reply buttons
- Catalog integration (property catalog)
- Webhook for incoming messages
- Conversation assignment to agents

**SMS Integration (Netgsm):**
- OTP sending for verification
- Appointment reminders
- Bulk campaign messaging
- Delivery report tracking
- Turkish character (GSM-7 extended) handling
- Sender ID (originator) configuration

#### 3.2.7 Testing Agent

**Role:** Quality assurance automation.

**Responsibilities:**
- Unit test creation (Vitest for backend and frontend)
- Integration test creation (Supertest for API)
- E2E test creation (Playwright)
- Performance testing (k6 or Artillery)
- Test data generation (factories with Faker.js, Turkish locale)
- Coverage tracking and enforcement (>80% backend, >70% frontend)

**Test Strategy:**
```
Unit Tests (Vitest):
  - Service layer (business logic)
  - Utility functions
  - Validation schemas
  - React components (React Testing Library)
  - Custom hooks

Integration Tests (Supertest + Test DB):
  - API endpoint tests
  - Authentication flows
  - Authorization rules
  - Database operations (Prisma with test DB)

E2E Tests (Playwright):
  - Critical user flows:
    1. Login -> Dashboard
    2. Create Contact -> Create Property -> Create Deal
    3. Publish to Portal -> Verify Status
    4. Send WhatsApp Message -> Verify Delivery
    5. Commission Calculation -> Report Generation
  - Cross-browser (Chromium, Firefox, WebKit)
  - Mobile viewport tests

Performance Tests:
  - Property list with 10K+ records
  - Concurrent user simulation (50 agents)
  - Portal sync with 500+ listings
  - Search response times (<200ms target)
```

#### 3.2.8 DevOps Agent

**Role:** Infrastructure and automation.

**Responsibilities:**
- Docker Compose setup (dev environment)
- Database migration scripts
- Seed data (Turkish cities, districts, neighborhoods)
- CI/CD pipeline (GitHub Actions)
- Environment variable management
- Backup scripts
- Log aggregation configuration
- Health check endpoints

---

## 4. Agent Communication Protocol

### 4.1 Message Format

Every inter-agent message follows this structure:

```typescript
interface AgentMessage {
  id: string;                    // UUID
  timestamp: string;             // ISO 8601
  from: AgentRole;               // Sending agent
  to: AgentRole;                 // Receiving agent
  type: MessageType;             // TASK | RESULT | QUERY | ERROR | STATUS
  priority: Priority;            // CRITICAL | HIGH | MEDIUM | LOW
  correlationId: string;         // Links related messages
  payload: {
    action: string;              // What to do
    context: Record<string, any>; // Relevant data
    constraints: string[];       // Boundaries/rules
    acceptanceCriteria: string[]; // Definition of done
  };
  metadata: {
    phase: ProjectPhase;
    attempt: number;             // Retry count
    deadline?: string;           // Optional deadline
    dependencies?: string[];     // IDs of blocking tasks
  };
}

type AgentRole =
  | 'orchestrator'
  | 'research'
  | 'architect'
  | 'backend'
  | 'frontend'
  | 'integration'
  | 'testing'
  | 'devops';

type MessageType = 'TASK' | 'RESULT' | 'QUERY' | 'ERROR' | 'STATUS';
type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
```

### 4.2 Communication Flows

**Task Assignment Flow:**
```
Orchestrator                    Sub-Agent
    │                              │
    │──── TASK (action, context) ──►│
    │                              │
    │◄─── STATUS (acknowledged) ───│
    │                              │
    │◄─── STATUS (in_progress) ────│
    │                              │  (may repeat for long tasks)
    │◄─── QUERY (clarification) ───│  (optional)
    │──── RESULT (answer) ─────────►│
    │                              │
    │◄─── RESULT (deliverables) ───│
    │                              │
    │──── STATUS (accepted/rejected)►│
```

**Cross-Agent Collaboration Flow (e.g., Backend needs schema from Architect):**
```
Backend         Orchestrator         Architect
   │                 │                   │
   │── QUERY ───────►│                   │
   │  (need schema   │── TASK ──────────►│
   │   for contacts) │                   │
   │                 │◄── RESULT ────────│
   │◄── RESULT ──────│  (schema + types) │
   │                 │                   │
```

**Error Handling Flow:**
```
Orchestrator                    Sub-Agent
    │                              │
    │──── TASK ───────────────────►│
    │                              │
    │◄─── ERROR (description) ─────│  Attempt 1
    │                              │
    │──── TASK (adjusted context) ►│  Retry with fix
    │                              │
    │◄─── ERROR ───────────────────│  Attempt 2
    │                              │
    │──── TASK (further adjusted) ►│  Retry with more fix
    │                              │
    │◄─── ERROR ───────────────────│  Attempt 3
    │                              │
    │  [ESCALATE: Re-strategize]   │
    │  Orchestrator may:           │
    │  - Break task into smaller   │
    │  - Assign to different agent │
    │  - Request Architect review  │
```

### 4.3 State Files (File-Based Communication)

Since agents operate through Claude Code sessions, communication is file-based:

```
agents/
  state/
    orchestrator-state.json    -- Master state
    task-queue.json            -- Pending tasks
    completed-tasks.json       -- Done tasks (summary)
    research-state.json
    architect-state.json
    backend-state.json
    frontend-state.json
    integration-state.json
    testing-state.json
    devops-state.json
  contracts/
    api-contract.yaml          -- Shared API spec
    type-definitions.ts        -- Shared types
    database-schema.prisma     -- Shared schema
  logs/
    agent-activity.log         -- Append-only activity log
```

**Orchestrator State Structure:**
```json
{
  "currentPhase": "FEATURE_DEV",
  "phaseProgress": {
    "RESEARCH": { "status": "complete", "completedAt": "..." },
    "ARCHITECTURE": { "status": "complete", "completedAt": "..." },
    "CORE_BACKEND": { "status": "complete", "completedAt": "..." },
    "CORE_FRONTEND": { "status": "in_progress", "progress": 65 },
    "FEATURE_DEV": { "status": "in_progress", "progress": 30 },
    "INTEGRATIONS": { "status": "pending" },
    "TESTING": { "status": "pending" },
    "POLISH": { "status": "pending" }
  },
  "activeAgents": ["backend", "frontend", "integration"],
  "blockers": [],
  "lastUpdated": "2026-03-28T12:00:00Z"
}
```

### 4.4 Dependency Resolution

Tasks declare dependencies explicitly. The orchestrator will not dispatch a task until all dependencies are marked complete.

```json
{
  "taskId": "FE-012",
  "title": "Build Property List Page",
  "assignee": "frontend",
  "dependencies": ["BE-008", "AR-003"],
  "dependencyDetails": {
    "BE-008": "Property CRUD API endpoints",
    "AR-003": "Property TypeScript types"
  },
  "status": "blocked"
}
```

---

## 5. Database Schema Design

### 5.1 Entity Relationship Overview

```
┌──────────┐     ┌──────────┐     ┌───────────┐
│  Office   │────<│   User   │────<│ Activity  │
└──────────┘     └──────────┘     └───────────┘
                      │ │
                      │ └──────────────┐
                      │                │
                 ┌────┴────┐    ┌──────┴───┐
                 │ Contact │    │   Task   │
                 └────┬────┘    └──────────┘
                      │
                 ┌────┴────┐
                 │  Deal   │────── DealStage
                 └────┬────┘
                      │
                 ┌────┴────┐
                 │Property │────── PropertyFeature
                 └────┬────┘       PropertyPhoto
                      │            PropertyDocument
                 ┌────┴────┐
                 │ Portal  │
                 │ Listing │
                 └─────────┘
```

### 5.2 Full Table List with Key Fields

**Core Tables:**

```sql
-- 1. Office (Emlak Ofisi)
office
  id, name, slug, phone, email, address
  tax_number, tax_office          -- Vergi no, vergi dairesi
  trade_registry_number           -- Ticaret sicil no
  license_number                  -- Emlak yetki belgesi no
  logo_url, website
  commission_rate_buy             -- Default alici komisyon %
  commission_rate_sell            -- Default satici komisyon %
  commission_rate_rent            -- Default kira komisyon
  settings (JSONB)                -- Office-specific settings
  created_at, updated_at

-- 2. User (Kullanici / Emlak Danismani)
user
  id, office_id (FK), email, phone, password_hash
  first_name, last_name, avatar_url
  role (ENUM: admin, manager, agent, secretary, viewer)
  tc_kimlik_no                    -- Turkish national ID (encrypted)
  title                           -- Unvan (e.g., "Kidemli Danismani")
  is_active, last_login_at
  notification_preferences (JSONB)
  created_at, updated_at

-- 3. Contact (Musteri)
contact
  id, office_id (FK), assigned_user_id (FK)
  type (ENUM: individual, corporate)
  first_name, last_name, company_name
  email, phone, phone_secondary
  tc_kimlik_no (encrypted)        -- For individuals
  tax_number                      -- For corporates
  address, city, district
  source (ENUM: portal, referral, walkin, website, whatsapp, phone, other)
  source_detail                   -- e.g., "sahibinden.com", referrer name
  status (ENUM: lead, prospect, active, customer, inactive, lost)
  interest_type (ENUM: buyer, seller, renter, landlord, investor)
  budget_min, budget_max          -- TL
  preferred_locations (JSONB)     -- Array of il/ilce/mahalle
  preferred_property_types (JSONB)
  notes
  tags (text[])
  last_contact_at
  next_followup_at
  created_at, updated_at

-- 4. Property (Gayrimenkul / Ilan)
property
  id, office_id (FK), assigned_user_id (FK), contact_id (FK nullable -- owner)

  -- Classification
  listing_type (ENUM: sale, rent, daily_rent, transfer, exchange)
  property_type (ENUM: apartment, villa, detached, residence, office, shop,
                        store, warehouse, factory, land, zoned_land,
                        field, garden, hotel, apart_hotel)
  property_status (ENUM: draft, active, passive, sold, rented, withdrawn)

  -- Basic Info
  title, description              -- Ilan basligi, aciklamasi
  price, currency (ENUM: TRY, USD, EUR, GBP)
  price_per_sqm                   -- Computed/stored
  is_negotiable                   -- Pazarlik payı var mi

  -- Location
  il_id (FK), ilce_id (FK), mahalle_id (FK)
  address, latitude, longitude
  building_id (FK nullable)       -- If part of a site/bina

  -- Physical Attributes
  gross_sqm, net_sqm              -- Brut m2, Net m2
  room_count                      -- Oda sayisi (e.g., "3+1")
  living_room_count               -- Salon
  bathroom_count
  floor_number                    -- Bulundugu kat
  total_floors                    -- Bina kat sayisi
  building_age                    -- Bina yasi
  heating_type (ENUM: central, individual_natural_gas, combi,
                       stove, floor_heating, air_conditioner, none)

  -- Turkish Specific
  deed_type (ENUM: kat_mulkiyeti, kat_irtifaki, arsa_tapusu,
                    hisseli_tapu, musteakil)
  deed_status                     -- Tapu durumu
  ada_no, parsel_no               -- Cadastral identifiers
  is_in_site                      -- Site icerisinde mi
  site_name
  dues_amount                     -- Aidat (TL/month)
  has_iskan                       -- Iskan var mi
  has_dask                        -- DASK var mi
  dask_policy_no
  dask_expiry_date
  energy_class (ENUM: A, B, C, D, E, F, G)
  is_eligible_for_credit          -- Krediye uygun mu
  exchange_allowed                -- Takas olur mu

  -- Flags
  is_furnished                    -- Esyali mi
  usage_status (ENUM: empty, tenant_occupied, owner_occupied)
  facing_direction (ENUM: north, south, east, west,
                           northeast, northwest, southeast, southwest)
  view_type (text[])              -- Manzara: deniz, sehir, doga, havuz etc.

  -- Internal
  internal_notes
  tags (text[])
  virtual_tour_url
  video_url

  -- Timestamps
  available_date                  -- Teslim tarihi
  created_at, updated_at, published_at

-- 5. PropertyFeature (Ilan Ozellikleri)
property_feature
  id, property_id (FK), feature_id (FK)
  -- Features: asansor, otopark, havuz, balkon, teras,
  --           guvenlik, jenerator, siteicerisinde, etc.

-- 6. Feature (Ozellik Tanimlari)
feature
  id, name_tr, name_en, category
  -- Categories: ic_ozellikler, dis_ozellikler, muhit,
  --             ulasim, manzara, etc.

-- 7. PropertyPhoto (Ilan Fotograflari)
property_photo
  id, property_id (FK), url, thumbnail_url
  order_index, caption, is_cover
  width, height, size_bytes
  created_at

-- 8. PropertyDocument (Ilan Evraklari)
property_document
  id, property_id (FK), uploaded_by (FK)
  type (ENUM: tapu, iskan, dask, imar, ruhsat,
              energi_kimlik, floor_plan, contract, other)
  file_url, file_name, file_size
  notes
  created_at

-- 9. Deal (Satis/Kiralama Sureci)
deal
  id, office_id (FK), assigned_user_id (FK)
  contact_id (FK)                 -- Buyer/Renter
  property_id (FK)

  type (ENUM: sale, rent)
  stage (ENUM: inquiry, showing, negotiation, offer,
               deposit, contract, tapu_transfer, completed, lost)

  -- Financial
  asking_price                    -- Talep edilen fiyat
  offer_price                     -- Teklif edilen fiyat
  agreed_price                    -- Anlasman fiyat
  deposit_amount                  -- Kapora
  deposit_paid_at

  -- Commission
  commission_buyer_rate           -- Alici komisyon %
  commission_seller_rate          -- Satici komisyon %
  commission_total                -- Toplam komisyon (calculated)
  commission_status (ENUM: pending, invoiced, partially_paid, paid)

  -- Dates
  expected_close_date
  actual_close_date
  tapu_appointment_date           -- Tapu randevu tarihi

  -- Details
  notes
  lost_reason                     -- If stage = lost

  created_at, updated_at

-- 10. DealStageHistory
deal_stage_history
  id, deal_id (FK), from_stage, to_stage
  changed_by (FK), notes, created_at

-- 11. Activity (Aktivite Kaydi)
activity
  id, office_id (FK), user_id (FK)
  contact_id (FK nullable), property_id (FK nullable), deal_id (FK nullable)
  type (ENUM: call, meeting, showing, note, email, whatsapp,
              sms, task_completed, deal_stage_change, document_upload)
  subject, description
  duration_minutes                -- For calls/meetings
  outcome                         -- Result of the activity
  created_at

-- 12. Task (Gorev)
task
  id, office_id (FK)
  assigned_to (FK), created_by (FK)
  contact_id (FK nullable), property_id (FK nullable), deal_id (FK nullable)
  title, description
  type (ENUM: call, meeting, showing, followup, document, reminder, other)
  priority (ENUM: low, medium, high, urgent)
  status (ENUM: pending, in_progress, completed, cancelled)
  due_date, completed_at
  is_recurring, recurrence_rule    -- RRULE format
  reminder_at
  created_at, updated_at

-- 13. Appointment (Randevu / Gosterim)
appointment
  id, office_id (FK), user_id (FK)
  contact_id (FK), property_id (FK nullable), deal_id (FK nullable)
  type (ENUM: showing, meeting, tapu_appointment, bank_meeting, other)
  title, notes
  start_time, end_time
  location
  status (ENUM: scheduled, confirmed, completed, cancelled, no_show)
  reminder_sent
  created_at, updated_at

-- 14. Commission (Komisyon)
commission
  id, deal_id (FK), office_id (FK)
  agent_id (FK)
  type (ENUM: buyer_side, seller_side, referral)
  rate, amount
  agent_share_rate                -- Agent pay split %
  agent_share_amount
  office_share_amount
  status (ENUM: pending, approved, invoiced, paid)
  invoice_no
  payment_date
  notes
  created_at, updated_at

-- 15. PortalListing (Portal Ilan Durumu)
portal_listing
  id, property_id (FK), portal_id (FK)
  external_listing_id             -- ID on the portal
  status (ENUM: draft, pending, published, rejected, expired, removed)
  published_at, expires_at
  portal_url                      -- Link on portal
  views_count, favorites_count    -- Synced from portal
  last_synced_at
  error_message                   -- If rejected/error
  created_at, updated_at

-- 16. Portal (Portal Tanimlari)
portal
  id, name, slug, base_url, api_url
  api_key (encrypted), api_secret (encrypted)
  is_active
  settings (JSONB)                -- Portal-specific config
  created_at, updated_at

-- 17. Message (Mesaj)
message
  id, office_id (FK)
  conversation_id (FK)
  sender_type (ENUM: user, contact, system)
  sender_id                       -- user_id or contact_id
  channel (ENUM: whatsapp, sms, email, internal)
  content, media_url, media_type
  status (ENUM: sent, delivered, read, failed)
  external_message_id             -- WhatsApp/SMS provider message ID
  created_at

-- 18. Conversation (Konusma)
conversation
  id, office_id (FK)
  contact_id (FK), assigned_user_id (FK)
  channel (ENUM: whatsapp, sms, email)
  status (ENUM: open, pending, resolved, closed)
  last_message_at
  unread_count
  created_at, updated_at

-- 19. MessageTemplate (Mesaj Sablonlari)
message_template
  id, office_id (FK)
  name, channel, category
  subject                         -- For email
  content                         -- With {{variable}} placeholders
  variables (text[])              -- List of variable names
  is_whatsapp_approved            -- HSM approval status
  whatsapp_template_id
  language (default: 'tr')
  created_at, updated_at

-- 20. Notification (Bildirim)
notification
  id, user_id (FK)
  type (ENUM: task_due, deal_stage, new_lead, message_received,
              appointment_reminder, portal_update, system)
  title, body
  link                            -- Deep link within app
  is_read, read_at
  created_at

-- LOCATION TABLES --

-- 21. Il (Sehir/Province)
il
  id, name, plate_code (01-81)

-- 22. Ilce (District)
ilce
  id, il_id (FK), name

-- 23. Mahalle (Neighborhood)
mahalle
  id, ilce_id (FK), name, postal_code

-- 24. Building (Bina/Site)
building
  id, office_id (FK)
  name, type (ENUM: site, apartment_block, plaza, residance)
  il_id (FK), ilce_id (FK), mahalle_id (FK)
  address, latitude, longitude
  total_units, total_floors
  building_age, construction_year
  has_elevator, has_pool, has_gym, has_security
  has_generator, has_parking, has_playground
  management_company, monthly_dues
  notes
  created_at, updated_at

-- SUPPORTING TABLES --

-- 25. Tag
tag
  id, office_id (FK), name, color, entity_type

-- 26. CustomField (Ozel Alan)
custom_field
  id, office_id (FK), entity_type (contact/property/deal)
  field_name, field_label_tr, field_type (text/number/date/select/boolean)
  options (JSONB), is_required, order_index
  created_at

-- 27. CustomFieldValue
custom_field_value
  id, custom_field_id (FK), entity_id, value
  created_at, updated_at

-- 28. AuditLog (Denetim Kaydi)
audit_log
  id, office_id (FK), user_id (FK)
  entity_type, entity_id, action (create/update/delete)
  old_values (JSONB), new_values (JSONB)
  ip_address, user_agent
  created_at

-- 29. FileUpload
file_upload
  id, office_id (FK), uploaded_by (FK)
  file_name, file_path, file_size, mime_type
  entity_type, entity_id
  created_at

-- 30. Setting (Ayar)
setting
  id, office_id (FK)
  key, value (JSONB)
  created_at, updated_at

-- 31. EmailAccount
email_account
  id, office_id (FK), user_id (FK nullable)
  email, smtp_host, smtp_port, smtp_user, smtp_pass (encrypted)
  imap_host, imap_port, imap_user, imap_pass (encrypted)
  is_default
  created_at, updated_at

-- 32. Campaign (Kampanya)
campaign
  id, office_id (FK), created_by (FK)
  name, type (ENUM: whatsapp, sms, email)
  status (ENUM: draft, scheduled, sending, completed, cancelled)
  template_id (FK nullable)
  recipient_filter (JSONB)        -- Contact filter criteria
  scheduled_at, started_at, completed_at
  total_recipients, sent_count, delivered_count, read_count, failed_count
  created_at, updated_at

-- 33. CampaignRecipient
campaign_recipient
  id, campaign_id (FK), contact_id (FK)
  status (ENUM: pending, sent, delivered, read, failed)
  sent_at, error_message

-- 34. PropertyMatch (Eslestirme)
property_match
  id, contact_id (FK), property_id (FK)
  score                           -- Match percentage
  status (ENUM: suggested, sent, viewed, interested, not_interested)
  sent_at, responded_at
  created_at

-- 35. Showing (Gosterim)
showing
  id, appointment_id (FK), property_id (FK), contact_id (FK), user_id (FK)
  feedback_score (1-5)
  feedback_notes
  interest_level (ENUM: not_interested, maybe, interested, very_interested)
  created_at

-- 36. PaymentPlan (Odeme Plani -- for installment sales)
payment_plan
  id, deal_id (FK)
  installment_number, amount, due_date
  status (ENUM: pending, paid, overdue)
  paid_at, notes
  created_at, updated_at

-- 37. RefreshToken
refresh_token
  id, user_id (FK), token_hash, expires_at
  device_info, ip_address
  is_revoked, created_at

-- 38. WebhookLog
webhook_log
  id, source (whatsapp/portal/sms), event_type
  payload (JSONB), processed, error_message
  created_at, processed_at
```

### 5.3 Key Indexes

```sql
-- Performance-critical indexes
CREATE INDEX idx_property_listing_type ON property(listing_type, property_status);
CREATE INDEX idx_property_location ON property(il_id, ilce_id, mahalle_id);
CREATE INDEX idx_property_price ON property(price, currency) WHERE property_status = 'active';
CREATE INDEX idx_property_type_rooms ON property(property_type, room_count);
CREATE INDEX idx_property_office ON property(office_id, property_status);
CREATE INDEX idx_property_assigned ON property(assigned_user_id, property_status);

CREATE INDEX idx_contact_office ON contact(office_id, status);
CREATE INDEX idx_contact_assigned ON contact(assigned_user_id);
CREATE INDEX idx_contact_phone ON contact(phone);
CREATE INDEX idx_contact_search ON contact USING gin(to_tsvector('turkish',
    first_name || ' ' || last_name || ' ' || COALESCE(company_name, '')));

CREATE INDEX idx_deal_pipeline ON deal(office_id, stage) WHERE stage != 'lost';
CREATE INDEX idx_deal_contact ON deal(contact_id);
CREATE INDEX idx_deal_property ON deal(property_id);

CREATE INDEX idx_activity_contact ON activity(contact_id, created_at DESC);
CREATE INDEX idx_activity_property ON activity(property_id, created_at DESC);
CREATE INDEX idx_activity_user ON activity(user_id, created_at DESC);

CREATE INDEX idx_task_assigned ON task(assigned_to, status, due_date);
CREATE INDEX idx_notification_user ON notification(user_id, is_read, created_at DESC);

CREATE INDEX idx_message_conversation ON message(conversation_id, created_at DESC);
CREATE INDEX idx_conversation_contact ON conversation(contact_id);

CREATE INDEX idx_portal_listing ON portal_listing(property_id, portal_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id, created_at DESC);

-- Full-text search for properties
CREATE INDEX idx_property_search ON property USING gin(to_tsvector('turkish',
    title || ' ' || COALESCE(description, '') || ' ' || COALESCE(site_name, '')));
```

---

## 6. API Architecture

### 6.1 API Design Principles

- RESTful with consistent naming
- Turkish-friendly but English endpoint names
- Versioned: `/api/v1/...`
- JSON request/response
- Cursor-based pagination for large lists, offset for admin
- Consistent error format
- Rate limiting per user
- Request ID tracking

### 6.2 Authentication Endpoints

```
POST   /api/v1/auth/login              -- Email + password login
POST   /api/v1/auth/refresh            -- Refresh access token
POST   /api/v1/auth/logout             -- Invalidate refresh token
POST   /api/v1/auth/forgot-password    -- Send reset email/SMS
POST   /api/v1/auth/reset-password     -- Complete password reset
GET    /api/v1/auth/me                 -- Get current user profile
PUT    /api/v1/auth/me                 -- Update profile
PUT    /api/v1/auth/me/password        -- Change password
```

### 6.3 Core Resource Endpoints

```
-- Contacts (Musteriler)
GET    /api/v1/contacts                -- List with filters, search, pagination
POST   /api/v1/contacts                -- Create contact
GET    /api/v1/contacts/:id            -- Get contact detail
PUT    /api/v1/contacts/:id            -- Update contact
DELETE /api/v1/contacts/:id            -- Soft delete contact
GET    /api/v1/contacts/:id/activities -- Contact activities
GET    /api/v1/contacts/:id/deals      -- Contact deals
GET    /api/v1/contacts/:id/properties -- Contact properties (owned)
GET    /api/v1/contacts/:id/matches    -- Property matches
POST   /api/v1/contacts/:id/merge      -- Merge duplicate contacts
POST   /api/v1/contacts/import         -- Bulk import (CSV/Excel)
GET    /api/v1/contacts/export         -- Export to CSV/Excel

-- Properties (Ilanlar)
GET    /api/v1/properties              -- List with filters
POST   /api/v1/properties              -- Create property
GET    /api/v1/properties/:id          -- Get property detail
PUT    /api/v1/properties/:id          -- Update property
DELETE /api/v1/properties/:id          -- Soft delete
POST   /api/v1/properties/:id/photos   -- Upload photos
DELETE /api/v1/properties/:id/photos/:photoId
PUT    /api/v1/properties/:id/photos/reorder
POST   /api/v1/properties/:id/documents -- Upload document
GET    /api/v1/properties/:id/portal-status -- Portal listing statuses
POST   /api/v1/properties/:id/publish  -- Publish to portals
POST   /api/v1/properties/:id/unpublish
GET    /api/v1/properties/:id/matches  -- Matching contacts
POST   /api/v1/properties/:id/duplicate -- Clone listing
GET    /api/v1/properties/map          -- Geo-clustered results
GET    /api/v1/properties/statistics   -- Price stats for area

-- Deals (Satislar)
GET    /api/v1/deals                   -- List (pipeline view data)
POST   /api/v1/deals                   -- Create deal
GET    /api/v1/deals/:id               -- Get deal detail
PUT    /api/v1/deals/:id               -- Update deal
PUT    /api/v1/deals/:id/stage         -- Move to next/prev stage
GET    /api/v1/deals/:id/history       -- Stage change history
POST   /api/v1/deals/:id/commission    -- Calculate commission
GET    /api/v1/deals/pipeline          -- Kanban board data

-- Activities (Aktiviteler)
GET    /api/v1/activities              -- List with filters
POST   /api/v1/activities              -- Log activity
GET    /api/v1/activities/:id
PUT    /api/v1/activities/:id
DELETE /api/v1/activities/:id

-- Tasks (Gorevler)
GET    /api/v1/tasks                   -- List
POST   /api/v1/tasks
GET    /api/v1/tasks/:id
PUT    /api/v1/tasks/:id
PUT    /api/v1/tasks/:id/complete      -- Mark complete
DELETE /api/v1/tasks/:id
GET    /api/v1/tasks/my                -- Current user's tasks
GET    /api/v1/tasks/overdue           -- Overdue tasks

-- Calendar / Appointments (Takvim)
GET    /api/v1/appointments            -- List (date range)
POST   /api/v1/appointments
GET    /api/v1/appointments/:id
PUT    /api/v1/appointments/:id
DELETE /api/v1/appointments/:id
GET    /api/v1/appointments/availability -- Check user availability

-- Showings (Gosterimler)
POST   /api/v1/showings                -- Record a showing
PUT    /api/v1/showings/:id/feedback   -- Add showing feedback

-- Commissions (Komisyonlar)
GET    /api/v1/commissions             -- List
GET    /api/v1/commissions/:id
PUT    /api/v1/commissions/:id/status  -- Update payment status
GET    /api/v1/commissions/summary     -- Summary statistics
```

### 6.4 Communication Endpoints

```
-- Messages
GET    /api/v1/conversations           -- List conversations
GET    /api/v1/conversations/:id       -- Get conversation with messages
POST   /api/v1/conversations/:id/messages -- Send message
PUT    /api/v1/conversations/:id/assign   -- Assign to agent

-- WhatsApp specific
POST   /api/v1/whatsapp/send           -- Send WhatsApp message
POST   /api/v1/whatsapp/send-template  -- Send template message
POST   /api/v1/whatsapp/webhook        -- Incoming webhook (Meta)
GET    /api/v1/whatsapp/templates      -- List approved templates

-- SMS
POST   /api/v1/sms/send               -- Send SMS
POST   /api/v1/sms/send-bulk          -- Bulk SMS
POST   /api/v1/sms/webhook            -- Delivery reports (Netgsm)

-- Email
POST   /api/v1/email/send             -- Send email
GET    /api/v1/email/templates         -- List email templates

-- Campaigns
GET    /api/v1/campaigns
POST   /api/v1/campaigns
GET    /api/v1/campaigns/:id
PUT    /api/v1/campaigns/:id
POST   /api/v1/campaigns/:id/send     -- Execute campaign
GET    /api/v1/campaigns/:id/stats    -- Campaign statistics
```

### 6.5 Portal Integration Endpoints

```
GET    /api/v1/portals                 -- List configured portals
PUT    /api/v1/portals/:id/config      -- Update portal config
POST   /api/v1/portals/:id/test        -- Test connection
POST   /api/v1/portals/publish         -- Publish to multiple portals
GET    /api/v1/portals/listings        -- All portal listings
POST   /api/v1/portals/sync            -- Force sync all
GET    /api/v1/portals/:id/categories  -- Get portal categories
POST   /api/v1/portals/webhook         -- Portal lead webhook
```

### 6.6 Admin/Settings Endpoints

```
-- Users
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/:id
PUT    /api/v1/users/:id
PUT    /api/v1/users/:id/role
DELETE /api/v1/users/:id               -- Deactivate

-- Office Settings
GET    /api/v1/settings
PUT    /api/v1/settings
GET    /api/v1/settings/custom-fields
POST   /api/v1/settings/custom-fields
PUT    /api/v1/settings/custom-fields/:id
DELETE /api/v1/settings/custom-fields/:id

-- Templates
GET    /api/v1/templates
POST   /api/v1/templates
PUT    /api/v1/templates/:id
DELETE /api/v1/templates/:id

-- Locations (read-only, seeded)
GET    /api/v1/locations/iller         -- All provinces
GET    /api/v1/locations/ilceler?il_id=34   -- Districts of province
GET    /api/v1/locations/mahalleler?ilce_id=123  -- Neighborhoods
```

### 6.7 Reporting Endpoints

```
GET    /api/v1/reports/dashboard        -- Dashboard summary data
GET    /api/v1/reports/sales            -- Sales performance
GET    /api/v1/reports/agents           -- Agent performance comparison
GET    /api/v1/reports/commissions      -- Commission report
GET    /api/v1/reports/properties       -- Property analytics
GET    /api/v1/reports/portals          -- Portal performance
GET    /api/v1/reports/activities       -- Activity summary
GET    /api/v1/reports/pipeline         -- Pipeline conversion metrics
GET    /api/v1/reports/export/:type     -- Export any report to Excel
```

### 6.8 Standard Response Format

```typescript
// Success response
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    cursor?: string;
  };
}

// Error response
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;           // Machine-readable: "VALIDATION_ERROR"
    message: string;        // Human-readable (Turkish): "Zorunlu alanlar eksik"
    details?: Array<{
      field: string;
      message: string;
    }>;
    requestId: string;
  };
}
```

### 6.9 Middleware Stack

```
Request Flow:
  → requestId          (Assign unique request ID)
  → cors               (CORS configuration)
  → helmet             (Security headers)
  → rateLimit          (Per-user rate limiting)
  → bodyParser         (JSON parsing, 10MB limit for uploads)
  → authenticate       (JWT validation, attach user to req)
  → authorize(roles)   (Role-based access check)
  → validateInput(schema)  (Zod schema validation)
  → [route handler]    (Business logic)
  → errorHandler       (Catch-all error formatting)
  → requestLogger      (Log request/response)
```

---

## 7. Frontend Architecture

### 7.1 Next.js App Router Structure

```
src/frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              -- Sidebar + topbar layout
│   │   ├── page.tsx                -- Dashboard home
│   │   ├── contacts/
│   │   │   ├── page.tsx            -- Contact list
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx        -- Contact detail
│   │   │       └── edit/page.tsx
│   │   ├── properties/
│   │   │   ├── page.tsx            -- Property list (table + grid views)
│   │   │   ├── new/page.tsx
│   │   │   ├── map/page.tsx        -- Map view
│   │   │   └── [id]/
│   │   │       ├── page.tsx        -- Property detail
│   │   │       └── edit/page.tsx
│   │   ├── deals/
│   │   │   ├── page.tsx            -- Pipeline kanban
│   │   │   └── [id]/page.tsx
│   │   ├── calendar/page.tsx
│   │   ├── tasks/page.tsx
│   │   ├── messages/
│   │   │   ├── page.tsx            -- Message center
│   │   │   └── [conversationId]/page.tsx
│   │   ├── portals/
│   │   │   ├── page.tsx            -- Portal dashboard
│   │   │   └── publish/page.tsx
│   │   ├── reports/
│   │   │   ├── page.tsx
│   │   │   ├── sales/page.tsx
│   │   │   ├── agents/page.tsx
│   │   │   └── commissions/page.tsx
│   │   ├── documents/page.tsx
│   │   ├── matching/page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       ├── office/page.tsx
│   │       ├── users/page.tsx
│   │       ├── templates/page.tsx
│   │       ├── custom-fields/page.tsx
│   │       └── portals/page.tsx
│   ├── api/                        -- Next.js API routes (proxy/BFF)
│   ├── globals.css
│   └── layout.tsx                  -- Root layout
```

### 7.2 State Management Architecture

```
Client State (Zustand):
  ├── authStore          -- Current user, tokens
  ├── uiStore            -- Sidebar state, modals, toasts
  ├── filterStore        -- Active filters for lists
  └── notificationStore  -- Unread notifications

Server State (TanStack Query):
  ├── useContacts()      -- Contact list queries
  ├── useContact(id)     -- Single contact
  ├── useProperties()    -- Property list queries
  ├── useProperty(id)    -- Single property
  ├── useDeals()         -- Pipeline data
  ├── useTasks()         -- Task list
  ├── useConversations() -- Message conversations
  └── useDashboard()     -- Dashboard aggregates

Mutations (TanStack Query):
  ├── useCreateContact()
  ├── useUpdateContact()
  ├── useCreateProperty()
  ├── usePublishToPortal()
  ├── useSendMessage()
  ├── useUpdateDealStage()
  └── ... (one per write operation)
```

### 7.3 Key Component Specifications

**PropertyForm -- The most complex form in the system:**
- Multi-step wizard: Basic Info -> Location -> Details -> Features -> Photos -> Portal Settings
- Dynamic fields based on property_type (land has no room_count, etc.)
- Turkish-formatted price input (1.234.567 TL)
- Map-based location picker
- Drag-and-drop photo upload with reordering
- Feature checkboxes grouped by category
- Auto-save draft functionality
- Estimated 40+ form fields

**DealPipelineBoard:**
- Kanban board with drag-and-drop (dnd-kit)
- Columns: Inquiry -> Showing -> Negotiation -> Offer -> Deposit -> Contract -> Tapu -> Complete
- Card shows: Contact name, property title, price, days-in-stage
- Quick actions on cards (call, message, move stage)
- Filtering by agent, date range, property type

**PropertyMatchingView:**
- Split view: Contact criteria on left, matching properties on right
- Score-based ranking (% match)
- One-click "send to contact" via WhatsApp/SMS
- Match criteria: location, price range, property type, room count, features

### 7.4 Localization (i18n)

- Primary language: Turkish
- Secondary: English
- Use `next-intl` or custom solution
- All UI labels, error messages, and notifications in Turkish by default
- Number formatting: 1.234.567,89 (Turkish style)
- Date formatting: 28.03.2026 (dd.MM.yyyy)
- Currency: 1.500.000 TL or $150,000
- Phone: +90 (532) 123 45 67

---

## 8. Integration Architecture

### 8.1 Portal Integration (Syndication Engine)

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Property   │────►│  Syndication     │────►│ sahibinden   │
│  Database   │     │  Engine          │────►│ hepsiemlak   │
└─────────────┘     │                  │────►│ emlakjet     │
                    │  - Field mapping │     └──────────────┘
                    │  - Photo resize  │
                    │  - Status sync   │     ┌──────────────┐
                    │  - Lead capture  │◄────│  Webhooks /  │
                    └──────────────────┘     │  Polling     │
                                            └──────────────┘
```

**Syndication Engine Design:**

```typescript
interface PortalAdapter {
  name: string;

  // Outbound
  mapPropertyToPortalFormat(property: Property): PortalListingPayload;
  publishListing(payload: PortalListingPayload): Promise<PortalListingResult>;
  updateListing(externalId: string, payload: Partial<PortalListingPayload>): Promise<void>;
  removeListing(externalId: string): Promise<void>;

  // Inbound
  parseLeadWebhook(payload: unknown): Lead;
  fetchListingStats(externalId: string): Promise<ListingStats>;

  // Validation
  validatePhotos(photos: Photo[]): ValidationResult;
  validateFields(property: Property): ValidationResult;
}

// Implement one adapter per portal
class SahibindenAdapter implements PortalAdapter { ... }
class HepsiemlakAdapter implements PortalAdapter { ... }
class EmlakjetAdapter implements PortalAdapter { ... }
```

**Field Mapping Strategy:**
- Maintain a mapping table per portal
- Category IDs differ across portals (sahibinden "Daire" != hepsiemlak "Daire" in terms of IDs)
- Some fields are portal-specific (sahibinden has "kimden" field)
- Photo requirements vary (sahibinden: min 3 photos, hepsiemlak: min 1)

### 8.2 WhatsApp Business Integration

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Agent    │────►│  Messaging   │────►│  WhatsApp    │
│  (User)   │     │  Service     │     │  Cloud API   │
└──────────┘     │              │     │  (Meta)      │
                 │  - Template  │     └──────┬───────┘
                 │    mgmt      │            │
                 │  - Queue     │     ┌──────┴───────┐
                 │  - Rate      │◄────│  Webhook     │
                 │    limiting  │     │  (incoming)  │
                 └──────────────┘     └──────────────┘
```

**WhatsApp Flow Details:**
1. Agent selects contact and message type
2. If outside 24-hour window: must use approved template (HSM)
3. If inside 24-hour window: free-form messaging allowed
4. Outgoing: call Meta Cloud API -> receive webhook for status updates
5. Incoming: Meta sends webhook -> parse -> create/update conversation -> notify agent
6. Media support: send property photos, receive customer photos of documents

**Template Examples (Turkish):**
```
-- New Listing Notification
Sayin {{1}}, aradiginiz kriterlere uygun yeni bir ilan bulundu:
{{2}} - {{3}} TL
Detaylar icin: {{4}}
Goruntulemek ister misiniz?

-- Appointment Reminder
Sayin {{1}}, yarin saat {{2}}'de {{3}} adresindeki gosterim
randevunuzu hatirlatmak isteriz. Onaylamak icin "EVET" yazin.

-- Follow-up
Sayin {{1}}, gecen hafta gezdigimiz {{2}} hakkinda
dusuncelerinizi ogrenebilir miyim?
```

### 8.3 SMS Integration (Netgsm)

```typescript
interface SmsProvider {
  sendSms(to: string, message: string, options?: SmsOptions): Promise<SmsResult>;
  sendBulkSms(recipients: string[], message: string): Promise<BulkSmsResult>;
  checkBalance(): Promise<number>;
  getDeliveryReport(messageId: string): Promise<DeliveryReport>;
}

interface SmsOptions {
  sender?: string;          // Originator / Baslik
  scheduledAt?: Date;       // Ileri tarihli gonderiim
  isOtp?: boolean;          // OTP messages use different route
}
```

**Netgsm API Integration Points:**
- REST API: `https://api.netgsm.com.tr/sms/send/get` (single SMS)
- Bulk: `https://api.netgsm.com.tr/sms/send/xml` (XML-based bulk)
- Report: `https://api.netgsm.com.tr/sms/report`
- Balance: `https://api.netgsm.com.tr/balance`
- Turkish character handling: Netgsm auto-handles Turkish chars
- Sender ID registration required with Netgsm

### 8.4 Map and Geocoding

- Use Leaflet (open-source) for map rendering
- OpenStreetMap tile layer (free) or Mapbox (paid, better styling)
- Geocoding: Google Maps Geocoding API or Nominatim (free/OSM)
- Reverse geocoding for address lookup from pin drop
- Clustered markers for property map view
- Distance calculation for "nearby properties"

### 8.5 Integration Error Handling

```typescript
interface IntegrationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    type: 'AUTH' | 'RATE_LIMIT' | 'VALIDATION' | 'TIMEOUT' | 'SERVER' | 'UNKNOWN';
    message: string;
    retryable: boolean;
    retryAfter?: number;    // seconds
  };
}

// Retry policy
const retryPolicy = {
  maxRetries: 3,
  backoff: 'exponential',   // 1s, 2s, 4s
  retryableErrors: ['RATE_LIMIT', 'TIMEOUT', 'SERVER'],
  nonRetryableErrors: ['AUTH', 'VALIDATION'],
};
```

---

## 9. Development Workflow

### 9.1 Phase Breakdown

```
Phase 1: Research & Requirements          [~2 days]
├── Research Agent: Domain analysis
├── Research Agent: Competitor analysis
├── Research Agent: PRD creation
├── Research Agent: User stories
└── Deliverable: docs/requirements/*

Phase 2: Architecture & Design            [~3 days]
├── Architect Agent: Database schema design
├── Architect Agent: API specification
├── Architect Agent: Frontend component tree
├── Architect Agent: Type definitions
├── Architect Agent: ADRs
└── Deliverable: prisma/schema.prisma, docs/architecture/*

Phase 3: Core Infrastructure              [~3 days]
├── DevOps Agent: Project scaffolding
├── DevOps Agent: Docker setup
├── DevOps Agent: CI/CD pipeline
├── Backend Agent: Express server setup
├── Backend Agent: Auth system
├── Backend Agent: Database migrations + seed
├── Frontend Agent: Next.js setup
├── Frontend Agent: Layout + navigation
├── Frontend Agent: Auth pages
└── Deliverable: Running dev environment with auth

Phase 4: Core Features (parallel)         [~7 days]
├── Backend Agent: Contact CRUD
│   └── Frontend Agent: Contact pages        (after API ready)
├── Backend Agent: Property CRUD
│   └── Frontend Agent: Property pages       (after API ready)
├── Backend Agent: Deal pipeline
│   └── Frontend Agent: Deal kanban          (after API ready)
├── Backend Agent: Task & calendar
│   └── Frontend Agent: Task & calendar pages (after API ready)
├── Backend Agent: Activity logging
├── Backend Agent: Document management
└── Deliverable: Working CRUD for all core entities

Phase 5: Integrations                     [~5 days]
├── Integration Agent: WhatsApp Business
├── Integration Agent: SMS (Netgsm)
├── Integration Agent: Email service
├── Integration Agent: Portal syndication engine
├── Integration Agent: Map integration
├── Frontend Agent: Message center
├── Frontend Agent: Portal management
└── Deliverable: All integrations functional

Phase 6: Advanced Features                [~4 days]
├── Backend Agent: Matching engine
├── Backend Agent: Commission calculator
├── Backend Agent: Reporting queries
├── Backend Agent: Search (full-text)
├── Frontend Agent: Matching page
├── Frontend Agent: Reports dashboard
├── Frontend Agent: Map view
└── Deliverable: Advanced features complete

Phase 7: Testing & QA                     [~3 days]
├── Testing Agent: Unit tests (backend)
├── Testing Agent: Unit tests (frontend)
├── Testing Agent: Integration tests
├── Testing Agent: E2E tests (critical paths)
├── All Agents: Bug fixes
└── Deliverable: Test suite passing, coverage met

Phase 8: Polish & Documentation           [~2 days]
├── Frontend Agent: UI polish, responsive, dark mode
├── Architect Agent: API documentation
├── DevOps Agent: Deployment documentation
├── All Agents: Final review
└── Deliverable: Production-ready application
```

**Total estimated: ~29 working days**

### 9.2 Parallel Execution Strategy

Within Phase 4, tasks are parallelized across backend and frontend:

```
Week 1 (Backend Focus):
  Day 1-2: Contact + Property APIs (Backend)
  Day 1-2: Component library + layouts (Frontend)
  Day 3: Contact pages (Frontend) + Deal API (Backend)
  Day 4: Property pages (Frontend) + Task/Calendar API (Backend)
  Day 5: Deal kanban (Frontend) + Activity/Document API (Backend)

Week 2 (Integration Focus):
  Day 6: Task/Calendar pages (Frontend) + WhatsApp (Integration)
  Day 7: Message center (Frontend) + SMS/Email (Integration)
  Day 8: Portal engine (Integration) + Portal pages (Frontend)
  Day 9-10: Matching + Reports + Map (Backend+Frontend parallel)
```

### 9.3 Agent Handoff Protocol

When one agent completes work that another depends on:

1. Completing agent updates its state file with deliverables
2. Completing agent creates a brief handoff document:
   ```
   agents/handoffs/BE-008-to-FE-012.md
   ---
   From: Backend Agent
   To: Frontend Agent
   Task: Property CRUD API is ready

   Endpoints available:
   - GET /api/v1/properties (paginated, filterable)
   - POST /api/v1/properties (with validation)
   - GET /api/v1/properties/:id
   - PUT /api/v1/properties/:id
   - DELETE /api/v1/properties/:id

   Types: src/shared/types/property.ts
   Validation: src/shared/validation/property.ts

   Notes:
   - Photo upload is a separate endpoint
   - Price is stored in kuruş (multiply by 100)
   - room_count is a string like "3+1"
   ```
3. Orchestrator dispatches the dependent task to the next agent with the handoff doc as context

---

## 10. GitHub Workflow

### 10.1 Branch Strategy

```
main                            -- Production-ready code
  └── develop                   -- Integration branch
       ├── feature/auth         -- Authentication system
       ├── feature/contacts     -- Contact management
       ├── feature/properties   -- Property management
       ├── feature/deals        -- Deal pipeline
       ├── feature/tasks        -- Task management
       ├── feature/calendar     -- Calendar/appointments
       ├── feature/messaging    -- WhatsApp/SMS/Email
       ├── feature/portals      -- Portal integrations
       ├── feature/reports      -- Reporting
       ├── feature/matching     -- Property matching
       ├── feature/map          -- Map view
       ├── feature/settings     -- Settings/admin
       ├── fix/[description]    -- Bug fixes
       ├── refactor/[desc]      -- Refactoring
       └── docs/[description]   -- Documentation
```

### 10.2 Commit Convention

Follow Conventional Commits with Turkish context annotations:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` -- New feature
- `fix` -- Bug fix
- `refactor` -- Code refactoring (no behavior change)
- `docs` -- Documentation
- `test` -- Tests
- `chore` -- Build, CI, tooling
- `style` -- Formatting (no logic change)
- `perf` -- Performance improvement

**Scopes:**
- `auth`, `contacts`, `properties`, `deals`, `tasks`, `calendar`
- `messaging`, `whatsapp`, `sms`, `email`
- `portals`, `sahibinden`, `hepsiemlak`, `emlakjet`
- `reports`, `matching`, `map`, `settings`
- `db`, `api`, `ui`, `infra`

**Examples:**
```
feat(properties): add multi-photo upload with drag-and-drop reordering

Supports up to 20 photos per listing with automatic thumbnail generation.
Photos are stored locally in /uploads and served via Express static middleware.

feat(portals): implement sahibinden XML feed generation

Maps internal property schema to sahibinden category structure.
Handles Turkish character encoding in descriptions.

fix(deals): correct commission calculation for split payments

Commission was being calculated on the full amount instead of the
remaining balance when partial payments were recorded.

feat(whatsapp): add template message support for appointment reminders

Integrates with Meta Cloud API for HSM template sending.
Includes Turkish-language templates for showing reminders and follow-ups.
```

### 10.3 PR Workflow (Agent-Driven)

```
1. Developer Agent completes a feature on feature branch
2. Developer Agent creates PR to develop:
   - Title: Descriptive, matches commit convention
   - Body: Summary of changes, screenshots (if UI), testing notes
3. Architect Agent reviews PR:
   - Code quality check
   - Pattern compliance
   - Type safety
   - Naming conventions
   - Performance concerns
4. Testing Agent runs automated checks:
   - Lint (ESLint)
   - Type check (tsc --noEmit)
   - Unit tests
   - Build test
5. If approved: Orchestrator merges to develop
6. If changes requested: Developer Agent addresses feedback, pushes
7. Periodic: develop merged to main (after full E2E pass)
```

### 10.4 GitHub Actions CI Pipeline

```yaml
# .github/workflows/ci.yml
triggers: [push to develop, PR to develop/main]

jobs:
  lint:
    - ESLint (backend + frontend)
    - Prettier check

  typecheck:
    - tsc --noEmit (backend)
    - tsc --noEmit (frontend)

  test-backend:
    - Setup PostgreSQL service
    - Run Prisma migrations
    - Run Vitest (backend unit + integration)

  test-frontend:
    - Run Vitest (frontend unit)
    - Run Playwright (E2E, on PR to main only)

  build:
    - npm run build (backend)
    - npm run build (frontend/Next.js)
```

---

## 11. Project Structure

```
emlak-crm/
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    -- CI pipeline
│   │   └── deploy.yml                -- Deployment (future)
│   └── PULL_REQUEST_TEMPLATE.md
│
├── agents/                           -- Agent system
│   ├── state/                        -- Agent state files
│   │   ├── orchestrator-state.json
│   │   ├── task-queue.json
│   │   └── ...
│   ├── handoffs/                     -- Agent handoff documents
│   ├── contracts/                    -- Shared contracts
│   │   ├── api-contract.yaml         -- OpenAPI spec
│   │   └── type-definitions.ts
│   └── logs/                         -- Activity logs
│
├── docs/
│   ├── requirements/
│   │   ├── PRD.md                    -- Product Requirements
│   │   ├── user-stories.md           -- Epics and stories
│   │   ├── domain-glossary.md        -- Turkish RE glossary
│   │   ├── business-processes.md     -- Workflow descriptions
│   │   └── data-dictionary.md        -- Field definitions
│   ├── architecture/
│   │   ├── database-schema.md        -- ERD documentation
│   │   ├── api-spec.yaml             -- OpenAPI 3.1
│   │   ├── frontend-components.md    -- Component tree
│   │   └── adr/                      -- Architecture Decision Records
│   │       ├── 001-tech-stack.md
│   │       ├── 002-auth-strategy.md
│   │       ├── 003-file-storage.md
│   │       └── ...
│   ├── guides/
│   │   ├── development-setup.md      -- Dev environment setup
│   │   ├── api-guide.md              -- API usage guide
│   │   └── deployment-guide.md
│   └── diagrams/                     -- Architecture diagrams
│
├── prisma/
│   ├── schema.prisma                 -- Database schema
│   ├── migrations/                   -- Migration files
│   └── seed/
│       ├── index.ts                  -- Seed runner
│       ├── iller.ts                  -- 81 Turkish provinces
│       ├── ilceler.ts                -- ~970 districts
│       ├── mahalleler.ts             -- Neighborhoods (key cities)
│       ├── features.ts               -- Property features
│       ├── demo-users.ts             -- Demo/test users
│       └── demo-data.ts              -- Sample properties, contacts
│
├── src/
│   ├── backend/
│   │   ├── server.ts                 -- Express app entry point
│   │   ├── config/
│   │   │   ├── index.ts              -- Config loader (env vars)
│   │   │   ├── database.ts           -- Prisma client singleton
│   │   │   ├── redis.ts              -- Redis client (optional)
│   │   │   └── logger.ts             -- Winston/Pino logger
│   │   ├── middleware/
│   │   │   ├── authenticate.ts       -- JWT verification
│   │   │   ├── authorize.ts          -- Role-based access
│   │   │   ├── validate.ts           -- Zod validation middleware
│   │   │   ├── rateLimit.ts          -- Rate limiting
│   │   │   ├── requestId.ts          -- Request ID assignment
│   │   │   ├── errorHandler.ts       -- Global error handler
│   │   │   └── requestLogger.ts      -- Request/response logging
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.validation.ts  -- Zod schemas
│   │   │   │   ├── auth.routes.ts
│   │   │   │   └── auth.test.ts
│   │   │   ├── contacts/
│   │   │   │   ├── contact.controller.ts
│   │   │   │   ├── contact.service.ts
│   │   │   │   ├── contact.repository.ts
│   │   │   │   ├── contact.validation.ts
│   │   │   │   ├── contact.routes.ts
│   │   │   │   └── contact.test.ts
│   │   │   ├── properties/
│   │   │   │   ├── property.controller.ts
│   │   │   │   ├── property.service.ts
│   │   │   │   ├── property.repository.ts
│   │   │   │   ├── property.validation.ts
│   │   │   │   ├── property.routes.ts
│   │   │   │   ├── property.test.ts
│   │   │   │   └── property-search.service.ts
│   │   │   ├── deals/
│   │   │   │   ├── deal.controller.ts
│   │   │   │   ├── deal.service.ts
│   │   │   │   ├── deal.repository.ts
│   │   │   │   ├── deal.validation.ts
│   │   │   │   ├── deal.routes.ts
│   │   │   │   ├── deal.test.ts
│   │   │   │   └── commission.service.ts
│   │   │   ├── activities/
│   │   │   │   ├── activity.controller.ts
│   │   │   │   ├── activity.service.ts
│   │   │   │   ├── activity.routes.ts
│   │   │   │   └── activity.test.ts
│   │   │   ├── tasks/
│   │   │   │   ├── task.controller.ts
│   │   │   │   ├── task.service.ts
│   │   │   │   ├── task.routes.ts
│   │   │   │   └── task.test.ts
│   │   │   ├── calendar/
│   │   │   │   ├── appointment.controller.ts
│   │   │   │   ├── appointment.service.ts
│   │   │   │   ├── appointment.routes.ts
│   │   │   │   └── showing.service.ts
│   │   │   ├── documents/
│   │   │   │   ├── document.controller.ts
│   │   │   │   ├── document.service.ts
│   │   │   │   └── document.routes.ts
│   │   │   ├── messaging/
│   │   │   │   ├── messaging.controller.ts
│   │   │   │   ├── messaging.service.ts   -- Orchestrates channels
│   │   │   │   ├── messaging.routes.ts
│   │   │   │   ├── conversation.service.ts
│   │   │   │   └── template.service.ts
│   │   │   ├── portals/
│   │   │   │   ├── portal.controller.ts
│   │   │   │   ├── syndication.service.ts -- Core syndication engine
│   │   │   │   ├── portal.routes.ts
│   │   │   │   └── portal.test.ts
│   │   │   ├── reports/
│   │   │   │   ├── report.controller.ts
│   │   │   │   ├── report.service.ts
│   │   │   │   ├── report.routes.ts
│   │   │   │   └── export.service.ts      -- Excel/PDF export
│   │   │   ├── matching/
│   │   │   │   ├── matching.controller.ts
│   │   │   │   ├── matching.service.ts    -- Scoring algorithm
│   │   │   │   └── matching.routes.ts
│   │   │   ├── notifications/
│   │   │   │   ├── notification.controller.ts
│   │   │   │   ├── notification.service.ts
│   │   │   │   └── notification.routes.ts
│   │   │   ├── locations/
│   │   │   │   ├── location.controller.ts
│   │   │   │   ├── location.service.ts
│   │   │   │   └── location.routes.ts
│   │   │   ├── settings/
│   │   │   │   ├── settings.controller.ts
│   │   │   │   ├── settings.service.ts
│   │   │   │   ├── settings.routes.ts
│   │   │   │   └── custom-field.service.ts
│   │   │   └── users/
│   │   │       ├── user.controller.ts
│   │   │       ├── user.service.ts
│   │   │       ├── user.routes.ts
│   │   │       └── user.test.ts
│   │   ├── jobs/                         -- Background jobs
│   │   │   ├── queue.ts                  -- Bull queue setup
│   │   │   ├── portal-sync.job.ts
│   │   │   ├── reminder.job.ts
│   │   │   ├── report-generation.job.ts
│   │   │   └── cleanup.job.ts
│   │   └── utils/
│   │       ├── encryption.ts             -- Field encryption (TC kimlik etc.)
│   │       ├── pagination.ts             -- Pagination helpers
│   │       ├── filters.ts                -- Query filter builders
│   │       ├── file-upload.ts            -- Multer config
│   │       ├── turkish.ts                -- Turkish string utils (sorting, search)
│   │       └── formatters.ts             -- Price, phone, date formatting
│   │
│   ├── frontend/
│   │   ├── app/                          -- Next.js App Router (see 7.1)
│   │   ├── components/
│   │   │   ├── ui/                       -- shadcn/ui base components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   └── ...                   -- ~30 base components
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── TopBar.tsx
│   │   │   │   ├── MobileNav.tsx
│   │   │   │   ├── Breadcrumb.tsx
│   │   │   │   └── PageHeader.tsx
│   │   │   ├── contacts/
│   │   │   │   ├── ContactListTable.tsx
│   │   │   │   ├── ContactCard.tsx
│   │   │   │   ├── ContactForm.tsx
│   │   │   │   ├── ContactDetail.tsx
│   │   │   │   ├── ContactFilterBar.tsx
│   │   │   │   └── ContactMergeDialog.tsx
│   │   │   ├── properties/
│   │   │   │   ├── PropertyListTable.tsx
│   │   │   │   ├── PropertyGrid.tsx       -- Card grid view
│   │   │   │   ├── PropertyCard.tsx
│   │   │   │   ├── PropertyForm/
│   │   │   │   │   ├── index.tsx          -- Multi-step wizard
│   │   │   │   │   ├── BasicInfoStep.tsx
│   │   │   │   │   ├── LocationStep.tsx
│   │   │   │   │   ├── DetailsStep.tsx
│   │   │   │   │   ├── FeaturesStep.tsx
│   │   │   │   │   ├── PhotosStep.tsx
│   │   │   │   │   └── PortalStep.tsx
│   │   │   │   ├── PropertyDetail.tsx
│   │   │   │   ├── PropertyFilterBar.tsx
│   │   │   │   ├── PropertyPhotoGallery.tsx
│   │   │   │   ├── PropertyMapView.tsx
│   │   │   │   └── PriceInput.tsx         -- Turkish price formatting
│   │   │   ├── deals/
│   │   │   │   ├── PipelineBoard.tsx      -- Kanban
│   │   │   │   ├── DealCard.tsx
│   │   │   │   ├── DealForm.tsx
│   │   │   │   ├── DealDetail.tsx
│   │   │   │   ├── StageTimeline.tsx
│   │   │   │   └── CommissionCalculator.tsx
│   │   │   ├── tasks/
│   │   │   │   ├── TaskList.tsx
│   │   │   │   ├── TaskCard.tsx
│   │   │   │   └── TaskForm.tsx
│   │   │   ├── calendar/
│   │   │   │   ├── CalendarView.tsx       -- Month/week/day
│   │   │   │   ├── AppointmentForm.tsx
│   │   │   │   └── ShowingFeedback.tsx
│   │   │   ├── messaging/
│   │   │   │   ├── ConversationList.tsx
│   │   │   │   ├── MessageThread.tsx
│   │   │   │   ├── MessageInput.tsx
│   │   │   │   ├── TemplateSelector.tsx
│   │   │   │   └── ChannelBadge.tsx
│   │   │   ├── portals/
│   │   │   │   ├── PortalDashboard.tsx
│   │   │   │   ├── PublishWizard.tsx
│   │   │   │   ├── PortalStatusBadge.tsx
│   │   │   │   └── PortalConfigForm.tsx
│   │   │   ├── reports/
│   │   │   │   ├── DashboardWidgets.tsx
│   │   │   │   ├── SalesChart.tsx
│   │   │   │   ├── AgentPerformance.tsx
│   │   │   │   ├── CommissionReport.tsx
│   │   │   │   └── PipelineFunnel.tsx
│   │   │   ├── matching/
│   │   │   │   ├── MatchingView.tsx
│   │   │   │   ├── MatchCard.tsx
│   │   │   │   └── MatchScoreBadge.tsx
│   │   │   ├── documents/
│   │   │   │   ├── DocumentManager.tsx
│   │   │   │   ├── DocumentUpload.tsx
│   │   │   │   └── DocumentViewer.tsx
│   │   │   ├── settings/
│   │   │   │   ├── OfficeSettingsForm.tsx
│   │   │   │   ├── UserManagement.tsx
│   │   │   │   ├── TemplateEditor.tsx
│   │   │   │   ├── CustomFieldBuilder.tsx
│   │   │   │   └── PortalSettings.tsx
│   │   │   └── shared/
│   │   │       ├── ActivityTimeline.tsx
│   │   │       ├── NotificationDropdown.tsx
│   │   │       ├── SearchDialog.tsx        -- Cmd+K global search
│   │   │       ├── ConfirmDialog.tsx
│   │   │       ├── EmptyState.tsx
│   │   │       ├── LoadingState.tsx
│   │   │       ├── ErrorBoundary.tsx
│   │   │       ├── DataTable.tsx           -- Generic sortable table
│   │   │       ├── FilterPanel.tsx
│   │   │       ├── PhoneInput.tsx          -- +90 format
│   │   │       ├── TCKNInput.tsx           -- TC Kimlik validation
│   │   │       ├── LocationSelector.tsx    -- Il > Ilce > Mahalle cascade
│   │   │       ├── MapPicker.tsx           -- Pin-drop map
│   │   │       └── FileDropzone.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useContacts.ts             -- React Query hooks
│   │   │   ├── useProperties.ts
│   │   │   ├── useDeals.ts
│   │   │   ├── useTasks.ts
│   │   │   ├── useConversations.ts
│   │   │   ├── useNotifications.ts
│   │   │   ├── useDebounce.ts
│   │   │   ├── useMediaQuery.ts
│   │   │   └── useInfiniteScroll.ts
│   │   ├── lib/
│   │   │   ├── api-client.ts              -- Axios/fetch wrapper
│   │   │   ├── query-client.ts            -- TanStack Query config
│   │   │   ├── auth.ts                    -- Token management
│   │   │   ├── utils.ts                   -- cn(), formatters
│   │   │   └── constants.ts               -- Enum labels, config
│   │   ├── stores/
│   │   │   ├── auth-store.ts              -- Zustand
│   │   │   ├── ui-store.ts
│   │   │   └── filter-store.ts
│   │   ├── styles/
│   │   │   └── globals.css                -- Tailwind + custom styles
│   │   ├── i18n/
│   │   │   ├── tr.json                    -- Turkish translations
│   │   │   └── en.json                    -- English translations
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   ├── shared/                            -- Shared between backend + frontend
│   │   ├── types/
│   │   │   ├── index.ts
│   │   │   ├── auth.ts
│   │   │   ├── contact.ts
│   │   │   ├── property.ts
│   │   │   ├── deal.ts
│   │   │   ├── activity.ts
│   │   │   ├── task.ts
│   │   │   ├── appointment.ts
│   │   │   ├── message.ts
│   │   │   ├── portal.ts
│   │   │   ├── commission.ts
│   │   │   ├── report.ts
│   │   │   ├── notification.ts
│   │   │   ├── location.ts
│   │   │   └── common.ts                  -- Pagination, ApiResponse, etc.
│   │   ├── validation/
│   │   │   ├── contact.validation.ts
│   │   │   ├── property.validation.ts
│   │   │   ├── deal.validation.ts
│   │   │   └── common.validation.ts
│   │   ├── constants/
│   │   │   ├── enums.ts                   -- All enum definitions
│   │   │   ├── turkish-cities.ts          -- Il/Ilce static data
│   │   │   └── property-features.ts       -- Feature definitions
│   │   └── utils/
│   │       ├── turkish.ts                 -- Sorting, capitalization
│   │       ├── phone.ts                   -- TR phone formatting
│   │       ├── tckn.ts                    -- TC Kimlik validation algorithm
│   │       ├── price.ts                   -- Price formatting
│   │       └── date.ts                    -- Turkish date formatting
│   │
│   └── integrations/
│       ├── whatsapp/
│       │   ├── whatsapp.client.ts         -- Meta Cloud API client
│       │   ├── whatsapp.webhook.ts        -- Webhook handler
│       │   ├── whatsapp.types.ts
│       │   └── whatsapp.test.ts
│       ├── sms/
│       │   ├── netgsm.client.ts           -- Netgsm API client
│       │   ├── sms.service.ts
│       │   ├── sms.types.ts
│       │   └── sms.test.ts
│       ├── email/
│       │   ├── email.client.ts            -- Nodemailer wrapper
│       │   ├── email.templates.ts         -- HTML email templates
│       │   └── email.test.ts
│       ├── portals/
│       │   ├── portal.adapter.ts          -- Base adapter interface
│       │   ├── sahibinden/
│       │   │   ├── sahibinden.adapter.ts
│       │   │   ├── sahibinden.mapper.ts   -- Field mapping
│       │   │   ├── sahibinden.types.ts
│       │   │   └── sahibinden.test.ts
│       │   ├── hepsiemlak/
│       │   │   ├── hepsiemlak.adapter.ts
│       │   │   ├── hepsiemlak.mapper.ts
│       │   │   └── hepsiemlak.types.ts
│       │   └── emlakjet/
│       │       ├── emlakjet.adapter.ts
│       │       ├── emlakjet.mapper.ts
│       │       └── emlakjet.types.ts
│       └── maps/
│           ├── geocoding.service.ts
│           └── maps.types.ts
│
├── tests/
│   ├── setup.ts                           -- Test environment setup
│   ├── helpers/
│   │   ├── test-db.ts                     -- Test database utilities
│   │   ├── factories/                     -- Test data factories
│   │   │   ├── contact.factory.ts
│   │   │   ├── property.factory.ts
│   │   │   ├── deal.factory.ts
│   │   │   └── user.factory.ts
│   │   └── mocks/
│   │       ├── whatsapp.mock.ts
│   │       ├── netgsm.mock.ts
│   │       └── portal.mock.ts
│   ├── integration/
│   │   ├── auth.integration.test.ts
│   │   ├── contacts.integration.test.ts
│   │   ├── properties.integration.test.ts
│   │   ├── deals.integration.test.ts
│   │   └── portals.integration.test.ts
│   ├── e2e/
│   │   ├── playwright.config.ts
│   │   ├── auth.e2e.test.ts
│   │   ├── contact-flow.e2e.test.ts
│   │   ├── property-flow.e2e.test.ts
│   │   ├── deal-pipeline.e2e.test.ts
│   │   └── portal-publish.e2e.test.ts
│   └── performance/
│       ├── property-list.perf.ts
│       └── search.perf.ts
│
├── infrastructure/
│   ├── docker/
│   │   ├── Dockerfile.backend
│   │   ├── Dockerfile.frontend
│   │   └── nginx.conf                    -- Reverse proxy config
│   ├── docker-compose.yml                -- Full local environment
│   ├── docker-compose.dev.yml            -- Dev overrides
│   └── scripts/
│       ├── setup-dev.sh                  -- First-time dev setup
│       ├── seed-db.sh                    -- Database seeding
│       ├── backup-db.sh                  -- Database backup
│       └── generate-types.sh             -- Prisma type generation
│
├── uploads/                              -- Local file storage (gitignored)
│   ├── properties/
│   ├── documents/
│   └── avatars/
│
├── .env.example                          -- Environment variable template
├── .eslintrc.js                          -- ESLint configuration
├── .prettierrc                           -- Prettier configuration
├── .gitignore
├── package.json                          -- Root package.json (workspaces)
├── tsconfig.base.json                    -- Shared TypeScript config
├── turbo.json                            -- Turborepo config (optional)
└── README.md
```

---

## 12. Security Architecture

### 12.1 Authentication

- **JWT Access Tokens:** 15-minute expiry, signed with RS256
- **Refresh Tokens:** 7-day expiry, stored in DB, rotated on use
- **Password Hashing:** bcrypt with cost factor 12
- **Session Management:** Single-device or multi-device (configurable)
- **Login Throttling:** 5 failed attempts -> 15-minute lockout

### 12.2 Authorization (RBAC)

```typescript
enum Role {
  ADMIN = 'admin',         // Full access, user management
  MANAGER = 'manager',     // Team management, reports, all data
  AGENT = 'agent',         // Own data + assigned contacts/properties
  SECRETARY = 'secretary', // Data entry, scheduling, no financial data
  VIEWER = 'viewer',       // Read-only access
}

// Permission matrix (simplified)
const permissions = {
  admin:     { contacts: 'all', properties: 'all', deals: 'all', settings: 'all', reports: 'all', users: 'all' },
  manager:   { contacts: 'all', properties: 'all', deals: 'all', settings: 'read', reports: 'all', users: 'read' },
  agent:     { contacts: 'own', properties: 'own', deals: 'own', settings: 'none', reports: 'own', users: 'none' },
  secretary: { contacts: 'all', properties: 'all', deals: 'read', settings: 'none', reports: 'none', users: 'none' },
  viewer:    { contacts: 'read', properties: 'read', deals: 'read', settings: 'none', reports: 'read', users: 'none' },
};
```

### 12.3 Data Protection

- **KVKK Compliance (Turkish GDPR):**
  - Consent tracking for contact data
  - Data export capability (right to access)
  - Data deletion capability (right to erasure)
  - Audit log for all data access
  - Encrypted storage for PII (TC Kimlik No, phone in some contexts)

- **Field-Level Encryption:**
  - TC Kimlik No: AES-256-GCM encrypted at rest
  - API keys/secrets: AES-256-GCM encrypted
  - Passwords: bcrypt hashed (not encrypted)

- **API Security:**
  - CORS: Whitelist only known origins
  - Helmet: Security headers
  - Rate limiting: 100 req/min per user, 20 req/min for auth endpoints
  - Input sanitization: XSS prevention on all text inputs
  - SQL injection: Prisma parameterized queries (inherent protection)
  - File upload: Type validation, size limits (10MB per photo, 50MB per document)

### 12.4 Audit Trail

Every create, update, and delete operation on core entities (contacts, properties, deals) is logged to the `audit_log` table with:
- Who made the change
- What changed (old values vs. new values, stored as JSONB)
- When (timestamp)
- From where (IP address)

---

## 13. Testing Strategy

### 13.1 Test Pyramid

```
         ╱╲
        ╱ E2E╲           ~20 tests    (critical flows)
       ╱──────╲
      ╱ Integr. ╲        ~80 tests    (API endpoints)
     ╱────────────╲
    ╱   Unit Tests  ╲    ~300 tests   (services, utils, components)
   ╱────────────────────╲
```

### 13.2 Coverage Targets

| Layer | Target | Tool |
|-------|--------|------|
| Backend services | >80% | Vitest |
| Backend utils | >90% | Vitest |
| API endpoints | >75% | Supertest + Vitest |
| Frontend components | >70% | Vitest + React Testing Library |
| Frontend hooks | >80% | Vitest |
| E2E critical paths | 100% of defined paths | Playwright |

### 13.3 Test Data Strategy

- **Factories:** Use `@faker-js/faker` with Turkish locale for realistic test data
- **Database:** Separate test database, reset between test suites (Prisma migrate reset)
- **Mocks:** External services (WhatsApp, Netgsm, portals) are always mocked in unit/integration tests
- **Fixtures:** Static fixture files for portal API response mocking

### 13.4 Critical E2E Flows

1. **Complete Login Flow:** Login -> Dashboard -> Verify user data
2. **Contact-to-Deal Flow:** Create contact -> Create property -> Create deal -> Progress through pipeline -> Close deal
3. **Property Publishing Flow:** Create property -> Add photos -> Publish to portal -> Verify status
4. **Messaging Flow:** Open conversation -> Send WhatsApp template -> Receive reply -> Log as activity
5. **Commission Flow:** Close deal -> Calculate commission -> Generate report

---

## 14. DevOps and Infrastructure

### 14.1 Docker Compose (Local Development)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: emlak_crm
      POSTGRES_USER: emlak
      POSTGRES_PASSWORD: emlak_dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.backend
    environment:
      DATABASE_URL: postgresql://emlak:emlak_dev_password@postgres:5432/emlak_crm
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev-secret-key-change-in-production
      NODE_ENV: development
    ports:
      - "4000:4000"
    volumes:
      - ./src/backend:/app/src/backend
      - ./uploads:/app/uploads
    depends_on:
      - postgres
      - redis

  frontend:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.frontend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000/api/v1
    ports:
      - "3000:3000"
    volumes:
      - ./src/frontend:/app/src/frontend
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 14.2 Environment Variables

```env
# .env.example

# Database
DATABASE_URL=postgresql://emlak:password@localhost:5432/emlak_crm

# Redis (optional, for caching and job queue)
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Server
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# WhatsApp Business
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your-phone-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_VERIFY_TOKEN=your-verify-token
WHATSAPP_BUSINESS_ACCOUNT_ID=your-account-id

# SMS (Netgsm)
NETGSM_USERCODE=your-usercode
NETGSM_PASSWORD=your-password
NETGSM_SENDER=your-sender-id

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@emlakcrm.com

# Maps
GOOGLE_MAPS_API_KEY=your-api-key

# Encryption
ENCRYPTION_KEY=32-byte-hex-key-for-field-encryption

# Portal API Keys
SAHIBINDEN_API_KEY=
SAHIBINDEN_API_SECRET=
HEPSIEMLAK_API_KEY=
HEPSIEMLAK_API_SECRET=
EMLAKJET_API_KEY=
EMLAKJET_API_SECRET=
```

### 14.3 Database Migration Strategy

- Use Prisma Migrate for all schema changes
- Migration naming: `YYYYMMDDHHMMSS_description` (automatic by Prisma)
- Seed data split into:
  - **Required seeds** (always run): provinces, districts, features
  - **Demo seeds** (dev only): sample users, properties, contacts
- Migration review is part of Architect Agent PR review

### 14.4 CI/CD Pipeline Stages

```
Push to feature branch:
  → Lint → Typecheck → Unit Tests → Build Check

PR to develop:
  → Lint → Typecheck → Unit Tests → Integration Tests → Build Check

PR to main:
  → Lint → Typecheck → Unit Tests → Integration Tests → E2E Tests → Build Check

Merge to main:
  → Build → (future: Deploy to staging)
```

---

## 15. Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Portal APIs change without notice | HIGH | MEDIUM | Adapter pattern isolates changes; monitoring for API errors |
| WhatsApp API rate limits | MEDIUM | HIGH | Queue-based sending with rate limiting; template messages for cold contacts |
| Large photo uploads slow the system | MEDIUM | HIGH | Client-side resize before upload; background processing; CDN (future) |
| Turkish character encoding issues | MEDIUM | MEDIUM | UTF-8 everywhere; explicit Turkish locale in PostgreSQL; test with edge cases (I/i, G/g, S/s, O/o, U/u, C/c) |
| KVKK compliance gaps | HIGH | MEDIUM | Audit log from day 1; consent tracking; data export/delete APIs |
| Complex property form causes user frustration | MEDIUM | MEDIUM | Multi-step wizard; auto-save; field-level validation; sensible defaults |
| Agent offline when client messages arrive | MEDIUM | HIGH | Auto-assignment rules; notification escalation; "away" auto-responder |
| Database performance with large datasets | HIGH | LOW | Proper indexing from day 1; cursor pagination; query monitoring |
| Portal listing sync conflicts | MEDIUM | MEDIUM | Portal is source of truth for external ID; conflict resolution: local wins for content, portal wins for status |
| Turkish locale edge cases in sorting/search | LOW | HIGH | Use PostgreSQL Turkish collation; test I/i (dotted/dotless) specifically |

---

## Appendix A: Key Technology Decisions (ADRs)

### ADR-001: Monorepo with Workspaces
**Decision:** Single repository with npm/pnpm workspaces for backend, frontend, and shared code.
**Rationale:** Shared types ensure type safety across the stack. Single PR can include coordinated backend + frontend changes. Simpler for a team of agents.

### ADR-002: Express.js over NestJS
**Decision:** Express.js with manual structure over NestJS.
**Rationale:** Lower complexity, more flexible for agents to work with, smaller bundle. The module structure we defined provides sufficient organization.

### ADR-003: App Router over Pages Router
**Decision:** Next.js 14 App Router.
**Rationale:** Server components for better performance, nested layouts for the dashboard shell, built-in loading/error states.

### ADR-004: Prisma over TypeORM/Knex
**Decision:** Prisma ORM.
**Rationale:** Best TypeScript integration, auto-generated types, declarative schema, excellent migration tooling. Minor trade-off: less flexible for complex raw queries (mitigated by `$queryRaw` for reports).

### ADR-005: Zustand + TanStack Query over Redux
**Decision:** Zustand for client state, TanStack Query for server state.
**Rationale:** Minimal boilerplate, clear separation of concerns. TanStack Query handles caching, refetching, and optimistic updates out of the box.

### ADR-006: shadcn/ui over MUI/Ant Design
**Decision:** shadcn/ui (copy-paste component library on top of Radix UI).
**Rationale:** Full control over components, Tailwind-native, no heavy dependency. Components are project-owned and customizable.

### ADR-007: Vitest over Jest
**Decision:** Vitest for all unit and integration tests.
**Rationale:** Native ESM support, faster execution, compatible with Vite ecosystem, Jest-compatible API for easy migration of knowledge.

### ADR-008: Local File Storage (Phase 1)
**Decision:** Store uploads on local filesystem initially.
**Rationale:** Simplest for local development. Migrate to S3/Cloudflare R2 when deploying to production. Abstract behind a `StorageService` interface.

---

## Appendix B: Turkish Real Estate Glossary

| Turkish | English | Context |
|---------|---------|---------|
| Emlak | Real Estate | General term |
| Gayrimenkul | Immovable Property | Formal/legal term |
| Tapu | Title Deed | Property ownership document |
| Iskan | Habitation Certificate | Required for legal occupancy |
| DASK | Earthquake Insurance | Mandatory by law |
| Imar | Zoning | Land use designation |
| Kat Mulkiyeti | Floor Ownership | Full ownership type |
| Kat Irtifaki | Floor Easement | Pre-completion ownership |
| Aidat | Monthly Dues | Building maintenance fee |
| Komisyon | Commission | Agent fee |
| Tapu Harci | Title Deed Fee | Government transfer tax |
| Kapora | Deposit/Earnest Money | Good faith payment |
| Daire | Apartment/Flat | Most common property type |
| Arsa | Land/Plot | Building land |
| Brut m2 | Gross sqm | Including walls |
| Net m2 | Net sqm | Usable space |
| Cephe | Facing Direction | North, south, etc. |
| Bulundugu Kat | Floor Number | Which floor the unit is on |
| Bina Yasi | Building Age | Years since construction |
| Esyali | Furnished | Has furniture |
| Krediye Uygun | Mortgage Eligible | Bank will finance |
| Takas | Exchange/Trade | Property swap |
| Devren | Business Transfer | Transfer of commercial lease |
| Il | Province | 81 provinces in Turkey |
| Ilce | District | Sub-province |
| Mahalle | Neighborhood | Smallest administrative unit |
| Ada | Block | Cadastral block |
| Parsel | Parcel | Cadastral parcel |
| Danismani | Consultant/Agent | Real estate agent |

---

*End of Architecture Document*
