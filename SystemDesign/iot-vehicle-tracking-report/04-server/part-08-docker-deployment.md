# KẾ HOẠCH DOCKER & TỔ CHỨC FOLDER PROJECT

## MỤC LỤC

1. [Cấu Trúc Folder Project](#cấu-trúc-folder-project)
2. [Dockerfile Backend (NestJS)](#dockerfile-backend-nestjs)
3. [Dockerfile Frontend (Next.js)](#dockerfile-frontend-nextjs)
4. [Docker Compose Configuration](#docker-compose-configuration)
5. [Environment Variables (.env)](#environment-variables-env)
6. [Health Checks](#health-checks)
7. [Networks & Volumes](#networks--volumes)
8. [Deployment Workflow](#deployment-workflow)

---

## CẤU TRÚC FOLDER PROJECT

### Root Structure

**Lưu ý:** Toàn bộ project code sẽ được tạo trong folder `iot-vehicle-tracking-system/` riêng biệt, không trộn lẫn với SystemDesign.

```
IoT_Vehicle_Tracking_System/                    # Root của toàn bộ project
├── SystemDesign/                                # System Design Documents (hiện tại)
│   └── iot-vehicle-tracking-report/
│
└── iot-vehicle-tracking-system/                 # ⭐ PROJECT CODE FOLDER (mới tạo)
    ├── backend/                                 # Backend API Server (NestJS)
    │   ├── src/
    │   ├── test/
    │   ├── Dockerfile
    │   ├── .dockerignore
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── nest-cli.json
    │
    ├── frontend/                                 # Frontend Web App (Next.js)
    │   ├── src/
    │   ├── public/
    │   ├── Dockerfile
    │   ├── .dockerignore
    │   ├── package.json
    │   ├── next.config.ts
    │   └── tailwind.config.ts
    │
    ├── docker/                                   # Docker configuration files
    │   ├── nginx/
    │   │   └── nginx.conf                        # Nginx config (if not using NPM)
    │   ├── postgres/
    │   │   └── init.sql                          # PostgreSQL init scripts
    │   └── influxdb/
    │       └── init.sh                           # InfluxDB init scripts
    │
    ├── data/                                     # Persistent data (mounted volumes)
    │   ├── postgres/                             # PostgreSQL data
    │   ├── influxdb/                             # InfluxDB data
    │   ├── emqx/                                 # EMQX data
    │   └── logs/                                 # Application logs
    │       ├── backend/
    │       └── frontend/
    │
    ├── docker-compose.yml                        # Main docker-compose file
    ├── docker-compose.prod.yml                  # Production override
    ├── docker-compose.dev.yml                   # Development override
    ├── .env                                      # Environment variables (gitignored)
    ├── .env.example                              # Environment variables template
    ├── .gitignore
    └── README.md
```

### Backend Structure (NestJS)

```
backend/
├── src/
│   ├── main.ts                   # Entry point
│   ├── app.module.ts             # Root module
│   ├── app.controller.ts         # Health check endpoint
│   │
│   ├── auth/                     # Authentication module
│   ├── vehicles/                 # Vehicle management
│   ├── customers/                # Customer management
│   ├── trips/                    # Trip management
│   ├── telemetry/                # Telemetry data (InfluxDB)
│   ├── alerts/                   # Alert management
│   ├── violations/               # Violation management
│   ├── devices/                  # Device management
│   ├── geofences/                # Geofence management
│   ├── maintenance/              # Maintenance management
│   ├── notifications/            # Notifications (Telegram + Email)
│   ├── mqtt/                     # MQTT integration
│   ├── database/                 # Database config
│   │   ├── postgres.module.ts
│   │   └── influxdb.module.ts
│   └── common/                   # Shared utilities
│       ├── filters/
│       ├── interceptors/
│       └── decorators/
│
├── test/                         # Unit & E2E tests
├── logs/                         # Application logs (mounted volume)
│
├── Dockerfile
├── .dockerignore
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

### Frontend Structure (Next.js)

```
frontend/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── login/
│   │   └── dashboard/
│   │
│   ├── components/               # Reusable components
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── layout/
│   │   ├── forms/
│   │   └── map/
│   │
│   ├── features/                 # Feature modules
│   │   ├── vehicles/
│   │   ├── customers/
│   │   └── trips/
│   │
│   ├── lib/                      # Utilities
│   │   ├── api/
│   │   ├── store/
│   │   └── utils/
│   │
│   └── types/                    # TypeScript types
│
├── public/                       # Static assets
├── Dockerfile
├── .dockerignore
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── README.md
```

---

## DOCKERFILE BACKEND (NESTJS)

### `backend/Dockerfile`

```dockerfile
# ================================
# Stage 1: Dependencies
# ================================
FROM node:18-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# ================================
# Stage 2: Build
# ================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY tsconfig.json nest-cli.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

# ================================
# Stage 3: Production
# ================================
FROM node:18-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy dependencies from deps stage
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Create logs directory
RUN mkdir -p /app/logs && \
    chown -R nestjs:nodejs /app/logs

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=2 \
  CMD node -e "require('http').get('http://localhost:3000/health', {timeout: 2000}, (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

# Start application
CMD ["node", "dist/main.js"]
```

### `backend/.dockerignore`

```
node_modules
npm-debug.log
dist
.env
.env.local
.env.*.local
logs
*.log
.git
.gitignore
README.md
.vscode
.idea
coverage
.nyc_output
test
*.test.ts
*.spec.ts
```

---

## DOCKERFILE FRONTEND (NEXT.JS)

### `frontend/Dockerfile`

```dockerfile
# ================================
# Stage 1: Dependencies
# ================================
FROM node:18-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# ================================
# Stage 2: Build
# ================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set build-time environment variables
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

# Build application
RUN npm run build

# ================================
# Stage 3: Production
# ================================
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=20s --timeout=3s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

# Start application
CMD ["node", "server.js"]
```

**Lưu ý:** Cần cấu hình `next.config.ts` để enable standalone output:

```typescript
// next.config.ts
const nextConfig = {
  output: "standalone",
  // ... other config
};
```

### `frontend/.dockerignore`

```
node_modules
.next
npm-debug.log
.env
.env.local
.env.*.local
.git
.gitignore
README.md
.vscode
.idea
coverage
.nyc_output
public
```

---

## DOCKER COMPOSE CONFIGURATION

### `docker-compose.yml`

```yaml
name: iot_vehicle_tracking_stack

services:
  # ================================
  # Nginx Proxy Manager (Reverse Proxy)
  # ================================
  nginx-proxy-manager:
    image: "jc21/nginx-proxy-manager:${NGINX_PROXY_VERSION:-latest}"
    container_name: iot_vehicle_nginx_proxy
    restart: unless-stopped
    ports:
      - "${NGINX_HTTP_PORT:-80}:${NGINX_HTTP_CONTAINER_PORT:-80}"
      - "${NGINX_ADMIN_PORT:-81}:${NGINX_ADMIN_CONTAINER_PORT:-81}"
      - "${NGINX_HTTPS_PORT:-443}:${NGINX_HTTPS_CONTAINER_PORT:-443}"
    volumes:
      - ./data/nginx-proxy-manager:/data
      - ./data/letsencrypt:/etc/letsencrypt
    networks:
      - iot_vehicle_network

  # ================================
  # Backend API Server (NestJS)
  # ================================
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    image: ${DOCKER_REGISTRY:-iot-vehicle}/backend:${BACKEND_VERSION:-latest}
    container_name: iot_vehicle_backend
    restart: always
    ports:
      - "${BACKEND_PORT:-3000}:${BACKEND_CONTAINER_PORT:-3000}"
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      PORT: ${BACKEND_CONTAINER_PORT:-3000}
      HOST: 0.0.0.0
      TZ: ${TZ:-Asia/Ho_Chi_Minh}

      # API Configuration
      API_BASE_URL: ${API_BASE_URL:-https://api.example.com/api/v1}

      # Database - PostgreSQL
      DB_HOST: ${DB_HOST:-postgres}
      DB_PORT: ${POSTGRES_CONTAINER_PORT:-5432}
      DB_NAME: ${DB_NAME:-vehicle_tracking}
      DB_USER: ${DB_USER:-postgres}
      DB_PASSWORD: ${DB_PASSWORD}

      # Database - InfluxDB
      INFLUXDB_URL: ${INFLUXDB_URL:-http://influxdb:8086}
      INFLUXDB_TOKEN: ${INFLUXDB_TOKEN}
      INFLUXDB_ORG: ${INFLUXDB_ORG:-vehicle_tracking}
      INFLUXDB_BUCKET: ${INFLUXDB_BUCKET:-telemetry}

      # MQTT - EMQX
      MQTT_BROKER_URL: ${MQTT_BROKER_URL:-mqtt://emqx:1883}
      MQTT_USERNAME: ${MQTT_USERNAME:-}
      MQTT_PASSWORD: ${MQTT_PASSWORD:-}

      # JWT
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN:-7d}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      JWT_REFRESH_EXPIRES_IN: ${JWT_REFRESH_EXPIRES_IN:-30d}

      # CORS
      CORS_ORIGIN: ${CORS_ORIGIN:-*}

      # Logging
      LOG_LEVEL: ${LOG_LEVEL:-info}

      # Notifications
      TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN:-}
      EMAIL_HOST: ${EMAIL_HOST:-}
      EMAIL_PORT: ${EMAIL_PORT:-587}
      EMAIL_USER: ${EMAIL_USER:-}
      EMAIL_PASSWORD: ${EMAIL_PASSWORD:-}
      EMAIL_FROM: ${EMAIL_FROM:-}
    volumes:
      - ./backend/logs:/app/logs
    depends_on:
      postgres:
        condition: service_healthy
      influxdb:
        condition: service_healthy
      emqx:
        condition: service_started
    networks:
      - iot_vehicle_network
    healthcheck:
      test:
        [
          "CMD-SHELL",
          'node -e "require(''http'').get(''http://localhost:'' + (process.env.PORT || ''3000'') + ''/health'', {timeout: 2000}, (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on(''error'', () => process.exit(1))"',
        ]
      interval: ${BACKEND_HEALTHCHECK_INTERVAL:-15s}
      timeout: ${BACKEND_HEALTHCHECK_TIMEOUT:-5s}
      retries: ${BACKEND_HEALTHCHECK_RETRIES:-2}
      start_period: ${BACKEND_HEALTHCHECK_START_PERIOD:-40s}

  # ================================
  # Frontend Web App (Next.js)
  # ================================
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_BASE_URL: ${API_BASE_URL:-https://api.example.com/api/v1}
        NEXT_PUBLIC_WS_URL: ${WS_URL:-https://api.example.com}
    image: ${DOCKER_REGISTRY:-iot-vehicle}/frontend:${FRONTEND_VERSION:-latest}
    container_name: iot_vehicle_frontend
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-3001}:${FRONTEND_CONTAINER_PORT:-3000}"
    environment:
      PORT: ${FRONTEND_CONTAINER_PORT:-3000}
      NEXT_PUBLIC_API_BASE_URL: ${API_BASE_URL:-https://api.example.com/api/v1}
      NEXT_PUBLIC_WS_URL: ${WS_URL:-https://api.example.com}
      TZ: ${TZ:-Asia/Ho_Chi_Minh}
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - iot_vehicle_network
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "wget --quiet --tries=1 --spider http://localhost:${PORT:-3000} || exit 1",
        ]
      interval: ${FRONTEND_HEALTHCHECK_INTERVAL:-20s}
      timeout: ${FRONTEND_HEALTHCHECK_TIMEOUT:-3s}
      retries: ${FRONTEND_HEALTHCHECK_RETRIES:-3}
      start_period: ${FRONTEND_HEALTHCHECK_START_PERIOD:-20s}

  # ================================
  # PostgreSQL Database
  # ================================
  postgres:
    image: postgres:${POSTGRES_VERSION:-16-alpine}
    container_name: iot_vehicle_postgres
    restart: unless-stopped
    ports:
      - "${POSTGRES_PORT:-5432}:${POSTGRES_CONTAINER_PORT:-5432}"
    environment:
      POSTGRES_DB: ${DB_NAME:-vehicle_tracking}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      TZ: ${TZ:-Asia/Ho_Chi_Minh}
    command: >
      --max_connections=${POSTGRES_MAX_CONNECTIONS:-200}
      --shared_buffers=${POSTGRES_SHARED_BUFFERS:-256MB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - iot_vehicle_network
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "pg_isready -U ${DB_USER:-postgres} -d ${DB_NAME:-vehicle_tracking}",
        ]
      interval: ${POSTGRES_HEALTHCHECK_INTERVAL:-10s}
      timeout: ${POSTGRES_HEALTHCHECK_TIMEOUT:-5s}
      retries: ${POSTGRES_HEALTHCHECK_RETRIES:-5}
      start_period: ${POSTGRES_HEALTHCHECK_START_PERIOD:-30s}

  # ================================
  # InfluxDB (Time-series Database)
  # ================================
  influxdb:
    image: influxdb:${INFLUXDB_VERSION:-2.7-alpine}
    container_name: iot_vehicle_influxdb
    restart: unless-stopped
    ports:
      - "${INFLUXDB_PORT:-8086}:${INFLUXDB_CONTAINER_PORT:-8086}"
    environment:
      DOCKER_INFLUXDB_INIT_MODE: setup
      DOCKER_INFLUXDB_INIT_USERNAME: ${INFLUXDB_ADMIN_USER:-admin}
      DOCKER_INFLUXDB_INIT_PASSWORD: ${INFLUXDB_ADMIN_PASSWORD}
      DOCKER_INFLUXDB_INIT_ORG: ${INFLUXDB_ORG:-vehicle_tracking}
      DOCKER_INFLUXDB_INIT_BUCKET: ${INFLUXDB_BUCKET:-telemetry}
      DOCKER_INFLUXDB_INIT_ADMIN_TOKEN: ${INFLUXDB_TOKEN}
      TZ: ${TZ:-Asia/Ho_Chi_Minh}
    volumes:
      - influxdb_data:/var/lib/influxdb2
      - influxdb_config:/etc/influxdb2
      - ./docker/influxdb/init.sh:/docker-entrypoint-initdb.d/init.sh:ro
    networks:
      - iot_vehicle_network
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "wget --quiet --tries=1 --spider http://localhost:8086/health || exit 1",
        ]
      interval: ${INFLUXDB_HEALTHCHECK_INTERVAL:-10s}
      timeout: ${INFLUXDB_HEALTHCHECK_TIMEOUT:-5s}
      retries: ${INFLUXDB_HEALTHCHECK_RETRIES:-5}
      start_period: ${INFLUXDB_HEALTHCHECK_START_PERIOD:-30s}

  # ================================
  # EMQX (MQTT Broker)
  # ================================
  emqx:
    image: emqx/emqx:${EMQX_VERSION:-5.3.0}
    container_name: iot_vehicle_emqx
    restart: unless-stopped
    ports:
      - "${EMQX_MQTT_PORT:-1883}:${EMQX_MQTT_CONTAINER_PORT:-1883}"
      - "${EMQX_WS_PORT:-8083}:${EMQX_WS_CONTAINER_PORT:-8083}"
      - "${EMQX_WSS_PORT:-8084}:${EMQX_WSS_CONTAINER_PORT:-8084}"
      - "${EMQX_DASHBOARD_PORT:-18083}:${EMQX_DASHBOARD_CONTAINER_PORT:-18083}"
    environment:
      EMQX_NAME: emqx
      EMQX_HOST: ${EMQX_HOST:-emqx}
      EMQX_CLUSTER__DISCOVERY_STRATEGY: static
      EMQX_CLUSTER__STATIC__SEEDS: emqx@${EMQX_HOST:-emqx}
      TZ: ${TZ:-Asia/Ho_Chi_Minh}
    volumes:
      - emqx_data:/opt/emqx/data
      - emqx_log:/opt/emqx/log
    networks:
      - iot_vehicle_network
    healthcheck:
      test: ["CMD-SHELL", "emqx ping | grep -q pong || exit 1"]
      interval: ${EMQX_HEALTHCHECK_INTERVAL:-10s}
      timeout: ${EMQX_HEALTHCHECK_TIMEOUT:-5s}
      retries: ${EMQX_HEALTHCHECK_RETRIES:-5}
      start_period: ${EMQX_HEALTHCHECK_START_PERIOD:-30s}

# ================================
# Networks
# ================================
networks:
  iot_vehicle_network:
    driver: bridge
    name: iot_vehicle_network

# ================================
# Volumes
# ================================
volumes:
  postgres_data:
    driver: local
    name: iot_vehicle_postgres_data
  influxdb_data:
    driver: local
    name: iot_vehicle_influxdb_data
  influxdb_config:
    driver: local
    name: iot_vehicle_influxdb_config
  emqx_data:
    driver: local
    name: iot_vehicle_emqx_data
  emqx_log:
    driver: local
    name: iot_vehicle_emqx_log
```

---

## ENVIRONMENT VARIABLES (.ENV)

### `.env.example`

```bash
# ================================
# General Configuration
# ================================
NODE_ENV=production
TZ=Asia/Ho_Chi_Minh

# ================================
# Docker Registry
# ================================
DOCKER_REGISTRY=iot-vehicle

# ================================
# Nginx Proxy Manager
# ================================
NGINX_PROXY_VERSION=latest
NGINX_HTTP_PORT=80
NGINX_HTTP_CONTAINER_PORT=80
NGINX_ADMIN_PORT=81
NGINX_ADMIN_CONTAINER_PORT=81
NGINX_HTTPS_PORT=443
NGINX_HTTPS_CONTAINER_PORT=443

# ================================
# Backend API Server
# ================================
BACKEND_VERSION=latest
BACKEND_PORT=3000
BACKEND_CONTAINER_PORT=3000
API_BASE_URL=https://api.example.com/api/v1
WS_URL=https://api.example.com

# Database - PostgreSQL
DB_HOST=postgres
DB_PORT=5432
POSTGRES_CONTAINER_PORT=5432
POSTGRES_VERSION=16-alpine
DB_NAME=vehicle_tracking
DB_USER=postgres
DB_PASSWORD=your_secure_password_here
POSTGRES_MAX_CONNECTIONS=200
POSTGRES_SHARED_BUFFERS=256MB

# Database - InfluxDB
INFLUXDB_VERSION=2.7-alpine
INFLUXDB_PORT=8086
INFLUXDB_CONTAINER_PORT=8086
INFLUXDB_URL=http://influxdb:8086
INFLUXDB_ADMIN_USER=admin
INFLUXDB_ADMIN_PASSWORD=your_secure_password_here
INFLUXDB_TOKEN=your_influxdb_token_here
INFLUXDB_ORG=vehicle_tracking
INFLUXDB_BUCKET=telemetry

# MQTT - EMQX
EMQX_VERSION=5.3.0
EMQX_HOST=emqx
EMQX_MQTT_PORT=1883
EMQX_MQTT_CONTAINER_PORT=1883
EMQX_WS_PORT=8083
EMQX_WS_CONTAINER_PORT=8083
EMQX_WSS_PORT=8084
EMQX_WSS_CONTAINER_PORT=8084
EMQX_DASHBOARD_PORT=18083
EMQX_DASHBOARD_CONTAINER_PORT=18083
MQTT_BROKER_URL=mqtt://emqx:1883
MQTT_USERNAME=
MQTT_PASSWORD=

# JWT Authentication
JWT_SECRET=your_jwt_secret_key_here_min_32_chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here_min_32_chars
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info

# Notifications - Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Notifications - Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_app_password
EMAIL_FROM=noreply@example.com

# ================================
# Frontend Web App
# ================================
FRONTEND_VERSION=latest
FRONTEND_PORT=3001
FRONTEND_CONTAINER_PORT=3000

# ================================
# Health Check Intervals
# ================================
BACKEND_HEALTHCHECK_INTERVAL=15s
BACKEND_HEALTHCHECK_TIMEOUT=5s
BACKEND_HEALTHCHECK_RETRIES=2
BACKEND_HEALTHCHECK_START_PERIOD=40s

FRONTEND_HEALTHCHECK_INTERVAL=20s
FRONTEND_HEALTHCHECK_TIMEOUT=3s
FRONTEND_HEALTHCHECK_RETRIES=3
FRONTEND_HEALTHCHECK_START_PERIOD=20s

POSTGRES_HEALTHCHECK_INTERVAL=10s
POSTGRES_HEALTHCHECK_TIMEOUT=5s
POSTGRES_HEALTHCHECK_RETRIES=5
POSTGRES_HEALTHCHECK_START_PERIOD=30s

INFLUXDB_HEALTHCHECK_INTERVAL=10s
INFLUXDB_HEALTHCHECK_TIMEOUT=5s
INFLUXDB_HEALTHCHECK_RETRIES=5
INFLUXDB_HEALTHCHECK_START_PERIOD=30s

EMQX_HEALTHCHECK_INTERVAL=10s
EMQX_HEALTHCHECK_TIMEOUT=5s
EMQX_HEALTHCHECK_RETRIES=5
EMQX_HEALTHCHECK_START_PERIOD=30s
```

### `.env` (Production - Gitignored)

```bash
# Copy từ .env.example và thay đổi các giá trị sensitive
# KHÔNG commit file này vào git!
```

---

## HEALTH CHECKS

### Backend Health Check Endpoint

```typescript
// backend/src/app.controller.ts
import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("health")
@Controller()
export class AppController {
  @Get("health")
  @ApiOperation({ summary: "Health check endpoint" })
  health() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
```

### Frontend Health Check

Next.js tự động có health check endpoint tại root `/`. Nếu cần custom:

```typescript
// frontend/src/app/health/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
```

---

## NETWORKS & VOLUMES

### Networks

- **iot_vehicle_network**: Bridge network cho tất cả services
- Tất cả services giao tiếp qua network này
- Không expose ports ra ngoài trừ khi cần thiết

### Volumes

**Named Volumes (Persistent):**

- `postgres_data`: PostgreSQL database files
- `influxdb_data`: InfluxDB data files
- `influxdb_config`: InfluxDB configuration
- `emqx_data`: EMQX data files
- `emqx_log`: EMQX log files

**Bind Mounts:**

- `./backend/logs:/app/logs`: Backend application logs
- `./data/nginx-proxy-manager:/data`: Nginx Proxy Manager data
- `./data/letsencrypt:/etc/letsencrypt`: SSL certificates
- `./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql`: PostgreSQL init script
- `./docker/influxdb/init.sh:/docker-entrypoint-initdb.d/init.sh`: InfluxDB init script

---

## DEPLOYMENT WORKFLOW

### 1. Initial Setup

```bash
# Di chuyển vào folder project code
cd iot-vehicle-tracking-system

# Copy environment file
cp .env.example .env

# Edit .env với các giá trị thực tế
nano .env
# Hoặc trên Windows: notepad .env

# Generate InfluxDB token (nếu chưa có)
# Hoặc để InfluxDB tự generate và lấy từ logs
```

### 2. Build & Start Services

```bash
# Build và start tất cả services
docker-compose up -d --build

# Xem logs
docker-compose logs -f

# Xem logs của một service cụ thể
docker-compose logs -f backend
```

### 3. Development Mode

```bash
# Sử dụng docker-compose.dev.yml
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Hoặc override specific services
docker-compose up -d postgres influxdb emqx
# Run backend và frontend locally với hot reload
```

### 4. Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale services (nếu cần)
docker-compose up -d --scale backend=3
```

### 5. Maintenance Commands

```bash
# Stop all services
docker-compose down

# Stop và xóa volumes (⚠️ Mất dữ liệu!)
docker-compose down -v

# Restart một service
docker-compose restart backend

# View service status
docker-compose ps

# Execute command trong container
docker-compose exec backend sh
docker-compose exec postgres psql -U postgres -d vehicle_tracking
```

### 6. Backup & Restore

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U postgres vehicle_tracking > backup.sql

# Restore PostgreSQL
docker-compose exec -T postgres psql -U postgres vehicle_tracking < backup.sql

# Backup InfluxDB
docker-compose exec influxdb influx backup /backup

# Backup volumes
docker run --rm -v iot_vehicle_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

---

## LƯU Ý QUAN TRỌNG

1. **Security:**

   - Không commit `.env` vào git
   - Sử dụng strong passwords cho databases
   - Rotate JWT secrets định kỳ
   - Enable SSL/TLS trong production

2. **Performance:**

   - Tune PostgreSQL và InfluxDB parameters
   - Monitor resource usage
   - Scale services khi cần

3. **Monitoring:**

   - Setup logging aggregation (ELK, Loki, etc.)
   - Monitor health checks
   - Alert on service failures

4. **Backup:**
   - Regular database backups
   - Backup volumes
   - Test restore procedures

---

## TÓM TẮT

**Cấu trúc:**

- ✅ Multi-stage Dockerfiles cho backend và frontend
- ✅ Docker Compose với tất cả services
- ✅ Health checks cho tất cả services
- ✅ Environment variables được tổ chức rõ ràng
- ✅ Persistent volumes cho data
- ✅ Network isolation

**Best Practices:**

- ✅ Non-root users trong containers
- ✅ Health checks với retries và start periods
- ✅ Dependency management với `depends_on` và `condition`
- ✅ Logging và monitoring ready
- ✅ Backup và restore procedures
