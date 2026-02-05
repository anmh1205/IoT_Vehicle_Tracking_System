# Project Structure - IVM26 Pattern

> Cấu trúc project theo mô hình IVM26: Service Isolation với Prefix-based Naming

---

## 1. Tổng Quan

### 1.1 Nguyên Tắc Thiết Kế (Học từ IVM26)

```
✅ PREFIX NAMING   - Tất cả folders dùng prefix chung (Tracking_)
✅ FLAT STRUCTURE  - Mỗi service/infrastructure là folder top-level
✅ ISOLATED        - Mỗi folder có docker-compose.yml riêng
✅ SHARED DATA     - Tracking_Data/ chứa persistent runtime data
✅ COPY TYPES      - Types copy giữa services (không npm workspaces)
✅ SINGLE REPO     - Tất cả trong 1 git repository
```

### 1.2 So Sánh Với IVM26

| Aspect | IVM26 | Vehicle Tracking |
|--------|-------|------------------|
| Git | Multi-repo | **Monorepo** (1 repo) |
| Prefix | `IVM26_` | `Tracking_` |
| Flat structure | ✅ Tất cả top-level | ✅ Tất cả top-level |
| Shared data | `IVM26_Data/` | `Tracking_Data/` |
| Per-service Docker | ✅ | ✅ |
| npm workspaces | ❌ | ❌ |

---

## 2. Cấu Trúc Thư Mục (IVM26 Pattern)

```
E:\anmh1205\IoT_Vehicle_Tracking_System\
│
├── .github/                           # GitHub Actions
│   └── workflows/
│
├── CLAUDE.md                          # AI instructions
├── README.md                          # Project overview
│
│   # ═══════════════════════════════════════════════════════════════
│   # APPLICATION SERVICES
│   # ═══════════════════════════════════════════════════════════════
│
├── Tracking_Backend/                  # Express + TypeScript API
│   ├── src/
│   ├── tests/
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── docker-compose.yml             # Dev environment
│   └── docker-compose.uat.yml         # UAT environment
│
├── Tracking_Frontend/                 # Next.js Web App
│   ├── src/
│   ├── public/
│   ├── e2e/
│   ├── package.json
│   ├── next.config.js
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── docker-compose.uat.yml
│
├── Tracking_MqttBridge/               # MQTT Bridge Service
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── docker-compose.uat.yml
│
├── Tracking_Mobile/                   # Flutter (Phase 2)
│   ├── lib/
│   └── pubspec.yaml
│
│   # ═══════════════════════════════════════════════════════════════
│   # INFRASTRUCTURE SERVICES (Mỗi service 1 folder riêng)
│   # ═══════════════════════════════════════════════════════════════
│
├── Tracking_PostgreSQL/               # PostgreSQL Database
│   ├── init/                          # SQL init scripts
│   │   ├── 00-extensions.sql
│   │   ├── 01-enums.sql
│   │   ├── 02-core-tables.sql
│   │   ├── 03-tracking-tables.sql
│   │   └── 99-seed-data.sql
│   ├── docker-compose.yml
│   └── docker-compose.uat.yml
│
├── Tracking_EMQX/                     # MQTT Broker
│   ├── etc/                           # EMQX config files
│   │   ├── emqx.conf
│   │   └── acl.conf
│   ├── docker-compose.yml
│   └── docker-compose.uat.yml
│
├── Tracking_VictoriaMetrics/          # Time-series Database
│   ├── docker-compose.yml
│   └── docker-compose.uat.yml
│
├── Tracking_VictoriaLogs/             # Logging Database
│   ├── docker-compose.yml
│   └── docker-compose.uat.yml
│
├── Tracking_Grafana/                  # Monitoring Dashboards
│   ├── provisioning/
│   │   ├── datasources/
│   │   └── dashboards/
│   ├── docker-compose.yml
│   └── docker-compose.uat.yml
│
├── Tracking_NPM/                      # Nginx Proxy Manager
│   ├── docker-compose.yml
│   └── docker-compose.uat.yml
│
│   # ═══════════════════════════════════════════════════════════════
│   # SHARED DATA (Persistent Runtime Data)
│   # ═══════════════════════════════════════════════════════════════
│
├── Tracking_Data/                     # Persistent data (gitignored)
│   ├── Tracking_PostgreSQL/           # PostgreSQL data directory
│   │   └── data/
│   ├── Tracking_EMQX/                 # EMQX persistent data
│   ├── Tracking_VictoriaMetrics/      # Metrics storage
│   ├── Tracking_VictoriaLogs/         # Logs storage
│   ├── Tracking_Grafana/              # Grafana data
│   └── Tracking_NPM/                  # NPM data
│
│   # ═══════════════════════════════════════════════════════════════
│   # DOCUMENTATION & RESOURCES
│   # ═══════════════════════════════════════════════════════════════
│
├── SystemDesign/                      # System Design Docs
│   ├── coding-plan/
│   └── iot-vehicle-tracking-report/
│
└── resources/                         # Shared resources/assets
```

