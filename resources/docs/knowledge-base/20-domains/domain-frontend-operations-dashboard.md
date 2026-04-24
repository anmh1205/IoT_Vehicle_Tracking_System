---
type: domain
repo:
  - iot-vehicle-tracking-system
domain:
  - frontend-operations-dashboard
knowledge_state: distilled
confidence: medium
source_refs:
  - ../10-repo-packs/iot-vehicle-tracking-system/20-systems/system-cloud-to-dashboard-flow.md
  - ../10-repo-packs/iot-vehicle-tracking-system/70-sources/evidence-cards/repo-reality-evidence-cards.yaml
review_due: 2026-05-24
owner_scope: personal
---
# Domain: Frontend Operations Dashboard

## Stable Core
- The dashboard still consumes REST plus Socket.IO.
- Protected operations remain under `/dashboard/*`.
- Route structure is now more explicit and registry-driven than the thesis snapshot.

## Current-Only Additions
- Root redirect to `/login`
- Public `/landing` path
- Explicit cookie-gated middleware
- Active mobile companion surface in the same repo

## Promoted Notes
- [Cloud To Dashboard Flow](../10-repo-packs/iot-vehicle-tracking-system/20-systems/system-cloud-to-dashboard-flow.md)
- [Validate Frontend Backend Health](../10-repo-packs/iot-vehicle-tracking-system/40-runbooks/runbook-validate-frontend-backend-health.md)

