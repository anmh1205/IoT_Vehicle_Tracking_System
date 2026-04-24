# Reconciliation Summary

## Validated

| Topic | Evidence cards | Promotion target |
|---|---|---|
| Repo-wide end-to-end architecture | `thesis-ch01-architecture-intent`, `thesis-ch03-cloud-architecture`, `repo-runtime-service-catalog` | `00-home.md`, `10-architecture.md` |
| MQTT topic contract and internal event spine | `thesis-ch03-mqtt-topic-contract`, `repo-mqtt-bridge-topics-and-health`, `repo-firmware-mqtt-topics` | `concept-mqtt-topic-contract.md`, `system-device-to-cloud-flow.md` |
| Device state machine | `thesis-ch03-device-state-machine`, `repo-firmware-offline-replay-runtime` | `concept-device-state-machine.md` |
| Offline buffering and replay | `thesis-ch02-technical-constraints`, `repo-firmware-offline-replay-runtime` | `concept-offline-buffering-and-replay.md` |
| Per-service Docker split plus shared network | `thesis-ch04-docker-service-split`, `repo-runtime-service-catalog` | `10-architecture.md`, `runbook-bring-up-local-stack.md` |
| Backend health and API surface | `thesis-appendix-api-docs-surface`, `repo-backend-health-contract` | `system-cloud-to-dashboard-flow.md`, `runbook-validate-frontend-backend-health.md` |
| Observability and hardening expectation | `thesis-ch04-observability-and-hardening`, `thesis-ch05-risk-and-hardening-roadmap`, `repo-backend-health-contract` | `10-architecture.md`, runbooks, open questions |

## Current-Only

| Topic | Evidence cards | Promotion target |
|---|---|---|
| Frontend login/session shell and guarded dashboard | `repo-frontend-access-model` | `system-cloud-to-dashboard-flow.md`, frontend domain note |
| Canonical OTA raw status lifecycle | `repo-ota-status-canonical` | `concept-ota-and-config-flow.md` |
| Mobile shell as active runtime surface | `repo-mobile-shell-present` | repo home note, open questions |

## Historical-Design

| Topic | Evidence cards | Use |
|---|---|---|
| Mobile as future-stage roadmap item | `thesis-ch05-mobile-as-future-stage` | history/intent only; do not treat as current implementation boundary |

## Conflict

| Topic | Evidence cards | Why promotion is blocked |
|---|---|---|
| Local host-port exposure for EMQX and VictoriaMetrics | `thesis-ch04-local-ports-and-env-handbook`, `repo-infra-host-port-exposure-gap` | local-run docs cannot be promoted as current truth without correction |
| Frontend and Grafana local port allocation | `thesis-ch04-local-ports-and-env-handbook`, `repo-runtime-service-catalog` | thesis appendix inverts current port ownership |
| Env contract shape for broker/frontend templates | `thesis-appendix-env-contract-shape`, `repo-frontend-env-template-gap` | thesis appendix and repo truth no longer share one env model |
| Frontend stack/version baseline | `thesis-ch03-frontend-web-stack`, `repo-frontend-stack-version` | thesis stack snapshot is no longer the current runtime version |

