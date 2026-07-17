---
type: system
repo: iot-vehicle-tracking-system
domain:
  - backend-cloud-processing
  - frontend-operations-dashboard
knowledge_state: validated
confidence: medium
source_refs:
  - ../70-sources/evidence-cards/thesis-ch03-evidence-cards.yaml
  - ../70-sources/evidence-cards/repo-reality-evidence-cards.yaml
  - ../../../docs/system-architecture.md
review_due: 2026-05-24
owner_scope: owned
---
# System: Cloud To Dashboard Flow

## Stable Flow
1. Backend exposes REST under `/api/v1` and keeps `/api` as a compatibility alias.
2. Backend publishes health and operator-facing support surfaces through `/health`, `/ws-health`, `/metrics`, and `/api-docs`.
3. Frontend rewrites `/api/:path*` to the configured backend base URL and keeps realtime on Socket.IO.
4. Backend listens to `internal/events/#`, emits realtime events, and the frontend updates read models through socket-driven invalidation plus REST reads.

## Current Frontend Runtime Model
- `/` redirects to `/login`.
- `/login`, `/api`, and `/landing` are public.
- The rest of the dashboard is protected by `session_token`.
- Current dashboard navigation is route-registry based and more structured than the thesis-era dashboard-only shell.

## Current-Only Divergence From Thesis
- The thesis frontend chapter is still useful for architecture intent, but it does not describe the current `/login` entry, `/landing` public path, or the present route-alias tree.
- Mobile is now an active client surface in the repo even though the thesis treated it as future-stage work.

## Related Notes
- [Architecture Overview](../10-architecture.md)
- [Validate Frontend Backend Health](../40-runbooks/runbook-validate-frontend-backend-health.md)

