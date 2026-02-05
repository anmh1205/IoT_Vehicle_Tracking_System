# Docker Deployment (IVM26 Pattern)

> Docker Compose configuration theo mô hình IVM26 - Mỗi service có docker-compose.yml riêng

---

## 1. Architecture Overview (IVM26 Pattern)

```
┌─────────────────────────────────────────────────────────────┐
│              DOCKER SERVICES (Per-folder compose)           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  APPLICATION SERVICES (Tracking_*/docker-compose.yml)       │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐        │
│  │  Frontend   │   │   Backend   │   │ MQTT Bridge │        │
│  │ Tracking_   │   │ Tracking_   │   │ Tracking_   │        │
│  │   :3002     │   │    :3000    │   │  MqttBridge │        │
│  └─────────────┘   └─────────────┘   └─────────────┘        │
│                                              │               │
│  INFRASTRUCTURE SERVICES (Tracking_*/docker-compose.yml)    │
│  ┌─────────────┐  ┌─────────────┐   ┌─────────────┐         │
│  │ PostgreSQL  │  │VictoriaMetrics│  │    EMQX    │         │
│  │ Tracking_   │  │  Tracking_  │   │ Tracking_   │         │
│  │    :5432    │  │    :8428    │   │ :1883/8083  │         │
│  └─────────────┘  └─────────────┘   └─────────────┘         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐   ┌─────────────┐         │
│  │VictoriaLogs │  │   Grafana   │   │    NPM      │         │
│  │ Tracking_   │  │ Tracking_   │   │ Tracking_   │         │
│  │    :9428    │  │    :3001    │   │   :80/443   │         │
│  └─────────────┘  └─────────────┘   └─────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Folder Structure (IVM26 Pattern)

```
IoT_Vehicle_Tracking_System/
├── Tracking_Backend/
│   ├── docker-compose.yml        # Dev
│   └── docker-compose.uat.yml    # UAT
├── Tracking_Frontend/
│   ├── docker-compose.yml
│   └── docker-compose.uat.yml
├── Tracking_MqttBridge/
│   ├── docker-compose.yml
│   └── docker-compose.uat.yml
├── Tracking_PostgreSQL/
│   ├── init/                     # SQL scripts
│   ├── docker-compose.yml
│   └── docker-compose.uat.yml
├── Tracking_EMQX/
│   ├── etc/                      # Config files
│   ├── docker-compose.yml
│   └── docker-compose.uat.yml
├── Tracking_VictoriaMetrics/
│   ├── docker-compose.yml
│   └── docker-compose.uat.yml
├── Tracking_VictoriaLogs/
│   └── docker-compose.yml
├── Tracking_Grafana/
│   ├── provisioning/
│   └── docker-compose.yml
├── Tracking_NPM/
│   └── docker-compose.yml
└── Tracking_Data/                # Persistent data (gitignored)
    ├── Tracking_PostgreSQL/data/
    ├── Tracking_VictoriaMetrics/
    └── ...
```

---

## 3. Shared Docker Network

```bash
# Tạo network dùng chung TRƯỚC khi start services
docker network create tracking-network
```

Tất cả docker-compose.yml phải có:
```yaml
networks:
  tracking-network:
    external: true
```

```yaml
version: '3.8'

