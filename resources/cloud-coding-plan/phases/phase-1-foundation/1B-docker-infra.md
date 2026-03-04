# Sub-Phase 1B: Docker Infrastructure

> **Context:** ~3KB | **Max Files:** 8 config files | **Est. Time:** 1 session

## Summary
Setup Docker Compose với tất cả services: PostgreSQL, EMQX (MQTT), VictoriaMetrics, VictoriaLogs, Grafana. Cấu hình networking, volumes, health checks.

## Tasks
| ID      | Description             | Files                                        |
| ------- | ----------------------- | -------------------------------------------- |
| DOC-001 | Main docker-compose.yml | `docker-compose.yml`                         |
| DOC-002 | Dev override compose    | `docker-compose.dev.yml`                     |
| DOC-003 | EMQX configuration      | `Tracking_EMQX/etc/emqx.conf`                |
| DOC-004 | Grafana datasources     | `Tracking_Grafana/provisioning/datasources/` |
| DOC-005 | Environment template    | `.env.example`                               |
| DOC-006 | Nginx reverse proxy     | `docker/nginx/nginx.conf`                    |

## Service Matrix
| Service         | Image                                      | Ports             | Health Check     |
| --------------- | ------------------------------------------ | ----------------- | ---------------- |
| postgres        | `postgres:16-alpine`                       | 5432              | `pg_isready`     |
| emqx            | `emqx/emqx:5.3.0`                          | 1883, 8083, 18083 | TCP check        |
| victoriametrics | `victoriametrics/victoria-metrics:v1.96.0` | 8428              | HTTP /health     |
| victorialogs    | `victoriametrics/victoria-logs:v1.3.1-victorialogs` | 9428              | HTTP /health     |
| grafana         | `grafana/grafana:10.2.0`                   | 3001              | HTTP /api/health |

## Network Topology
```
                    ┌─────────────────────────────────────┐
                    │          tracking-network            │
                    │                                      │
  ┌─────────┐      │  ┌────────────┐    ┌────────────┐   │
  │ Frontend│◄─────┼──│   Backend  │───►│  PostgreSQL│   │
  │ :3002   │      │  │   :3000    │    │   :5432    │   │
  └─────────┘      │  └──────┬─────┘    └────────────┘   │
                   │         │                            │
                   │         ▼                            │
                   │  ┌────────────┐    ┌────────────┐   │
                   │  │ MQTTBridge │───►│VictoriaM  │   │
                   │  │            │    │   :8428    │   │
                   │  └──────┬─────┘    └────────────┘   │
                   │         │                            │
                   │         ▼                            │
                   │  ┌────────────┐    ┌────────────┐   │
                   │  │    EMQX    │    │VictoriaLogs│   │
                   │  │   :1883    │    │   :9428    │   │
                   │  └────────────┘    └────────────┘   │
                   └─────────────────────────────────────┘
```

## Environment Variables (Required)
```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=   # ⚠️ REQUIRED - no default in production
POSTGRES_DB=vehicle_tracking

# MQTT
MQTT_PASSWORD=       # ⚠️ REQUIRED

# Session
SESSION_SECRET=      # ⚠️ REQUIRED - min 32 chars

# Optional
GRAFANA_PASSWORD=admin
CORS_ORIGIN=http://localhost:3002
```

## Dependencies
- ✅ Độc lập — có thể chạy song song với 1A
- ➡️ Phase 2-5 sẽ sử dụng infrastructure này

## Verification
- [ ] `docker-compose up -d` — tất cả containers running
- [ ] `docker-compose ps` — health status OK
- [ ] Test connections:
  - PostgreSQL: `psql -h localhost -U postgres -d vehicle_tracking`
  - EMQX Dashboard: `http://localhost:18083` (admin/public)
  - VictoriaMetrics: `http://localhost:8428/-/healthy`
  - Grafana: `http://localhost:3001` (admin/admin)

## Full Spec Reference
- [12-docker-infrastructure.md](./../../12-docker-infrastructure.md) — Chi tiết Docker setup
