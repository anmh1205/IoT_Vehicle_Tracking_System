---
type: runbook
repo: iot-vehicle-tracking-system
domain:
  - iot-fleet-tracking
knowledge_state: distilled
confidence: medium
source_refs:
  - ../../../README.md
  - ../70-sources/evidence-cards/thesis-ch04-evidence-cards.yaml
  - ../70-sources/evidence-cards/repo-reality-evidence-cards.yaml
review_due: 2026-05-08
owner_scope: owned
---
# Runbook: Bring Up Local Stack

State: source-backed only in this batch. No live bring-up was executed here.

## Preconditions
- Docker and Docker Compose available
- Service `.env` files prepared where required
- Shared network not yet missing

## Steps
1. Create the shared network.

```bash
docker network create tracking-network
```

2. Start infrastructure first.

```bash
docker compose -f iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/docker-compose.yml up -d
docker compose -f iot-vehicle-tracking-system-cloud/Tracking_EMQX/docker-compose.yml up -d
docker compose -f iot-vehicle-tracking-system-cloud/Tracking_VictoriaMetrics/docker-compose.yml up -d
docker compose -f iot-vehicle-tracking-system-cloud/Tracking_VictoriaLogs/docker-compose.yml up -d
docker compose -f iot-vehicle-tracking-system-cloud/Tracking_Grafana/docker-compose.yml up -d
```

3. Start application services.

```bash
docker compose -f iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/docker-compose.yml up -d
docker compose -f iot-vehicle-tracking-system-cloud/Tracking_Backend/docker-compose.yml up -d
docker compose -f iot-vehicle-tracking-system-cloud/Tracking_Frontend/docker-compose.yml up -d
```

4. If you need mobile, run it separately after backend/frontend are healthy.

## Success Signals
- Docker reports the main containers as `Up`; healthchecks are especially relevant for PostgreSQL, Grafana, VictoriaMetrics, and VictoriaLogs.
- `http://localhost:4000/health/live` returns `200`.
- `http://localhost:4000/ws-health` returns JSON.
- `http://localhost:4001/login` loads.
- `http://localhost:4002` serves Grafana.

## Known Drift
- README and thesis-derived docs still promise host-browser access to EMQX and VictoriaMetrics, but current compose files do not expose those host ports.
- `Tracking_Frontend/.env.example` is missing even though docs still describe a template-driven copy step.