---

## 3. Chi Tiết Application Services

### 3.1 Tracking_Backend

```
Tracking_Backend/
├── src/
│   ├── index.ts                       # Entry point
│   ├── app.ts                         # Express app
│   │
│   ├── api/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── validators/
│   │   └── openapi/
│   │
│   ├── domain/
│   │   ├── auth/
│   │   ├── device/
│   │   ├── vehicle/
│   │   ├── customer/
│   │   ├── trip/
│   │   ├── alert/
│   │   ├── geofence/
│   │   ├── maintenance/
│   │   ├── dashboard/
│   │   ├── firmware/
│   │   └── export/
│   │
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── victoriametrics/
│   │   └── logger/
│   │
│   ├── middleware/
│   ├── realtime/
│   └── types/
│
├── tests/
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── docker-compose.uat.yml
```

### 3.2 Tracking_MqttBridge

```
Tracking_MqttBridge/
├── src/
│   ├── index.ts
│   ├── mqtt.client.ts
│   ├── postgresql.client.ts
│   ├── victoriametrics.client.ts
│   ├── victorialogs.client.ts
│   ├── handlers/
│   │   ├── rawdata.handler.ts
│   │   ├── status.handler.ts
│   │   └── firmware.handler.ts
│   ├── batch/
│   │   └── database-batch.service.ts
│   ├── cache/
│   │   ├── device-state.cache.ts
│   │   └── session-stats.cache.ts
│   ├── validators/
│   │   └── payload.validator.ts
│   └── types/
│       └── payload.types.ts
│
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── docker-compose.uat.yml
```

### 3.3 Tracking_Frontend

```
Tracking_Frontend/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── lib/
│   └── types/
│
├── public/
├── e2e/
├── package.json
├── next.config.js
├── Dockerfile
├── docker-compose.yml
└── docker-compose.uat.yml
```

---

## 4. Chi Tiết Infrastructure Services

### 4.1 Tracking_PostgreSQL

```
Tracking_PostgreSQL/
├── init/                              # Mount to /docker-entrypoint-initdb.d
│   ├── 00-extensions.sql
│   ├── 01-enums.sql
│   ├── 02-core-tables.sql
│   ├── 03-tracking-tables.sql
│   └── 99-seed-data.sql
├── docker-compose.yml
└── docker-compose.uat.yml
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: tracking-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-secret}
      POSTGRES_DB: ${POSTGRES_DB:-vehicle_tracking}
    volumes:
      - ../Tracking_Data/Tracking_PostgreSQL/data:/var/lib/postgresql/data
      - ./init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - tracking-network

networks:
  tracking-network:
    external: true
```

### 4.2 Tracking_EMQX

```
Tracking_EMQX/
├── etc/                               # EMQX config
│   ├── emqx.conf
│   └── acl.conf
├── docker-compose.yml
└── docker-compose.uat.yml
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  emqx:
    image: emqx/emqx:5.3.0
    container_name: tracking-emqx
    environment:
      EMQX_NAME: tracking-emqx
      EMQX_HOST: 0.0.0.0
    volumes:
      - ../Tracking_Data/Tracking_EMQX:/opt/emqx/data
      - ./etc:/opt/emqx/etc
    ports:
      - "1883:1883"     # MQTT
      - "8083:8083"     # WebSocket
      - "18083:18083"   # Dashboard
    restart: unless-stopped
    networks:
      - tracking-network

networks:
  tracking-network:
    external: true
```

### 4.3 Tracking_VictoriaMetrics

```yaml
# Tracking_VictoriaMetrics/docker-compose.yml
version: '3.8'

services:
  victoriametrics:
    image: victoriametrics/victoria-metrics:v1.96.0
    container_name: tracking-victoriametrics
    command:
      - "-retentionPeriod=30d"
      - "-storageDataPath=/storage"
      - "-httpListenAddr=:8428"
    volumes:
      - ../Tracking_Data/Tracking_VictoriaMetrics:/storage
    ports:
      - "8428:8428"
    restart: unless-stopped
    networks:
      - tracking-network

networks:
  tracking-network:
    external: true
```

### 4.4 Tracking_VictoriaLogs

```yaml
# Tracking_VictoriaLogs/docker-compose.yml
version: '3.8'

services:
  victorialogs:
    image: victoriametrics/victoria-logs:v1.0.0
    container_name: tracking-victorialogs
    command:
      - "-retentionPeriod=7d"
      - "-storageDataPath=/storage"
      - "-httpListenAddr=:9428"
    volumes:
      - ../Tracking_Data/Tracking_VictoriaLogs:/storage
    ports:
      - "9428:9428"
    restart: unless-stopped
    networks:
      - tracking-network

networks:
  tracking-network:
    external: true
```

