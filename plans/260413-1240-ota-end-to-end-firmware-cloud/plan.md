---
title: "OTA end-to-end firmware-cloud hard plan"
description: "Production-like plan to close OTA gaps across firmware, backend, MQTT bridge, frontend, and UAT/VPS operations."
status: in_progress
priority: P2
effort: "6 phases / 6-9d"
branch: feature/cicd
tags: [ota, firmware, backend, mqtt, vps, uat, esp32]
created: 2026-04-13
---

# OTA end-to-end firmware-cloud plan

## Goal
Close the real OTA loop on UAT/VPS with ESP32 hardware + serial: upload artifact -> deploy command -> HTTPS download -> flash -> reboot -> confirm/rollback -> cloud/UI observability.

## Context links
- Research firmware: `./research/researcher-firmware-ota-report.md`
- Research cloud/VPS: `./research/researcher-cloud-vps-ota-report.md`
- Phase 1: `./phase-01-audit-contract-and-uat-baseline.md`
- Phase 2: `./phase-02-harden-backend-artifact-and-deployment-contract.md`
- Phase 3: `./phase-03-harden-mqtt-bridge-and-ota-state-reconciliation.md`
- Phase 4: `./phase-04-harden-firmware-ota-runtime-and-confirm-rollback.md`
- Phase 5: `./phase-05-run-uAT-vps-and-esp32-debug-loops.md`
- Phase 6: `./phase-06-close-test-matrix-docs-and-release-gate.md`

## Hard truths / gaps
- Firmware already downloads/flashes/confirms, but cloud contract is still weak vs production-like ops.
- Download endpoint is auth-optional, not explicitly designed/tested for device-safe anonymous OTA fetch.
- Backend deploy state is thin: assigned exists, but timeout/stuck/reconcile semantics are weak.
- MQTT bridge upserts latest row only; duplicate/out-of-order progress handling is not hardened.
- Frontend shows deployments, but operator UX/error taxonomy is still shallow.
- VPS artifact/TLS/network/runtime observability must be proven from real device path, not assumed.

## Phases
| Phase | Status | Progress | Output |
|---|---|---:|---|
| 1. Audit contract and UAT baseline | completed | 100% | exact gaps, env/runtime checklist, go/no-go baseline |
| 2. Harden backend artifact and deployment contract | completed | 100% | stable download contract, deploy lifecycle, operator-safe API |
| 3. Harden MQTT bridge and OTA state reconciliation | completed | 100% | idempotent OTA ingestion, stuck/duplicate handling |
| 4. Harden firmware OTA runtime and confirm/rollback | completed | 100% | safer OTA execution, better error mapping, durable semantics |
| 5. Run UAT/VPS and ESP32 debug loops | completed | 100% | real end-to-end loop using `vps-control` + `esp32-loop-coding` |
| 6. Close test matrix, docs, and release gate | in_progress | 85% | production-like validation evidence and doc updates |

## Dependency order
1. UAT/VPS baseline first.
2. Backend artifact/deploy contract before broad hardware loops.
3. MQTT bridge reconciliation before trusting progress UI.
4. Firmware fixes after exact cloud contract is frozen.
5. Real-device loop after cloud + firmware hardening.
6. Docs only after implementation truth is verified.

## Key dependencies
- `FIRMWARE_PUBLIC_BASE_URL` must point to reachable HTTPS artifact host.
- Backend, MQTT Bridge, EMQX, DB, logs/metrics, and reverse proxy/TLS must be observable on VPS.
- Real ESP32 with serial, controllable power/reboot, and MQTT-auth-valid device token.
- OTA artifact must be exact release binary with correct SHA256 and size.

## Done when
- One operator can deploy firmware from UI/API to a real device on UAT.
- Device reaches `success` after reboot confirm, or `failed/rolled_back` with reason.
- Bad SHA, bad URL, disconnects, reboots, stuck jobs, and rollback cases are observable and recoverable.
- Required docs updated: `docs/development-roadmap.md`, `docs/project-changelog.md`, `docs/system-architecture.md`, `docs/codebase-summary.md`.
