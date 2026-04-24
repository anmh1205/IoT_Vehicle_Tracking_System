---
type: question
repo: iot-vehicle-tracking-system
domain:
  - iot-fleet-tracking
knowledge_state: distilled
confidence: low
source_refs:
  - ./70-sources/conflict-queue.yaml
  - ./70-sources/reconciliation-summary.md
review_due: 2026-05-08
owner_scope: owned
---
# Open Questions

| Priority | Topic | Why it remains open | Best next source |
|---|---|---|---|
| `p1` | Should EMQX and VictoriaMetrics expose host ports locally? | Current compose files and onboarding docs disagree. | `Tracking_EMQX/docker-compose.yml`, `Tracking_VictoriaMetrics/docker-compose.yml`, README update decision |
| `p1` | Which local port mapping is canonical for frontend vs Grafana? | Thesis appendix and current repo docs diverge. | README plus compose files |
| `p2` | Should `Tracking_Frontend/.env.example` be restored? | Source expects env keys, but the template file is absent. | Frontend maintainer decision + repo docs |
| `p2` | Is `MQTT_BROKER_URL` still supported anywhere? | Thesis appendix uses it, current backend/bridge do not. | Backend and bridge env loaders |
| `p3` | Should mobile get its own repo-pack note in wave 2? | It is current runtime scope, but not part of thesis validated baseline. | README, mobile code owners, future wave plan |
| `p3` | Which firmware runtime module layout should be treated as canonical after the current refactor stabilizes? | High-level state-machine model is stable, but file ownership detail should not be promoted too early. | Firmware source reference pack + stabilized runtime module map |

## Unresolved Questions
- Should the next batch normalize local bring-up docs first, or expand coverage to mobile and deeper API/domain notes?