---

## 5. Tracking_Data (Persistent Runtime Data)

### 5.1 Mục Đích

```
Tracking_Data/
├── Tracking_PostgreSQL/data/      # PostgreSQL data files (auto-generated)
├── Tracking_EMQX/                 # EMQX persistent data
├── Tracking_VictoriaMetrics/      # Time-series data storage
├── Tracking_VictoriaLogs/         # Log data storage
├── Tracking_Grafana/              # Grafana dashboards/settings
└── Tracking_NPM/                  # Nginx Proxy Manager data
```

### 5.2 Lưu Ý Quan Trọng

```
⚠️ Tracking_Data/ KHÔNG chứa:
   - SQL scripts (đặt trong Tracking_PostgreSQL/init/)
   - Config files (đặt trong từng service folder)

⚠️ Tracking_Data/ CHỈ chứa:
   - Runtime data (database files, logs, metrics)
   - Persistent volumes mounted từ Docker containers

⚠️ Tracking_Data/ PHẢI được gitignore:
   .gitignore:
   Tracking_Data/
```

---

## 6. Sharing Types (Không npm Workspaces)

### 6.1 Cách Làm: Copy-Paste

```
Khi cần share types giữa backend và frontend:

1. Định nghĩa types trong service gốc (Tracking_Backend)
2. Copy file types sang service khác (Tracking_Frontend)
3. Hoặc: Export types qua API response schema
```

### 6.2 Ví Dụ

```typescript
// Tracking_Backend/src/types/device.types.ts
export interface Device {
  id: number;
  deviceId: string;
  deviceName: string;
  currentStatus: 'running' | 'stopped' | 'disconnected';
  lastSeenAt: string | null;
}

// Tracking_Frontend/src/types/device.types.ts
// COPY từ backend hoặc tự định nghĩa theo API response
export interface Device {
  id: number;
  deviceId: string;
  deviceName: string;
  currentStatus: 'running' | 'stopped' | 'disconnected';
  lastSeenAt: string | null;
}
```

---

## 7. Development Workflow

### 7.1 Setup Ban Đầu

```bash
# 1. Clone repo
git clone <repo>
cd IoT_Vehicle_Tracking_System

# 2. Create docker network
docker network create tracking-network

# 3. Create Tracking_Data directories
mkdir -p Tracking_Data/{Tracking_PostgreSQL/data,Tracking_EMQX,Tracking_VictoriaMetrics,Tracking_VictoriaLogs,Tracking_Grafana,Tracking_NPM}

# 4. Start infrastructure (từ mỗi folder riêng)
cd Tracking_PostgreSQL && docker-compose up -d && cd ..
cd Tracking_EMQX && docker-compose up -d && cd ..
cd Tracking_VictoriaMetrics && docker-compose up -d && cd ..
cd Tracking_VictoriaLogs && docker-compose up -d && cd ..

# 5. Install dependencies cho application services
cd Tracking_Backend && npm install && cd ..
cd Tracking_MqttBridge && npm install && cd ..
cd Tracking_Frontend && npm install && cd ..

# 6. Start application services (mở 3 terminals)
# Terminal 1:
cd Tracking_Backend && npm run dev

# Terminal 2:
cd Tracking_MqttBridge && npm run dev

# Terminal 3:
cd Tracking_Frontend && npm run dev
```

### 7.2 Development Commands

```bash
# Start specific infrastructure service
cd Tracking_PostgreSQL && docker-compose up -d

# Start specific application service with Docker
cd Tracking_Backend && docker-compose up -d

# Rebuild application service
cd Tracking_Backend && docker-compose up -d --build

# View logs
cd Tracking_Backend && docker-compose logs -f

# Stop all infrastructure
cd Tracking_PostgreSQL && docker-compose down
cd Tracking_EMQX && docker-compose down
cd Tracking_VictoriaMetrics && docker-compose down
```

### 7.3 UAT Deployment

```bash
# Start UAT environment
cd Tracking_PostgreSQL && docker-compose -f docker-compose.uat.yml up -d
cd Tracking_EMQX && docker-compose -f docker-compose.uat.yml up -d
cd Tracking_Backend && docker-compose -f docker-compose.uat.yml up -d
cd Tracking_Frontend && docker-compose -f docker-compose.uat.yml up -d
```

---

## 8. Ports Reference

