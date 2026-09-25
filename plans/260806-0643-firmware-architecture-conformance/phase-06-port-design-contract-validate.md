# Phase 06 — P1 Port Design: chốt chữ ký, +3 port, move type, siết validate

**Status:** pending | **Priority:** P1 | **Effort:** 8h | **Depends:** — (TRƯỚC phase 07)

## Context links

- Audit mục #9, #10, #11, #12, #13: `plans/reports/audit-260806-0643-firmware-vs-vault-standard.md`
- Chuẩn vault: researcher-01 §1 (registry 8 ptr const), §2 (truyền qua tham số), §6 A5-A8 (const, validate)
- Scout-01 B5-B9, C11: `scout/scout-01-dependency-di-map.md`
- Quyết định user #2: DI thuần toàn bộ; port instance static const; truyền `const tracker_runtime_ports_t *` qua THAM SỐ HÀM.

## Overview

Chốt thiết kế port (KHÔNG migrate code — phase 07 làm). Vault MÂU THUẪN nội bộ 6/8 port (researcher-01 §1) → **chốt độc lập** dựa trên header hiện tại + nhu cầu thật. Công việc:

1. **Move 2 type persist xuống contracts** TRƯỚC (bắt buộc): `ota_persist_context_t` / `session_persist_context_t` do adapter-kv-nvs định nghĩa (`nvs_config.h:50,69`) nhưng app-core dùng trực tiếp (`state_machine_core.c:629,662`; `state_ota_runtime.c:32,89`). Nếu không move, port config_store sẽ phụ thuộc adapter header (cấm).
2. **Chốt chữ ký 8 port hiện có + 3 port mới** (gnss, imu, adc). Hiện 38 field → thêm ~35 field.
3. **Siết validate**: từ 18/38 → 100% field.
4. **Opaque hoá `ble_obd_ctx_t`**: `state_runtime_context.h:10` include `ble_obd.h` vì `extern ble_obd_ctx_t *s_ble_ctx` → thay bằng `void *` + forward declaration. Xoá ~70 global extern dần (phase 07).

## Key Insights

- **Bảng chữ ký port (chốt độc lập, kế thừa header hiện tại `tracker-runtime-ports.h`)**: giữ nguyên chữ ký các port đã hoạt động (không phá): modem_transport (6), mqtt_transport (8), storage_queue (3), ota_download (2), config_store (3), rtc_clock (4), obd_reader (7), power_control (5). Vault mâu thuẫn KHÔNG áp dụng (chốt theo code đang chạy).
- **3 port MỚI** (scout-01 C11 — hàm đang gọi nhưng chưa có field):
  - `gnss_transport_port_t`: `power_on`, `power_off`, `warm`, `get_location(gnss_data_t*)`, `is_query_ready` (~5 fn, ISP hợp lệ).
  - `imu_port_t`: `init`, `configure_motion_interrupt`, `motion_detected`, `clear_motion_interrupt`, `get_peak_accel_delta_mps2`, `reset_accel_delta_window`, `is_available` (~7 fn).
  - `adc_port_t`: `init`, `read_vehicle_battery_voltage`, `read_device_battery_voltage` (~3 fn).
- **Thiếu field cần bổ sung vào port hiện có** (scout-01 C11): modem `disconnect`/`is_at_ready`/`tick`; mqtt `*_topic` getter; storage_queue `set_online`/`set_session`/`stop_session`/`depth`/`should_throttle_rawdata`; rtc `is_available`/`is_time_valid_ms`; obd `set_preferred_address`/`get_peer_address_string`/`stack_deinit`/`addr_to_str`/`addr_from_str`; config_store persist context `save,load,clear}_ota_context` + `save,load,clear}_session_context`.
- **Port count**: 8 → 11 port struct. Registry vẫn con trỏ `const`.
- **Opaque handle**: `ble_obd_ctx_t` → `void *ctx` (đổi signature port obd_reader — hiện đã dùng `void *ctx`! chỉ là `s_ble_ctx` extern kiểu `ble_obd_ctx_t *` trong state_runtime_context.h). Thay `extern ble_obd_ctx_t *s_ble_ctx;` bằng `extern void *s_ble_ctx;` (hoặc tốt hơn: xoá hẳn khỏi header, đưa vào file-static của state_obd_runtime.c — phase 07).

## Requirements

- **Functional:** Registry đủ 11 port, validate 100%, type persist ở contracts, `s_ble_ctx` opaque.
- **Non-functional:** KHÔNG đổi hành vi; KHÔNG migrate call-site (phase 07). Build pass sau mỗi bước con.
- **Non-goal:** Đổi chữ ký port đang hoạt động (tránh phá code đang chạy).

## Architecture

