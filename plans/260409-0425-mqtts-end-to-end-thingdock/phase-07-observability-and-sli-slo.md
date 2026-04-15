# Phase 07 - Observability and SLI/SLO

## Context links
- `../plan.md`
- `./phase-05-cloud-ingestion-and-mapping.md`
- `./phase-06-reliability-and-offline-buffering.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md`

## Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-09
- Description: Thiết kế telemetry + alerting để vận hành production MQTTS có đo được chất lượng dịch vụ.
- Priority: P2
- Implementation status: pending
- Review status: pending

## Key Insights
- Không có SLI/SLO rõ thì rollout chỉ dựa cảm tính.
- Phải tách metric phục vụ vận hành khỏi log debug thô để tránh nhiễu.
- Alert phải theo symptom (ingest fail, backlog, reconnect storm), không chỉ theo CPU/memory.

## Requirements
- Bắt buộc metric theo pipeline stage: broker, bridge, backend, storage.
- Bắt buộc trace/correlation theo `message_id` và `device_id`.
- Bắt buộc alert thresholds có owner và runbook.

## Architecture
- SLI core:
  - ingest success rate
  - e2e latency p95/p99
  - duplicate/drop rate
  - schema validation failure rate
  - broker disconnect/reconnect storm rate
- SLO draft:
  - 99.9% success cho status/events/commands (30d)
  - p95 ingest-to-persist <2s (status/events), <5s (rawdata route)
  - schema reject <0.1% (loại trừ client lỗi known-bad)

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/metrics/*`
  - `iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/**/metrics*`
  - `iot-vehicle-tracking-system-cloud/Tracking_Grafana/**`
  - `iot-vehicle-tracking-system-cloud/Tracking_VictoriaMetrics/**`
- Create:
  - Không tạo file markdown ngoài plan dir
- Delete:
  - Dashboard/alert rule dư thừa hoặc trùng nghĩa sau chuẩn hóa

## Implementation Steps
1. Chuẩn hóa metric taxonomy theo stage + low-cardinality labels.
2. Gắn correlation id cho toàn pipeline logs.
3. Tạo dashboard vận hành theo 3 view: realtime health, migration parity, reliability.
4. Tạo alert policies và escalation routes theo severity.

## Todo list
- [ ] Freeze SLI/SLO definitions và measurement window.
- [ ] Freeze alert thresholds + owner + escalation path.
- [ ] Freeze dashboard tối thiểu cho on-call.
- [ ] Freeze weekly review cadence cho SLO burn-rate.

## Success Criteria
- On-call xác định được root cause trong vài phút bằng dashboard + logs.
- Alert chất lượng cao, không spam, không miss outage chính.
- Có báo cáo SLO rõ cho local/UAT/prod.

## Risk Assessment
- Risk: label cardinality cao làm tăng cost và chậm query.
- Mitigation: khóa whitelist label từ đầu, review cardinality định kỳ.

## Security Considerations
- Metrics/logs không chứa secret hoặc payload nhạy cảm đầy đủ.
- Tách quyền xem dashboard giữa operator và developer theo least privilege.

## Next steps
- Dùng SLI/SLO này làm acceptance gate cho phase 08 rollout/rollback.