services:
  # =============================================================================
  # DATABASE
  # =============================================================================
  postgres:
    image: postgres:16-alpine
    container_name: tracking-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-secret}
      POSTGRES_DB: ${POSTGRES_DB:-vehicle_tracking}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./docker/postgres/init:/docker-entrypoint-initdb.d
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

  # =============================================================================
  # TIME-SERIES DATABASE
  # =============================================================================
  victoriametrics:
    image: victoriametrics/victoria-metrics:v1.96.0
    container_name: tracking-victoriametrics
    command:
      - "-retentionPeriod=30d"
      - "-storageDataPath=/storage"
      - "-httpListenAddr=:8428"
      - "-search.latencyOffset=0s"
    volumes:
      - victoriametrics-data:/storage
    ports:
      - "8428:8428"
    restart: unless-stopped
    networks:
      - tracking-network

  victorialogs:
    image: victoriametrics/victoria-logs:v1.0.0
    container_name: tracking-victorialogs
    command:
      - "-retentionPeriod=7d"
      - "-storageDataPath=/storage"
      - "-httpListenAddr=:9428"
    volumes:
      - victorialogs-data:/storage
    ports:
      - "9428:9428"
    restart: unless-stopped
    networks:
      - tracking-network

  # =============================================================================
  # MQTT BROKER
  # =============================================================================
  emqx:
    image: emqx/emqx:5.3.0
    container_name: tracking-emqx
    environment:
      EMQX_NAME: tracking-emqx
      EMQX_HOST: 0.0.0.0
      EMQX_LOADED_PLUGINS: "emqx_management,emqx_auth_username"
    volumes:
      - emqx-data:/opt/emqx/data
      - emqx-log:/opt/emqx/log
      - ./docker/emqx/etc:/opt/emqx/etc
    ports:
      - "1883:1883"     # MQTT
      - "8083:8083"     # WebSocket
      - "8084:8084"     # WSS
      - "18083:18083"   # Dashboard
    restart: unless-stopped
    networks:
      - tracking-network

  # =============================================================================
  # BACKEND API
  # =============================================================================
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: tracking-backend
    environment:
      NODE_ENV: production
      PORT: 3000
      POSTGRESQL_HOST: postgres
      POSTGRESQL_PORT: 5432
      POSTGRESQL_DATABASE: ${POSTGRES_DB:-vehicle_tracking}
      POSTGRESQL_USER: ${POSTGRES_USER:-postgres}
      POSTGRESQL_PASSWORD: ${POSTGRES_PASSWORD:-secret}
      VICTORIAMETRICS_URL: http://victoriametrics:8428
      VICTORIALOGS_URL: http://victorialogs:9428
      MQTT_BROKER_URL: mqtt://emqx:1883
      MQTT_USERNAME: ${MQTT_USERNAME:-backend}
      MQTT_PASSWORD: ${MQTT_PASSWORD:-secret}
      JWT_SECRET: ${JWT_SECRET:-your-secret-key}
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:3002}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      victoriametrics:
        condition: service_started
      emqx:
        condition: service_started
    restart: unless-stopped
    networks:
      - tracking-network

  # =============================================================================
  # MQTT BRIDGE (Standalone Worker)
  # =============================================================================
  mqtt-bridge:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: tracking-mqtt-bridge
    command: npm run mqtt-bridge:prod
    environment:
      NODE_ENV: production
      POSTGRESQL_HOST: postgres
      POSTGRESQL_PORT: 5432
      POSTGRESQL_DATABASE: ${POSTGRES_DB:-vehicle_tracking}
      POSTGRESQL_USER: ${POSTGRES_USER:-postgres}
      POSTGRESQL_PASSWORD: ${POSTGRES_PASSWORD:-secret}
      VICTORIAMETRICS_URL: http://victoriametrics:8428
      VICTORIALOGS_URL: http://victorialogs:9428
      MQTT_BROKER_URL: mqtt://emqx:1883
      MQTT_USERNAME: ${MQTT_USERNAME:-backend}
      MQTT_PASSWORD: ${MQTT_PASSWORD:-secret}
    depends_on:
      postgres:
        condition: service_healthy
      victoriametrics:
        condition: service_started
      emqx:
        condition: service_started
    restart: unless-stopped
    networks:
      - tracking-network

  # =============================================================================
  # FRONTEND
  # =============================================================================
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: tracking-frontend
    environment:
      NEXT_PUBLIC_API_BASE_URL: ${API_BASE_URL:-http://localhost:3000/api/v1}
      NEXT_PUBLIC_WS_URL: ${WS_URL:-http://localhost:3000}
    ports:
      - "3002:3000"
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - tracking-network

  # =============================================================================
  # MONITORING
  # =============================================================================
  grafana:
    image: grafana/grafana:10.2.0
    container_name: tracking-grafana
    environment:
      GF_SECURITY_ADMIN_USER: ${GRAFANA_USER:-admin}
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD:-admin}
      GF_INSTALL_PLUGINS: grafana-clock-panel
    volumes:
      - grafana-data:/var/lib/grafana
      - ./docker/grafana/provisioning:/etc/grafana/provisioning
    ports:
      - "3001:3000"
    restart: unless-stopped
    networks:
      - tracking-network

  # =============================================================================
  # REVERSE PROXY (Optional - Production)
  # =============================================================================
  nginx:
    image: nginx:alpine
    container_name: tracking-nginx
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/ssl:/etc/nginx/ssl:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
    networks:
      - tracking-network
    profiles:
      - production

# =============================================================================
# VOLUMES
# =============================================================================
volumes:
  postgres-data:
  victoriametrics-data:
  victorialogs-data:
  emqx-data:
  emqx-log:
  grafana-data:

# =============================================================================
# NETWORKS
# =============================================================================
networks:
  tracking-network:
    driver: bridge
```

---

## 3. Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build
COPY . .
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs
USER expressjs

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

---

## 4. Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

---

## 5. Nginx Configuration

```nginx
# docker/nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }

    upstream backend {
        server backend:3000;
    }

    server {
        listen 80;
        server_name _;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Backend API
        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket
        location /ws {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_read_timeout 86400;
        }

        # Firmware downloads
        location /fw {
            proxy_pass http://backend;
            proxy_set_header Host $host;
        }
    }
}
```

---

## 6. Environment Variables

```bash
# .env
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=vehicle_tracking

