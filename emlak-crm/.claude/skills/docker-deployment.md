---
name: docker-deployment
description: Use when working with Docker, docker-compose, CI/CD pipelines, deployment scripts, nginx configuration, or production infrastructure for the Emlak CRM project
---

# Docker and Deployment Patterns for Emlak CRM

## Overview
Reference guide for containerization, orchestration, and deployment of the Emlak CRM stack: Express backend, Next.js frontend, PostgreSQL, Redis, and Nginx reverse proxy.

## Docker Compose (Development)

```yaml
# infrastructure/docker/docker-compose.yml
version: "3.8"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: emlak_crm
      POSTGRES_USER: emlak
      POSTGRES_PASSWORD: ""
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U emlak -d emlak_crm"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ""
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Dockerfile (Backend)

```dockerfile
# Multi-stage build for Express backend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
COPY prisma ./prisma/
COPY src/backend ./src/backend/
COPY src/shared ./src/shared/
RUN npm ci --production=false
RUN npx prisma generate
RUN npx tsc -p tsconfig.backend.json

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S emlak -u 1001
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/node_modules ./node_modules/
COPY --from=builder /app/prisma ./prisma/
USER emlak
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

## Dockerfile (Frontend)

```dockerfile
# Multi-stage build for Next.js frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY src/frontend ./src/frontend/
COPY src/shared ./src/shared/
RUN npm ci --production=false
RUN npm run build:frontend

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S emlak -u 1001
COPY --from=builder /app/src/frontend/.next ./.next/
COPY --from=builder /app/node_modules ./node_modules/
COPY --from=builder /app/src/frontend/public ./public/
USER emlak
EXPOSE 3000
CMD ["npx", "next", "start"]
```

## Nginx Configuration

```nginx
# infrastructure/docker/nginx/default.conf
upstream backend {
    server backend:3001;
}
upstream frontend {
    server frontend:3000;
}
server {
    listen 80;
    server_name emlakcrm.local;

    # API requests -> Express
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host ;
        proxy_set_header X-Real-IP ;
        proxy_set_header X-Forwarded-For ;
        proxy_set_header X-Forwarded-Proto ;
        client_max_body_size 10M; # Property image uploads
    }

    # Everything else -> Next.js
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host ;
        proxy_set_header X-Real-IP ;
    }
}
```

## Environment Variables

Required environment variables for production:

```
# Database
DATABASE_URL=postgresql://emlak:PASSWORD@postgres:5432/emlak_crm

# Redis
REDIS_URL=redis://:PASSWORD@redis:6379

# Auth
JWT_SECRET=<strong-random-string-64-chars>
JWT_REFRESH_SECRET=<strong-random-string-64-chars>

# Portal API Keys
SAHIBINDEN_API_KEY=...
HEPSIEMLAK_API_KEY=...
EMLAKJET_API_KEY=...

# App
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://app.emlakcrm.com
```

## CI/CD Pipeline (.github/workflows/)

Key stages:
1. **Lint:** eslint + prettier check
2. **Test:** Vitest unit tests against test DB
3. **Build:** Docker image build (multi-stage)
4. **E2E:** Playwright against Docker compose stack
5. **Push:** Push images to container registry
6. **Deploy:** Deploy to staging/production

## Health Check Endpoints

- GET /api/health -- basic alive check (returns 200)
- GET /api/health/ready -- checks DB and Redis connectivity
- GET /api/health/live -- Kubernetes liveness probe

## Security Checklist for Deployment

- Docker images use non-root user (emlak:1001)
- No secrets in Docker images or build args
- Environment variables via Docker secrets or cloud provider
- HTTPS enforced via nginx or cloud load balancer
- Database not exposed to public internet
- Redis password set and not default
- Rate limiting configured in Express
- Helmet headers configured