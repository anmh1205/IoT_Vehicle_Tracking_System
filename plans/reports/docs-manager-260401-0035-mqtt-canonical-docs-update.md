# docs-manager-260401-0035-mqtt-canonical-docs-update

## Phạm vi
- Work context: `E:/anmh1205/IoT_Vehicle_Tracking_System`
- Docs: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/`
- Reports: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/reports/`

## Đã cập nhật
- `docs/project-changelog.md`
- `docs/development-roadmap.md`
- `docs/project-overview-pdr.md`
- `docs/system-architecture.md`
- `docs/codebase-summary.md`
- `docs/code-standards.md`

## Lý do
- Ghi nhận MQTT là canonical ingest path cho cả device thật và simulator.
- Xóa/đánh dấu legacy `/iot/data` khỏi runtime và OpenAPI.
- Chuẩn hóa realtime event contract sang colon-style.
- Ghi lại hardening cho token flow và mitigation cho rollback/race của simulator.
- Cập nhật trạng thái roadmap/changelog theo validation đã hoàn tất.

## Validation evidence đã dùng
- Backend lint/typecheck/test/build: pass.
- MQTT Bridge typecheck/build: pass.
- Runtime sanity: backend + bridge healthy trong log sweep.
- Code review closeout: còn note follow-up non-blocking về token lifecycle/legacy drift.

## Ghi chú
- Không sửa application code.
- Không tạo tài liệu mới ngoài các file docs hiện hữu.

## Unresolved questions
- Không có.