# MQTT
MQTT_USERNAME=backend
MQTT_PASSWORD=your_mqtt_password

# JWT
JWT_SECRET=your_jwt_secret_key_here

# CORS
CORS_ORIGIN=http://localhost:3002

# API URLs (for frontend)
API_BASE_URL=http://localhost:3000/api/v1
WS_URL=http://localhost:3000

# Grafana
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin
```

---

## 7. Development Commands

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d postgres victoriametrics emqx

# View logs
docker-compose logs -f backend
docker-compose logs -f mqtt-bridge

# Rebuild after code changes
docker-compose up -d --build backend

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Production with nginx
docker-compose --profile production up -d
```

---

## 8. Database Initialization

```bash
# docker/postgres/init/01-init.sql
-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE device_status_enum AS ENUM ('running', 'stopped', 'disconnected');
CREATE TYPE session_status_enum AS ENUM ('running', 'completed', 'disconnected');

-- Tables will be created by schema files...
```

---

## 9. Health Checks

```yaml
# Add to each service
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:PORT/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

---

## 10. Scaling

```bash
# Scale MQTT bridge workers
docker-compose up -d --scale mqtt-bridge=3

# Scale backend (with load balancer)
docker-compose up -d --scale backend=2
```

---

## 11. Backup & Restore

```bash
# Backup PostgreSQL
docker exec tracking-postgres pg_dump -U postgres vehicle_tracking > backup.sql

# Restore PostgreSQL
docker exec -i tracking-postgres psql -U postgres vehicle_tracking < backup.sql

# Backup VictoriaMetrics
docker exec tracking-victoriametrics vmbackup -dst=fs:///backup

# Restore VictoriaMetrics
docker exec tracking-victoriametrics vmrestore -src=fs:///backup
```

---

## 12. Production Checklist

- [ ] Change all default passwords
- [ ] Enable SSL/TLS (nginx + Let's Encrypt)
- [ ] Configure proper log rotation
- [ ] Set up monitoring alerts
- [ ] Configure backup schedule
- [ ] Enable rate limiting
- [ ] Set resource limits (memory, CPU)
- [ ] Configure proper network policies
- [ ] Enable health checks for all services
- [ ] Set up CI/CD pipeline
