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

---

## Otonom Calisma Protokolu

Bu proje, CLAUDE_OTONOM_AGENT-UGUR.md temel alinarak otonom agent calismasi icin asagidaki protokolleri uygular.

### Gorev Akis Protokolu

Her gorev icin asagidaki donguyu uygula:

```
ARASTIR -> PLANLA -> TASARLA -> KOD YAZ -> TEST ET -> DUZELT -> TESLIM ET
```

**Emlak CRM'e ozel asamalar:**

1. **ARASTIR** - Gorevi analiz et, etkilenen modulleri belirle (backend/frontend/shared/integrations), mevcut Prisma semasini ve ilgili API endpoint'lerini incele
2. **PLANLA** - Degisikliklerin kapsamini cikar, hangi dosyalarin etkilenecegini listele, migration gerekliligi olup olmadigini belirle
3. **TASARLA** - Component hiyerarsisini, API contract'larini, veritabani degisikliklerini planla
4. **KOD YAZ** - Feature kodunu yaz: Prisma schema -> backend API -> frontend component -> shared types siralamasiyla ilerle
5. **TEST ET** - `npm run test` (Vitest) ve `npm run test:e2e` (Playwright) calistir, Prisma Studio'da veriyi dogrula
6. **DUZELT** - Hatalari gider, lint/format kontrol et (`npm run lint && npm run format`)
7. **TESLIM ET** - Degisiklikleri ozetle, calisir durumda teslim et

**Kural:** Kullaniciya "bunu yapmak ister misiniz?" diye sorma. Gorevi al, en iyi kararlari kendin ver, yap, bitir, raporla.

### Turkce Karakter Kurallari

Emlak CRM tamamen Turkce pazara hizmet eder. Asagidaki kurallar her yerde gecerlidir:

| Kural | Uygulama |
|-------|----------|
| String lowercase | `toLocaleLowerCase('tr-TR')` kullan (`toLowerCase()` KULLANMA) |
| String uppercase | `toLocaleUpperCase('tr-TR')` kullan (`toUpperCase()` KULLANMA) |
| Encoding | UTF-8 her yerde (DB, API response, HTML meta) |
| DB Collation | `tr_TR.UTF-8` (PostgreSQL Turkish locale) |
| Tarih formati | `DD.MM.YYYY` (orn: 28.03.2026) |
| Para birimi | `₺` (TRY) - `Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })` |
| Telefon | `+90 5XX XXX XX XX` |
| Turkce karakterler | c, s, g, i, o, u, I, S, G, C, O, U - hepsini dogru isle |
| UI metinleri | Tum placeholder, label, hata mesajlari, buton metinleri Turkce |

### Guvenlik Standartlari

Emlak CRM KVKK (Kisisel Verilerin Korunmasi Kanunu) uyumlu olmalidir:

- **Auth:** JWT (access + refresh token) + RBAC (Admin, Manager, Agent rolleri) - bcryptjs ile sifreleme
- **Input Validation:** Tum endpoint'lerde Zod schema validasyonu zorunlu
- **Rate Limiting:** API endpoint'lerinde rate limit aktif
- **Security Headers:** Helmet middleware ile guvenlik header'lari (CSP, HSTS, X-Frame-Options)
- **SQL Injection:** Prisma ORM parametrized query kullanir, raw query yazilacaksa `$queryRaw` ile parametre gecir
- **XSS:** React varsayilan olarak escape eder, `dangerouslySetInnerHTML` kullanma
- **CSRF:** State-changing islemlerde CSRF token kontrolu
- **Environment:** Tum hassas veriler `.env` dosyasinda, asla hardcode degil
- **KVKK:** Musteri verileri sifrelenmeli, silme hakki desteklenmeli, veri isleme kayitlari tutulmali
- **Sifreleme:** Parolalar bcrypt, hassas veriler AES-256

### MCP Server Entegrasyonlari

Bu projede kullanilabilecek MCP server'lar:

| MCP Server | Kullanim Alani |
|------------|---------------|
| **GitHub** | Repo yonetimi, PR, issue takibi |
| **PostgreSQL** | Veritabani erisimi ve sorgulari |
| **Playwright** | E2E test ve browser otomasyonu |
| **Filesystem** | Proje dosya sistemi erisimi |
| **Context7** | Guncel library dokumantasyonu (Next.js, Prisma, Tailwind vb.) |
| **Firecrawl** | Emlak portali scraping (sahibinden, hepsiemlak) |
| **Brave Search** | Piyasa arastirmasi, rakip analizi |
| **Sentry** | Hata takibi ve monitoring |
| **Memory** | Agent hafizasi, oturum arasi bilgi saklama |
| **Sequential Thinking** | Karmasik problem cozumlemesi |

### Hata Yonetimi Protokolu

Bir hata olusugunda asagidaki protokolu uygula:

```
1. HATAYI OKU    -> Hata mesajini ve stack trace'i analiz et
2. ROOT CAUSE    -> Hatanin kok nedenini belirle (schema? API? component? config?)
3. DUZELT        -> Duzeltmeyi uygula
4. TEST ET       -> npm run test / npm run lint ile dogrula
5. TEKRAR DENE   -> Hala hata varsa alternatif cozum dene
6. MAX 3 DENEME  -> 3 denemeden sonra kullaniciya durumu raporla
```

**Onemli:** Prisma migration hatalari icin `npx prisma migrate reset` yerine once `npx prisma migrate dev` dene. Build hatalari icin once TypeScript hatalarini (`npx tsc --noEmit`), sonra lint hatalarini kontrol et.

### Cikti Standartlari

Her teslimatta asagidaki kontrol listesini dogrula:

- [ ] **Tam calisir kod** - Build hatasi yok (`npm run build` basarili)
- [ ] **Responsive tasarim** - Mobil, tablet, desktop gorunumleri calisiyor (Tailwind breakpoint'leri)
- [ ] **Turkce UI** - Tum metinler, placeholder'lar, hata mesajlari Turkce
- [ ] **Error handling** - try/catch bloklari, kullaniciya anlamli Turkce hata mesajlari
- [ ] **Loading states** - Skeleton/spinner bilesenler data yuklenirken goruluyor
- [ ] **SEO meta tags** - Next.js metadata API ile title, description, Open Graph
- [ ] **Accessibility** - Semantic HTML, aria-label, keyboard navigation, yeterli renk kontrasti
- [ ] **TypeScript strict** - `any` tipi kullanma, tum tipler tanimli
- [ ] **Prisma schema** - Yeni model/field eklendiyse migration olusturuldu
- [ ] **API validation** - Tum endpoint'lerde Zod schema var
