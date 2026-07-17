---
type: runbook
repo: iot-vehicle-tracking-system
domain:
  - frontend-operations-dashboard
  - backend-cloud-processing
knowledge_state: distilled
confidence: medium
source_refs:
  - ../../../README.md
  - ../20-systems/system-cloud-to-dashboard-flow.md
  - ../70-sources/evidence-cards/repo-reality-evidence-cards.yaml
review_due: 2026-05-08
owner_scope: owned
---
# Runbook: Validate Frontend Backend Health

State: source-backed only in this batch. It defines the expected health boundary and redirect model.

## Preconditions
- Backend and frontend processes or containers are running
- Backend env has database and MQTT credentials
- Frontend env defines API and WS targets

## Steps
1. Check backend liveness and readiness.

```bash
curl http://localhost:4000/health/live
curl http://localhost:4000/health/ready
curl http://localhost:4000/health
curl http://localhost:4000/ws-health
```

2. Check support surfaces.

```bash
curl -I http://localhost:4000/api-docs
curl -I http://localhost:4000/metrics
```

3. Check frontend entry and redirect behavior.

```bash
curl -I http://localhost:4001/
curl -I http://localhost:4001/login
curl -I http://localhost:4001/dashboard/operations/map
```

4. Confirm frontend env wiring:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_WS_URL`

5. Confirm websocket client points to backend `4000` when no custom env override exists.

## Success Signals
- `/health/live` returns `200` with a success envelope.
- `/health/ready` returns `200` only when the database boundary is truly reachable.
- `/ws-health` returns a realtime snapshot instead of timing out.
- `/` redirects to `/login`.
- Unauthenticated dashboard access redirects to `/login?redirect=...`.

## Known Drift
- Current source expects frontend env keys, but there is no checked-in `Tracking_Frontend/.env.example`.

