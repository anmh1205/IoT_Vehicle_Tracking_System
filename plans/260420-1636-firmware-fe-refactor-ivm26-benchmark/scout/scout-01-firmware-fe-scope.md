# Scout Report - Firmware FE Scope

## File inventory

### Entry routes
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/page.tsx` — page chính firmware, chứa phần lớn orchestration UI + data.
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/platform/firmware/page.tsx` — re-export route về page chính.

### Firmware UI components
- `.../src/app/dashboard/firmware/components/firmware-summary-cards.tsx`
- `.../src/app/dashboard/firmware/components/firmware-deployment-history.tsx`
- `.../src/app/dashboard/firmware/components/firmware-upload-dialog.tsx`
- `.../src/app/dashboard/firmware/components/firmware-deploy-dialog.tsx`
- `.../src/app/dashboard/firmware/components/firmware-utils.ts`

### API / validation / data contracts
- `.../src/lib/api/firmware.ts` — API client + normalize payload.
- `.../src/lib/validations/firmware.schema.ts` — schema validation firmware inputs.

### Shared dependencies (cross-feature)
- `.../src/features/devices/hooks/use-devices.ts` — source device list cho deploy.
- `.../src/hooks/use-role-access.ts` — gating `canManageFirmware`.
- `.../src/components/providers/socket-provider.tsx` — realtime socket.
- `.../src/hooks/use-realtime-subscription.ts` — abstraction subscribe event realtime (chưa được page firmware dùng).
- `.../src/components/common/data-table.tsx`, `.../src/components/common/stat-card.tsx`, `.../src/components/layout/PageContainer.tsx`.

### Tests
- Không thấy file test/spec riêng cho firmware page hoặc firmware components trong `Tracking_Frontend/src`.

## Dependency map
- `dashboard/firmware/page.tsx`
  - data fetch: `firmwareServices.getList`, `firmwareServices.getDeployments`, `useDevices`
  - mutations: upload/activate/deactivate/delete/deploy thông qua dialogs + action column
  - realtime: subscribe trực tiếp `firmware:progress`, `firmware:complete` bằng `useSocket`
  - permission gate: `useRoleAccess().canManageFirmware`
  - render children: summary cards + context cards + data table + deployment history + dialogs
- `firmware-deploy-dialog.tsx`
  - phụ thuộc mạnh vào device shape và device status labels
  - logic lọc/chọn + summary + strategy nằm chung một component lớn
- `firmware-deployment-history.tsx`
  - đang render danh sách card dày thông tin, mix metric + timeline + error context trong cùng panel

## Pain points (dấu hiệu rối UI)
- Page chính đang ôm quá nhiều concern: orchestration data, realtime handlers, KPI calc, context calc, table actions, dialog state.
- Information density cao: summary cards + 2 context cards + table + deployment stream dài => khó xác định “primary action” đầu tiên.
- Progressive disclosure yếu: nhiều khối “ngữ cảnh” hiển thị mặc định dù không phải lúc nào cần.
- Deployment history card đang hiển thị quá nhiều metadata cùng lúc (job/boot/partition/seq/status/error) gây cognitive load.
- Realtime feedback dùng toast trực tiếp cho progress có thể spam; chưa thấy tầng tổng hợp/sampling.
- Không có test coverage cho firmware page/component => refactor UI khó an toàn.

## Unresolved questions
- Persona chính của trang firmware là ai trong nhóm admin/root: release operator, support, hay devops?
- KPI cần ưu tiên ở first fold là gì (an toàn rollout, tỷ lệ success, drift theo active, hay chỉ thao tác upload/deploy)?
- Có cần giữ full deployment metadata trên main page hay tách sang detail drawer/modal?
- Mức realtime mong muốn: toast every progress event hay chỉ milestone + error?