```
contracts-device-cloud/include/
  └── persist_context_types.h     (MỚI: ota_persist_context_t, session_persist_context_t)

platform-hal-esp-idf/include/tracker-runtime-ports.h
  ├── 8 port hiện có (giữ chữ ký)
  ├── +3 port mới (gnss, imu, adc)
  ├── tracker_runtime_ports_t: 11 con trỏ const
  └── validate() → đủ field
```

## Related code files

- **Move type:** `adapter-kv-nvs/include/nvs_config.h:50,69` → `contracts-device-cloud/include/persist_context_types.h`
- **Sửa:** `platform-hal-esp-idf/include/tracker-runtime-ports.h` (thêm 3 port + field thiếu, 11 ptr)
- **Sửa:** `platform-hal-esp-idf/src/tracker-runtime-ports.c` (validate 100%)
- **Sửa:** `app-core/include/state_runtime_context.h:10,125` (xoá include ble_obd.h, `s_ble_ctx` → void* hoặc file-static)
- **Sửa:** `adapter-kv-nvs/include/nvs_config.h` (include persist_context_types thay vì định nghĩa)

## Implementation Steps

1. **Move 2 type persist**: tạo `contracts-device-cloud/include/persist_context_types.h` chứa `ota_persist_context_t`, `session_persist_context_t`; `nvs_config.h` include file này + xoá định nghĩa cũ; contracts REQUIRES shared-kernel (đã có). Sửa các file app-core dùng type (state_machine_core.c, state_ota_runtime.c) include header mới.
2. **Build verify** (sau move type, trước khi đụng port).
3. **Thêm 3 port mới** vào `tracker-runtime-ports.h` (struct `gnss_transport_port_t`, `imu_port_t`, `adc_port_t`).
4. **Bổ sung field thiếu** cho port hiện có theo scout-01 C11 (modem/mqtt/storage_queue/rtc/obd/config_store).
5. **Registry**: `tracker_runtime_ports_t` đổi từ 8 → 11 con trỏ `const`.
6. **Siết validate**: `tracker_runtime_ports_validate` loop qua TẤT CẢ field (không chỉ 18/38) — null-check từng hàm pointer; trả `ESP_ERR_INVALID_ARG` kèm tên field thiếu (log).
7. **Opaque `s_ble_ctx`**: `state_runtime_context.h` bỏ `#include "ble_obd.h"`; `extern ble_obd_ctx_t *s_ble_ctx;` → `extern void *s_ble_ctx;` (tạm), hoặc xoá khỏi header + khai báo static trong state_obd_runtime.c (phase 07 sẽ hoàn tất). Kiểm các file include state_runtime_context.h không còn phụ thuộc ble_obd type.
8. **Đổi tên `mqtt_client.h`** (trùng esp-mqtt): rename → `tracker_mqtt_client.h` + sửa mọi include (adapter-mqtt + offline_queue.c:10). (Có thể để riêng nếu muốn — ghi note; quyết định: đổi.)
9. Build:
   ```
   cd iot-vehicle-tracking-system-firmware
   idf.py build
   ```

## Todo list

- [ ] Move 2 type persist → contracts (build verify ngay)
- [ ] Thêm 3 port mới (gnss, imu, adc)
- [ ] Bổ sung field thiếu (modem/mqtt/storage/rtc/obd/config_store)
- [ ] Registry 11 ptr const
- [ ] Validate 100% field
- [ ] Opaque s_ble_ctx (bỏ include ble_obd.h)
- [ ] Đổi tên mqtt_client.h
- [ ] Build pass

## Success Criteria

- [ ] Build pass.
- [ ] `nvs_config.h` không còn định nghĩa 2 type persist (chỉ include contracts).
- [ ] `state_runtime_context.h` không còn include adapter `ble_obd.h`.
- [ ] `tracker_runtime_ports_validate` kiểm 100% field (đếm lại).
- [ ] Registry đủ 11 port; port instance sẽ `static const` (phase 07 khi wiring).

## Risk & Rollback

- **Risk:** Bổ sung field thiếu vào port hiện có làm vỡ struct literal trong bootstrap (thiếu field → build fail). Giảm: thêm field theo thứ tự, build sau mỗi port.
- **Risk:** Move type persist đụng include path app-core — build verify ngay bước 2.
- **Risk:** Đổi tên mqtt_client.h ảnh hưởng nhiều file — tách riêng commit, build riêng.
- **Rollback:** Mỗi bước là atomic — revert commit tương ứng.

## Security Considerations

- `s_ble_ctx` opaque → type adapter không rò rỉ qua header trung tâm; giảm bề mặt include adapter lan truyền.

## Next steps

- Phase 07 (DI migrate) bắt đầu — dùng chữ ký port ĐÃ CHỐT ở phase này.