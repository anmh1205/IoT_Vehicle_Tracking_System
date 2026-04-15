# Phase 01 - Discovery and audit

## Context links
- `../plan.md`
- `../research/researcher-01-firmware-security-mqtts-report.md`
- `../research/researcher-02-cloud-migration-mqtts-report.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/codebase-summary.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md`

## Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-09
- Description: Chốt baseline hiện trạng firmware/cloud path, inventory topic/payload/auth/retry để tránh migrate mù.
- Priority: P1
- Implementation status: pending
- Review status: pending

## Key Insights
- MQTT đã là canonical ingest path, cần tránh mở thêm đường ingest song song.
- Risk lớn nhất là lệch contract giữa firmware payload và bridge/backend parser.
- Scope production cần audit secrets + TLS + observability từ đầu, không đẩy về cuối.

## Requirements
- Liệt kê đầy đủ topic hiện tại và consumers tương ứng.
- Snapshot chính sách hiện tại: QoS, retained, reconnect, retry, queue.
- Ghi rõ debt phải xử lý trước cutover (schema drift, duplicate handling, log lộ secret).

## Architecture
- Mapping 4 lớp: Firmware -> EMQX -> MQTT Bridge -> Backend/Storage.
- Tạo matrix contract: `topic x qos x retained x schema x owner`.
- Tạo matrix runtime: `component x env(local/UAT/prod) x config source`.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
  - `iot-vehicle-tracking-system-firmware/main/src/modem_at.c`
  - `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/handlers/*`
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/**/mqtt*`
- Create:
  - Không tạo code ở phase này
- Delete:
  - Không

## Implementation Steps
1. Thu inventory topic/payload từ firmware hiện tại và bridge handlers.
2. Thu inventory auth/TLS config tại firmware, broker, bridge, backend.
3. Xác định điểm lệch contract và phân loại: blocker vs follow-up.
4. Chốt baseline acceptance cho migration window 90d.

## Todo list
- [ ] Hoàn tất topic inventory (publish + subscribe).
- [ ] Hoàn tất payload inventory (cũ + mục tiêu mới).
- [ ] Hoàn tất auth/TLS/secrets inventory.
- [ ] Hoàn tất danh sách blocker trước phase 02.

## Success Criteria
- Có bảng inventory đầy đủ cho toàn pipeline.
- Có danh sách blocker ưu tiên P1/P2, không mơ hồ owner.
- Không còn unknown lớn về data path trước khi vào security foundation.

## Risk Assessment
- Risk: bỏ sót topic edge-case dẫn đến mất dữ liệu sau cutover.
- Mitigation: cross-check bằng log ingest thật + grep toàn repo.

## Security Considerations
- Audit vị trí lưu MQTT username/password và cert hiện tại.
- Audit log redaction cho secret fields ở firmware/bridge/backend.

## Next steps
- Chuyển output inventory sang phase 02 và phase 03 làm input bắt buộc.