| Service | Dev | UAT | Prod |
|---------|-----|-----|------|
| Tracking_Backend | 3000 | 3100 | 3000 |
| Tracking_Frontend | 3002 | 3102 | 80 |
| Tracking_PostgreSQL | 5432 | 5433 | 5432 |
| Tracking_VictoriaMetrics | 8428 | 8429 | 8428 |
| Tracking_VictoriaLogs | 9428 | 9429 | 9428 |
| Tracking_EMQX MQTT | 1883 | 1884 | 1883 |
| Tracking_EMQX Dashboard | 18083 | 18084 | 18083 |
| Tracking_Grafana | 3001 | 3101 | 3001 |

---

## 9. Docker Network

### 9.1 Shared Network

```bash
# Tạo network dùng chung cho tất cả services
docker network create tracking-network
```

### 9.2 Inter-service Communication

```yaml
# Trong docker-compose.yml của mỗi service
networks:
  tracking-network:
    external: true  # Dùng network đã tạo sẵn
```

**Service names trong network:**
- `tracking-postgres` → PostgreSQL
- `tracking-emqx` → MQTT Broker
- `tracking-victoriametrics` → VictoriaMetrics
- `tracking-victorialogs` → VictoriaLogs
- `tracking-backend` → Backend API
- `tracking-frontend` → Frontend

---

## 10. Migration Từ Cấu Trúc Cũ

### Cấu Trúc Cũ (SAI)
```
IoT_Vehicle_Tracking_System/
├── backend/                    # ❌ Không có prefix
├── mqtt-bridge/                # ❌ Không có prefix
├── frontend/                   # ❌ Không có prefix
├── data/                       # ❌ Nhầm với Tracking_Data
│   ├── postgres/               # ❌ Nên nằm trong Tracking_PostgreSQL/init/
│   └── emqx/                   # ❌ Nên nằm trong Tracking_EMQX/etc/
└── docker/                     # ❌ Không cần folder này
    ├── postgres/               # ❌ Nên là Tracking_PostgreSQL/
    └── victoriametrics/        # ❌ Nên là Tracking_VictoriaMetrics/
```

### Cấu Trúc Mới (ĐÚNG theo IVM26)
```
IoT_Vehicle_Tracking_System/
├── Tracking_Backend/           # ✅ Prefix + docker-compose.yml
├── Tracking_MqttBridge/        # ✅ Prefix + docker-compose.yml
├── Tracking_Frontend/          # ✅ Prefix + docker-compose.yml
├── Tracking_PostgreSQL/        # ✅ Infrastructure riêng
│   ├── init/                   # ✅ SQL scripts ở đây
│   └── docker-compose.yml
├── Tracking_EMQX/              # ✅ Infrastructure riêng
│   ├── etc/                    # ✅ Config ở đây
│   └── docker-compose.yml
├── Tracking_VictoriaMetrics/   # ✅ Infrastructure riêng
├── Tracking_VictoriaLogs/      # ✅ Infrastructure riêng
├── Tracking_Grafana/           # ✅ Infrastructure riêng
├── Tracking_NPM/               # ✅ Infrastructure riêng
└── Tracking_Data/              # ✅ Chỉ chứa runtime data (gitignored)
```

---

## 11. Summary

```
┌─────────────────────────────────────────────────────────────┐
│            PROJECT STRUCTURE (IVM26 Pattern)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📦 APPLICATION SERVICES                                    │
│  ├── Tracking_Backend/        # Express API                 │
│  ├── Tracking_MqttBridge/     # MQTT processing            │
│  ├── Tracking_Frontend/       # Next.js web app            │
│  └── Tracking_Mobile/         # Flutter (Phase 2)          │
│                                                              │
│  🗄️ INFRASTRUCTURE SERVICES                                 │
│  ├── Tracking_PostgreSQL/     # + init/ SQL scripts        │
│  ├── Tracking_EMQX/           # + etc/ config files        │
│  ├── Tracking_VictoriaMetrics/                              │
│  ├── Tracking_VictoriaLogs/                                 │
│  ├── Tracking_Grafana/        # + provisioning/            │
│  └── Tracking_NPM/            # Nginx Proxy Manager        │
│                                                              │
│  💾 PERSISTENT DATA (gitignored)                            │
│  └── Tracking_Data/           # Runtime data volumes       │
│                                                              │
│  📄 ROOT FILES                                               │
│  ├── CLAUDE.md                # AI instructions            │
│  ├── README.md                # Project overview           │
│  └── .gitignore               # Include Tracking_Data/     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Nguyên tắc IVM26:**
- ✅ Mỗi service/infrastructure là folder top-level với prefix `Tracking_`
- ✅ Mỗi folder có `docker-compose.yml` và `docker-compose.uat.yml` riêng
- ✅ SQL scripts nằm trong `Tracking_PostgreSQL/init/`
- ✅ Config files nằm trong từng service folder (không tách riêng)
- ✅ `Tracking_Data/` chỉ chứa persistent runtime data (gitignored)
- ✅ Types copy-paste giữa services (không npm workspaces)
- ✅ Dùng shared Docker network `tracking-network`
