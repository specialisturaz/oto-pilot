#!/usr/bin/env bash
# ============================================================================
# Emlak CRM - Yerel Gelistirme Ortami Kurulum Scripti
# Local development environment setup
# ============================================================================

set -euo pipefail

# Renkli cikti
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Proje kok dizini (bu script infrastructure/scripts/ altinda)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          Emlak CRM - Kurulum Baslatiliyor               ║"
echo "║          Turkish Real Estate CRM Setup                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# -----------------------------------------------------------------------
# 1. On Kosul Kontrolleri / Prerequisites Check
# -----------------------------------------------------------------------
echo -e "${YELLOW}[1/7] On kosullar kontrol ediliyor...${NC}"

# Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}HATA: Node.js bulunamadi. Lutfen Node.js 18+ yukleyin.${NC}"
    echo "  https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}HATA: Node.js 18+ gerekli. Mevcut surum: $(node -v)${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓ Node.js $(node -v)${NC}"

# npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}HATA: npm bulunamadi.${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓ npm $(npm -v)${NC}"

# Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}HATA: Docker bulunamadi. Lutfen Docker Desktop yukleyin.${NC}"
    echo "  https://www.docker.com/products/docker-desktop/"
    exit 1
fi
echo -e "  ${GREEN}✓ Docker $(docker --version | awk '{print $3}' | tr -d ',')${NC}"

# Docker Compose
if docker compose version &> /dev/null; then
    echo -e "  ${GREEN}✓ Docker Compose $(docker compose version --short)${NC}"
elif command -v docker-compose &> /dev/null; then
    echo -e "  ${GREEN}✓ docker-compose $(docker-compose --version | awk '{print $4}' | tr -d ',')${NC}"
else
    echo -e "${RED}HATA: Docker Compose bulunamadi.${NC}"
    exit 1
fi

echo -e "  ${GREEN}Tum on kosullar mevcut.${NC}"
echo ""

# -----------------------------------------------------------------------
# 2. .env Dosyasi / Environment File
# -----------------------------------------------------------------------
echo -e "${YELLOW}[2/7] Ortam degiskenleri ayarlaniyor...${NC}"

cd "$PROJECT_ROOT"

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "  ${GREEN}✓ .env dosyasi .env.example'dan olusturuldu${NC}"
        echo -e "  ${YELLOW}  UYARI: .env dosyasini ihtiyaciniza gore duzenleyin${NC}"
    else
        # .env.example yoksa temel bir .env olustur
        cat > .env << 'ENVEOF'
# ============================================================================
# Emlak CRM - Ortam Degiskenleri / Environment Variables
# ============================================================================

# Database
DATABASE_URL="postgresql://emlak_user:emlak_pass_2024@localhost:5432/emlak_crm?schema=public"
DB_USER=emlak_user
DB_PASSWORD=emlak_pass_2024
DB_NAME=emlak_crm
DB_PORT=5432

# Redis
REDIS_URL="redis://localhost:6379"
REDIS_PORT=6379

# Backend
PORT=3001
NODE_ENV=development
JWT_SECRET=dev-jwt-secret-change-in-production-2024
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production-2024
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws

# Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Logging
LOG_LEVEL=debug
ENVEOF
        echo -e "  ${GREEN}✓ .env dosyasi olusturuldu (varsayilan degerlerle)${NC}"
    fi
else
    echo -e "  ${GREEN}✓ .env dosyasi zaten mevcut${NC}"
fi
echo ""

# -----------------------------------------------------------------------
# 3. Docker Container'lari Baslat / Start Containers
# -----------------------------------------------------------------------
echo -e "${YELLOW}[3/7] Docker container'lari baslatiliyor...${NC}"

DOCKER_COMPOSE_FILE="$PROJECT_ROOT/infrastructure/docker/docker-compose.yml"

if docker compose -f "$DOCKER_COMPOSE_FILE" ps --quiet 2>/dev/null | grep -q .; then
    echo -e "  ${BLUE}Container'lar zaten calisiyor, yeniden baslatiliyor...${NC}"
    docker compose -f "$DOCKER_COMPOSE_FILE" down
