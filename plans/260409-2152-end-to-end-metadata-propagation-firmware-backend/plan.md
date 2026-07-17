---
title: "End-to-end metadata propagation (firmware + backend)"
description: "Hoàn tất luồng metadata từ firmware qua bridge tới backend realtime theo hướng optional/fail-open và không làm tăng cardinality metrics."
status: pending
priority: P1
effort: 6h
branch: feature/cicd
tags: [firmware, mqtt, metadata, backend, realtime]
created: 2026-04-09
---

## Mục tiêu
Hoàn tất metadata propagation E2E cho `rawdata/status/events/firmware`: firmware phát `metadata`, MqttBridge giữ nguyên (đã có), backend nhận + phát tiếp realtime mà không phá backward compatibility.

## Phạm vi + nguyên tắc
- KISS/YAGNI: chỉ chạm đường đi metadata, không refactor lớn.
- Fail-open: thiếu/sai metadata vẫn xử lý nghiệp vụ như cũ.
- Không đưa `message_id` vào label metrics (VictoriaMetrics/Prometheus cardinality).

## File cần sửa chính xác
### Firmware
1. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/data_formatter.h`
2. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/data_formatter.c`
3. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
4. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/util.h`
5. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/util.c`

### Server/Backend
6. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/event-bus.util.ts`
7. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/infrastructure/realtime/mqtt-event-listener.ts`

### Chỉ verify, không dự kiến sửa
8. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/types/payload.types.ts`
9. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/validators/payload.validator.ts`
10. `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/handlers/*.ts`

## Execution order (step-by-step)
1. **Đóng schema metadata firmware**
   - Chuẩn hóa payload metadata theo bridge đang nhận: `schema_version`, `message_id`, `sent_at`, `seq_no`, `boot_id`.
   - Giữ optional hoàn toàn ở phía bridge/backend (đã fail-open).

2. **Firmware: thêm metadata vào formatter**
   - `data_formatter.*`: thêm object `metadata` vào cả 4 payload builder.
   - `schema_version`: hằng số compile-time (vd `v1.0.0`).
   - `sent_at`: dùng `timestamp_ms` đang truyền vào formatter.

3. **Firmware: sinh `boot_id` + `message_id` + `seq_no` tối giản**
   - `util.*`: thêm helper sinh `boot_id` string ổn định theo boot (khởi tạo 1 lần lúc runtime start).
   - `state_machine.c`: quản lý counter `seq_no` tăng đơn giản theo message publish; tạo `message_id` deterministic nhẹ (boot_id + seq + timestamp) hoặc UUID-like string đủ unique.
   - Không thay đổi flow offline queue; payload đã có metadata sẽ được replay nguyên trạng.

4. **Backend: propagate metadata từ internal MQTT envelope ra realtime event bus**
   - `mqtt-event-listener.ts`: map thêm metadata fields từ `envelopePayload` vào các event `device:status`, `device:position`, `device:session_*`, `alert:new`.
   - `event-bus.util.ts`: mở rộng type event payload để chứa metadata optional.
   - Không đổi contract bắt buộc; field mới đều optional.

5. **Cardinality guardrail check**
   - Xác nhận không có code thêm `message_id`/`boot_id` vào metric labels (`app-metrics.ts` không đổi).
   - Metadata chỉ nằm ở log/event payload.

6. **E2E smoke validation**
   - Publish test payload có/không có metadata.
   - Xác nhận bridge vẫn accept, backend vẫn broadcast, không crash schema.

## Validation commands sau khi sửa
### Firmware
```bash
# Build compile check
cd /e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware && idf.py build

# (Nếu có board) monitor log để check metadata thực tế
cd /e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware && idf.py -p COM6 monitor
```

### MqttBridge
```bash
cd /e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_MqttBridge && npm run typecheck && npm run build
```

### Backend
```bash
cd /e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend && npm run lint && npm run typecheck && npm run test && npm run build
```

### Cloud runtime smoke (optional but recommended)
```bash
# Start/refresh services
cd /e/anmh1205/IoT_Vehicle_Tracking_System && docker compose -f iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/docker-compose.yml up -d && docker compose -f iot-vehicle-tracking-system-cloud/Tracking_Backend/docker-compose.yml up -d
```

## Risks + mitigation tối thiểu
- **Risk 1: Firmware tạo message_id không đúng format UUID, bridge drop metadata.**
  - Mitigation: giữ validator fail-open như hiện tại; thêm test payload thực tế từ firmware log.
- **Risk 2: Mở rộng backend event type làm lệch type compile ở consumer.**
  - Mitigation: chỉ thêm field optional, không đổi field cũ.
- **Risk 3: Cardinality bùng nổ nếu ai đó đưa metadata vào metric labels.**
  - Mitigation: cấm thay `app-metrics.ts` labelNames; review trước merge.
- **Risk 4: seq_no reset sau reboot gây hiểu nhầm dedup downstream.**
  - Mitigation: luôn gửi kèm `boot_id`; downstream nếu cần dedup dùng `(boot_id, seq_no)`.

## TODO checklist
- [ ] Firmware payload có `metadata` cho rawdata/status/events/firmware.
- [ ] `message_id`, `boot_id`, `seq_no`, `sent_at` được sinh ổn định, nhẹ.
- [ ] Backend realtime giữ và phát tiếp metadata (optional).
- [ ] Không thay đổi metric labels gây tăng cardinality.
- [ ] Build/typecheck/test firmware + bridge + backend pass.
- [ ] E2E smoke test có/không có metadata đều pass.

## Unresolved questions
- `message_id` bắt buộc UUID v4 chuẩn tuyệt đối, hay chấp nhận UUID-like + nới validator bridge?
- Có cần propagate metadata tiếp ra REST history API, hay chỉ realtime là đủ scope hiện tại?
