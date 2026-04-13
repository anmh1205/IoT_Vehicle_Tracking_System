# Phase 01 — Audit contract and UAT baseline

## Context links
- Parent plan: `./plan.md`
- Research: `./research/researcher-firmware-ota-report.md`, `./research/researcher-cloud-vps-ota-report.md`
- Docs: `E:/anmh1205/IoT_Vehicle_Tracking_System/README.md`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/codebase-summary.md`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/code-standards.md`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md`, `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-overview-pdr.md`

## Overview
- Date: 2026-04-13
- Description: Freeze the actual OTA contract and prove UAT/VPS baseline before any fix loop.
- Priority: P1
- Implementation status: pending
- Review status: pending

## Key Insights
- Firmware side is not zero-state. `command_handler.c`, `state_machine.c`, `util.c`, `mqtt_client.c`, `main.c` already cover parse, apply, publish, reboot, confirm.
- Cloud side is also not zero-state. Backend can upload/deploy/download; MQTT Bridge ingests firmware status; frontend exposes operator surface.
- Real gap is contract hardness: artifact reachability, auth model, lifecycle semantics, progress ordering, timeout/reconcile, and production-like observability.
- KISS rule: do not invent signed-header OTA, OTA CDN, or multi-stage rollout engine unless current firmware truly needs it.

## Requirements
- Define canonical OTA states across backend, MQTT bridge, firmware, frontend.
- Define canonical command payload and firmware status payload including error taxonomy.
- Define UAT runtime prerequisites: env vars, DNS/TLS, storage path, DB table health, MQTT topic reachability, logs/metrics visibility.
- Define exact operator path: upload -> deploy -> observe -> confirm success/rollback.

## Architecture
- Freeze one linear contract first:
  1. Operator uploads binary to backend storage.
  2. Backend creates deployment row and emits `ota_update` to device command topic.
  3. Firmware downloads via HTTPS, verifies SHA256, flashes, reboots.
  4. Firmware publishes firmware status milestones to `v1/{device_id}/firmware`.
  5. MQTT Bridge persists and forwards observability.
  6. Backend/frontend read same deployment truth.
- Reject parallel truth sources. DB + firmware topic are enough.

## Related code files
- Firmware parse/orchestration/apply:
  - `.../iot-vehicle-tracking-system-firmware/main/src/command_handler.c`
  - `.../iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
  - `.../iot-vehicle-tracking-system-firmware/main/src/util.c`
  - `.../iot-vehicle-tracking-system-firmware/main/src/mqtt_client.c`
  - `.../iot-vehicle-tracking-system-firmware/main/main.c`
- Backend/cloud:
  - `.../Tracking_Backend/src/api/routes/firmware.routes.ts`
  - `.../Tracking_Backend/src/api/controllers/firmware.controller.ts`
  - `.../Tracking_Backend/src/domain/firmware/services/firmware-deploy.service.ts`
  - `.../Tracking_Backend/src/config/env.ts`
  - `.../Tracking_MqttBridge/src/handlers/firmware.handler.ts`
  - `.../Tracking_Frontend/src/app/dashboard/firmware/page.tsx`
  - `.../Tracking_Frontend/src/lib/api/firmware.ts`
- VPS/runtime likely touched later:
  - backend compose/env/proxy/service files under `Tracking_Backend`, `Tracking_MqttBridge`, `Tracking_EMQX`, optional reverse proxy config

## Implementation Steps
1. Capture current OTA contract from code, not docs.
2. Write one state matrix: `assigned`, `downloading`, `verifying`, `installing`, `rebooting`, `confirming`, `success`, `failed`, `rolled_back`.
3. Define which side owns each transition.
4. Audit exact mismatch list:
   - auth/public download ambiguity
   - timeout/stuck deployment ownership
   - duplicate progress ordering
   - missing intermediate realtime/UI states
   - confirm timeout persistence vs enforcement
5. Build UAT baseline checklist for VPS:
   - backend env
   - public base URL
   - TLS cert chain
   - storage path mounted/persisted
   - EMQX reachability and topic ACL
   - DB table visibility
   - VictoriaLogs/Grafana tail path
6. Decide minimum production-like scope. Do not add cohort rollout orchestration if single-device hardening is still broken.

## Todo list
- [ ] Freeze OTA command contract and firmware status contract
- [ ] Define canonical lifecycle owner per state
- [ ] Define error taxonomy shortlist
- [ ] Define UAT/VPS baseline checklist
- [ ] Define go/no-go criteria before fix loop

## Success Criteria
- One written contract exists for command, status, state transitions, and ownership.
- Team can point to exact gaps instead of vague “OTA not stable”.
- UAT baseline checklist is actionable and sufficient for Phases 2-5.

## Risk Assessment
- Risk: chase symptoms before freezing contract.
  - Mitigation: no implementation before mismatch matrix is agreed.
- Risk: assume VPS/public URL works because browser works.
  - Mitigation: require validation from actual device-network path.

## Security Considerations
- Artifact download must not depend on dashboard session cookies.
- Public download, if kept, must be restricted to opaque artifact IDs plus HTTPS and least exposure.
- Topic ACL and device auth must remain device-scoped.

## Next steps
- If contract gap list is stable, Phase 02 hardens backend artifact and deployment semantics.
- If UAT baseline fails, stop and fix runtime before any firmware loop.