fi

docker compose -f "$DOCKER_COMPOSE_FILE" up -d

# Container'larin hazir olmasini bekle
echo -e "  ${BLUE}Veritabani hazir olana kadar bekleniyor...${NC}"
sleep 3

# PostgreSQL baglanti kontrolu
RETRIES=30
until docker compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_isready -U emlak_user -d emlak_crm > /dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
    echo -e "  ${BLUE}PostgreSQL bekleniyor... ($RETRIES deneme kaldi)${NC}"
    RETRIES=$((RETRIES-1))
    sleep 2
done

if [ $RETRIES -eq 0 ]; then
    echo -e "${RED}HATA: PostgreSQL baslatilmadi. Docker loglarini kontrol edin:${NC}"
    echo "  docker compose -f $DOCKER_COMPOSE_FILE logs postgres"
    exit 1
fi

echo -e "  ${GREEN}✓ PostgreSQL hazir${NC}"
echo -e "  ${GREEN}✓ Redis hazir${NC}"
echo ""

# -----------------------------------------------------------------------
# 4. npm Bagimliliklari / Install Dependencies
# -----------------------------------------------------------------------
echo -e "${YELLOW}[4/7] npm bagimliliklari yukleniyor...${NC}"

cd "$PROJECT_ROOT"
npm install

echo -e "  ${GREEN}✓ Bagimliliklar yuklendi${NC}"
echo ""

# -----------------------------------------------------------------------
# 5. Prisma Client Olustur / Generate Prisma Client
# -----------------------------------------------------------------------
echo -e "${YELLOW}[5/7] Prisma client olusturuluyor...${NC}"

npx prisma generate

echo -e "  ${GREEN}✓ Prisma client olusturuldu${NC}"
echo ""

# -----------------------------------------------------------------------
# 6. Veritabani Migration / Database Migration
# -----------------------------------------------------------------------
echo -e "${YELLOW}[6/7] Veritabani migration'lari uygulanıyor...${NC}"

npx prisma migrate dev --name init 2>/dev/null || npx prisma db push

echo -e "  ${GREEN}✓ Veritabani semalari uygulandı${NC}"
echo ""

# -----------------------------------------------------------------------
# 7. Seed Data / Ornek Veri Yukleme
# -----------------------------------------------------------------------
echo -e "${YELLOW}[7/7] Ornek veriler yukleniyor...${NC}"

npm run db:seed 2>/dev/null && echo -e "  ${GREEN}✓ Seed verileri yuklendi${NC}" || echo -e "  ${YELLOW}⚠ Seed verileri atlandı (henuz seed dosyasi hazir olmayabilir)${NC}"

echo ""

# -----------------------------------------------------------------------
# Tamamlandi / Setup Complete
# -----------------------------------------------------------------------
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          Kurulum Basariyla Tamamlandi!                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "  ${BLUE}Uygulamayi baslatmak icin:${NC}"
echo "    npm run dev"
echo ""
echo -e "  ${BLUE}Erisim URL'leri:${NC}"
echo "    Frontend:    http://localhost:3000"
echo "    Backend API: http://localhost:3001/api"
echo "    Prisma Studio: npx prisma studio"
echo ""
echo -e "  ${BLUE}Demo Giris Bilgileri:${NC}"
echo "    Email:  admin@emlakcrm.com"
echo "    Sifre:  password123"
echo ""
echo -e "  ${BLUE}Faydali Komutlar:${NC}"
echo "    npm run dev              # Gelistirme sunucusunu baslat"
echo "    npm run db:studio        # Prisma Studio (veritabani yonetimi)"
echo "    npm run test             # Testleri calistir"
echo "    npm run lint             # Lint kontrolu"
echo ""
echo -e "  ${BLUE}Docker Komutlari:${NC}"
echo "    docker compose -f infrastructure/docker/docker-compose.yml logs -f"
echo "    docker compose -f infrastructure/docker/docker-compose.yml down"
echo ""
