# 15 - Development Workflow

> Local development setup, testing strategy, build process, deployment pipeline.

---

## Mục lục

1. [Local Development Setup](#1-local-development-setup)
2. [Development Mode](#2-development-mode)
3. [Testing Strategy](#3-testing-strategy)
4. [Build Process](#4-build-process)
5. [Code Quality](#5-code-quality)
6. [Debugging](#6-debugging)
7. [Common Tasks](#7-common-tasks)

---

## 1. Local Development Setup

### Prerequisites

- Node.js 20+ (LTS)
- Docker Desktop
- Flutter SDK 3.16+ (cho Mobile)
- Git

### Infrastructure (Docker)

```bash
# 1. Create shared network
docker network create tracking-network

# 2. Start infrastructure services
docker compose -f Tracking_PostgreSQL/docker-compose.yml up -d
docker compose -f Tracking_EMQX/docker-compose.yml up -d
docker compose -f Tracking_VictoriaMetrics/docker-compose.yml up -d
docker compose -f Tracking_VictoriaLogs/docker-compose.yml up -d

# 3. Wait for services to be healthy
docker ps  # Check all "healthy"
```

### Application Services (Host)

```bash
# Backend
cd Tracking_Backend
cp .env.example .env  # Edit credentials
npm install
npm run dev           # tsx watch → hot reload on :4000

# MQTT Bridge
cd Tracking_MqttBridge
cp .env.example .env
npm install
npm run dev           # tsx watch → hot reload on :4003

# Frontend
cd Tracking_Frontend
cp .env.example .env  # Set NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev           # Next.js dev server on :4001
```

---

## 2. Development Mode

### Hot Reload

| Service | Tool | Trigger |
|---------|------|---------|
| Backend | `tsx watch` | Any `.ts` file change |
| Bridge | `tsx watch` | Any `.ts` file change |
| Frontend | Next.js Turbopack | Any file change (instant) |

### Environment Variables (Development)

```bash
# Tracking_Backend/.env
NODE_ENV=development
PORT=4000
POSTGRESQL_HOST=localhost
POSTGRESQL_PORT=5432
POSTGRESQL_PASSWORD=localdev
MQTT_HOST=localhost
MQTT_PORT=1883
CORS_ORIGIN=http://localhost:4001
```

### Database Seeding

```bash
# Seed test data
cd Tracking_PostgreSQL
node scripts/postgres-command-runner.js scripts/seed-local-audit-mock-data.sql
```

---

## 3. Testing Strategy

### Backend Tests (Vitest)

```bash
cd Tracking_Backend
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run test:cov      # Coverage report
```

**Test structure:**
```
src/
├── middleware/__tests__/
│   └── auth.middleware.test.ts
├── infrastructure/
│   └── mqtt-client-id.util.test.ts
└── domain/
    └── device/services/device.service.test.ts
```

### Bridge Tests (Node.js test runner)

```bash
cd Tracking_MqttBridge
npm run test          # tsx --test "tests/**/*.test.ts"
```

**Test files:**
```
tests/
├── closing-session-resolution.test.ts
├── device-state-cache.test.ts
├── live-mutation-guard.test.ts
├── session-identity.util.test.ts
├── session-runtime.util.test.ts
└── subscriptions.test.ts
```

### Frontend Tests (Node.js test runner)

```bash
cd Tracking_Frontend
npm run test          # tsx --test "tests/**/*.test.ts"
```

**Test files:**
```
tests/
├── alert-display-helpers.test.ts
├── base-url.test.ts
├── device-form-payload.test.ts
├── device-realtime-cache.test.ts
├── number-formatting.test.ts
├── query-invalidation.test.ts
└── ...
```

### Verify Command (All checks)

```bash
# Backend: lint + typecheck + test
npm run verify

# Frontend: lint + typecheck + test + build
npm run verify
```

---

## 4. Build Process

### TypeScript Compilation

```bash
# Backend
npm run build
# → tsc -p tsconfig.build.json && tsc-alias -p tsconfig.build.json
# Output: dist/

# Bridge
npm run build
# → tsc -p tsconfig.build.json
# Output: dist/

# Frontend
npm run build
# → next build
# Output: .next/
```

### Path Aliases

```json
// tsconfig.json (Backend)
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
// Resolved by tsc-alias after compilation
```

### Docker Build

```bash
# Build production image
docker build -t tracking-backend:latest ./Tracking_Backend
docker build -t tracking-mqtt-bridge:latest ./Tracking_MqttBridge
docker build -t tracking-frontend:latest ./Tracking_Frontend
```

---

## 5. Code Quality

### ESLint

```bash
# Backend
npm run lint  # eslint "src/**/*.ts"

# Frontend
npm run lint  # eslint (flat config)
```

### TypeScript Strict Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Type Checking

```bash
npm run typecheck  # tsc --noEmit
```

---

## 6. Debugging

### Backend Debugging

```bash
# Run with Node.js inspector
node --inspect dist/index.js
# Attach VS Code debugger to port 9229
```

### MQTT Debugging

```bash
# Subscribe to all device topics (using mosquitto_sub)
mosquitto_sub -h localhost -p 1883 -u bridge -P password -t "v1/#" -v

# Publish test message
mosquitto_pub -h localhost -p 1883 -u device_TEST -P password \
  -t "v1/TEST001/rawdata" -m '{"device_id":"TEST001","auth_token":"..."}'
```

### Database Debugging

```bash
# Connect to PostgreSQL
docker exec -it tracking-postgres psql -U postgres vehicle_tracking

# Useful queries
SELECT device_id, current_status, last_seen_at FROM devices;
SELECT * FROM device_sessions WHERE status = 'running';
SELECT * FROM alerts WHERE status = 'active' ORDER BY created_at DESC;
```

### Log Viewing

```bash
# Structured logs (Backend uses Winston, Bridge uses Pino)
docker logs tracking-backend --tail 50 -f | jq .
docker logs tracking-mqtt-bridge --tail 50 -f | jq .

# Development mode: pretty-printed automatically
npm run dev  # Pino-pretty / Winston console format
```

---

## 7. Common Tasks

### Add New API Endpoint

```
1. Create/update types:     src/domain/{feature}/types/
2. Add repository method:   src/domain/{feature}/repositories/
3. Add service logic:       src/domain/{feature}/services/
4. Add controller:          src/api/controllers/
5. Add route:               src/api/routes/
6. Add validation:          src/api/validators/
7. Update OpenAPI spec:     src/api/openapi/
```

### Add New MQTT Handler

```
1. Add topic constant:      src/constants/topics.ts
2. Create handler:          src/handlers/{name}.handler.ts
3. Add route in index.ts:   switch case for new suffix
4. Update subscriptions:    src/mqtt/subscriptions.ts
```

### Add New Frontend Feature

```
1. Create feature folder:   src/features/{name}/
2. Add components:          src/features/{name}/components/
3. Add hooks:               src/features/{name}/hooks/
4. Add API calls:           src/features/{name}/api/
5. Add page:                src/app/dashboard/{name}/page.tsx
6. Update nav config:       src/config/nav-config.ts
```

### Add Database Migration

```
1. Create SQL file:         Tracking_PostgreSQL/init/{NN}-{name}.sql
2. Test locally:            psql -f init/{NN}-{name}.sql
3. Apply to UAT:            node scripts/apply-init-migrations.js
```

---

> Đây là file cuối trong bộ tài liệu cloud-programming-guide.
> Quay lại: [01-system-architecture.md](./01-system-architecture.md)
