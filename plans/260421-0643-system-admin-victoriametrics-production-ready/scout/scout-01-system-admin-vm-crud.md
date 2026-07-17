# Scout Report — System Admin + VictoriaMetrics CRUD

## Scope
- Repo: `E:/anmh1205/IoT_Vehicle_Tracking_System`
- Focus: system-admin + VictoriaMetrics production-ready CRUD
- Areas: backend/frontend/infra

## Relevant Files

### Backend
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/routes/system-admin.routes.ts` — route system-admin hiện có (health, metrics, logs, audit, settings CRUD, table query).
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/system-admin.controller.ts` — controller chính, guard role `admin|root`.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/system-admin/services/system-admin.service.ts` — core service cho VM/VL query + settings/table query.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/system-admin/repositories/victoriametrics.repository.ts` — repo query VM API.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/system-admin/repositories/victorialogs.repository.ts` — repo query VictoriaLogs API.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/middleware/auth.middleware.ts` — auth + admin role guard.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/audit/services/audit-log.service.ts` — ghi audit log.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/audit/repositories/audit-log.repository.ts` — persistence audit logs.
- `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/config/env.ts` — env endpoint VM/VL.

### Frontend
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/system-admin/page.tsx` — trang admin chính có tab metrics + victoria settings.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/system-admin/hooks/use-system-admin.ts` — React Query hooks cho system-admin APIs.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/lib/api/system-admin.ts` — client API `/system-admin/*`.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/system-admin/components/victoria-metrics-settings-panel.tsx` — CRUD key-value settings liên quan VM.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/system-admin/components/metrics-explorer.tsx` — query explorer (preset local, chưa persisted CRUD).
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/hooks/use-role-access.ts` — RBAC frontend coarse-grained.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/config/dashboard-route-registry.ts` — route permission keys.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/components/common/data-table.tsx` — table pattern tái sử dụng.

### Infra
- `iot-vehicle-tracking-system-cloud/Tracking_VictoriaMetrics/docker-compose.yml` — retention mặc định `30d`.
- `iot-vehicle-tracking-system-cloud/Tracking_VictoriaLogs/docker-compose.yml` — retention mặc định `7d`.
- `iot-vehicle-tracking-system-cloud/Tracking_Grafana/provisioning/datasources/datasources.yml` — datasource tĩnh.
- `iot-vehicle-tracking-system-cloud/Tracking_Grafana/provisioning/prometheus/alerts.yml` — alert rules tĩnh.

## Current Gaps

### 1) Datasource + Query Templates
- Chưa có entity CRUD riêng cho datasource/query-template (đang nghiêng về key-value generic `system_settings`).
- Query presets ở UI hiện hardcode, chưa có persisted versioned template catalog.
- Thiếu guardrails về query complexity, namespace whitelist, safe validation.

### 2) Alert Rules + Recording Rules
- Chưa có CRUD UI/API cho rule definitions (alert + recording).
- Rule đang quản theo file tĩnh (Grafana provisioning), chưa có lifecycle draft/validate/activate/rollback.
- Chưa có test/preview trước publish rule.

### 3) Tenant + Retention + Access Control
- Chưa có tenant domain model rõ ràng cho system-admin VM assets.
- Retention cấu hình tĩnh ở compose, chưa có governance CRUD runtime.
- RBAC hiện coarse theo role; thiếu permission granularity theo hành động/tài nguyên.

## Low-risk Integration Points (YAGNI/KISS/DRY)
- Mở rộng module `system-admin` hiện hữu thay vì tạo subsystem mới.
- Dùng lại API client + hooks pattern hiện tại, chỉ tách endpoint/resource rõ ràng.
- Reuse `data-table` + `react-hook-form` + zod validation pipeline.
- Áp audit logging vào mutation paths trước khi làm workflow phức tạp.
- Phase đầu dùng versioned config + controlled rollout; tránh hot-reload nguy hiểm ngay.

## Unresolved Questions
- Có chấp nhận thêm service mới (`vmalert`, `vmauth`) ngay phase này không?
- Tenant model cần multi-tenant full hay global + tenant-ready fields trước?
- Retention thay đổi phải hot-apply hay chấp nhận apply theo deploy/restart?
- Permission matrix mục tiêu chi tiết tới mức nào (view/query/manage/delete/apply/rollback)?
- Query templates có cần approval workflow hay chỉ CRUD + versioning?
