# Phase 04 — Mobile and infra config hardening

## Context links
- Research frontend/mobile: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/reports/research-frontend-mobile-practices-260226-1442.md`
- Plan overview: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260226-1442-codebase-hardening-and-quality-improvements/plan.md`
- Phase 01 policy baseline: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260226-1442-codebase-hardening-and-quality-improvements/phase-01-critical-security-fixes.md`

## Overview
- Date: 2026-02-26
- Priority: P1
- Status: completed
- Goal: harden defaults và runtime config cho mobile + hạ tầng docker/EMQX/monitoring.

## Key Insights
- Flutter fallback `http/ws` khi thiếu defines => insecure transport risk.
- Notification service bị duplicate instance => behavior inconsistency.
- EMQX config có dấu hiệu credential/cookie cứng + exposure port rộng.
- Docker stack phụ thuộc external network chưa khai báo rõ.
- `npm:latest` gây non-reproducible deployments.
- Grafana datasource UID mismatch gây dashboard broken.

## Requirements
### Functional
- Bỏ insecure default transport cho mobile; fail fast khi thiếu required defines.
- Hợp nhất notification plugin thành single source of truth.
- Chuẩn hóa EMQX credential/cookie qua secret env; giảm surface exposed ports.
- Khai báo rõ network dependency `tracking-network`.
- Pin image tag có version/sha ổn định.
- Đồng bộ Grafana datasource UID với dashboard references.

### Non-functional
- Deploy reproducible, rollback dễ.
- Cấu hình local/dev/prod rõ ràng, ít trạng thái mơ hồ.

## Architecture
- Config contract-first:
  - Required env schema per service (mobile/backend/emqx/monitoring).
  - Startup validation: thiếu field critical => stop.
- Notification architecture:
  - One service owns init/channel/dispatch; callers dùng abstraction chung.
- Infra topology:
  - Internal network + explicit ingress ports only.

## Related code files
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Mobile/lib/core/config/app_config.dart`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Mobile/lib/features/notifications/local_notification_service.dart`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Mobile/lib/core/services/notification_service.dart`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_EMQX/etc/emqx.conf`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_EMQX/docker-compose.yml`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/docker-compose*.yml` (các file stack liên quan network/image)
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Grafana/provisioning/datasources/*`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Grafana/provisioning/dashboards/*`

## Implementation Steps
1. Định nghĩa config schema tối thiểu cho mobile transport + EMQX secrets + monitoring IDs.
2. Loại bỏ fallback `http/ws`; enforce secure endpoints hoặc fail build/runtime.
3. Gộp notification init/dispatch vào 1 service, xóa duplicate ownership.
4. Harden docker/emqx: bỏ hardcoded credential, pin versions, hạn chế cổng public.
5. Khai báo/verify external network dependency và tài liệu bootstrap.
6. Align Grafana datasource UID và dashboard references; thêm smoke check.

## Todo list
- [x] Enforce secure mobile config defaults.
- [x] Unify notification service ownership.
- [x] Externalize EMQX secrets và hạn chế port exposure.
- [x] Pin image tags (không dùng `latest`).
- [x] Declare/validate `tracking-network` dependency.
- [x] Fix Grafana datasource UID alignment.

## Success Criteria
- Mobile không tự rơi về `http/ws` khi thiếu defines.
- Notification không còn double-init/double-dispatch behavior.
- Không còn credential/cookie hardcoded trong cấu hình commit.
- Stack deploy reproducible với image tags cố định.
- Grafana dashboards load datasource đúng.

## Risk Assessment
- Risk: pin image version làm lệch với môi trường hiện tại.
  - Mitigation: test matrix theo env + staged rollout.
- Risk: giảm port exposure ảnh hưởng tích hợp cũ.
  - Mitigation: explicit allowlist + migration notice.

## Security Considerations
- Secrets chỉ qua env/secret store.
- Principle of minimum exposed surface.
- Validate config early để tránh chạy ở trạng thái insecure.

## Next Steps
- Đưa config schema/rules vào coding standards (Phase 05).
- Đồng bộ với ops checklist và tài liệu deploy.

## Unresolved questions
- Secret manager mục tiêu là gì (Docker secrets, Vault, hay CI env vars)?