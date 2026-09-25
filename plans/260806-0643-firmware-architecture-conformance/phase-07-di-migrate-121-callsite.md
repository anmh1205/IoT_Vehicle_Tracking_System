# Phase 07 — P1 DI Migrate: đảo 121 call-site adapter trong app-core

**Status:** pending | **Priority:** P1 | **Effort:** 24h | **Depends:** phase 06

## Context links

- Audit mục #9, #14: `plans/reports/audit-260806-0643-firmware-vs-vault-standard.md`
- Chuẩn vault: researcher-01 §2 (truyền `const tracker_runtime_ports_t *` qua tham số hàm, không global/setter), §3 (domain data-only), §6 A1-A4 (cấm FSM include adapter)
- Scout-01 B5-B9, C10 (121 call-site): `scout/scout-01-dependency-di-map.md`
- Chữ ký port: phase 06 (ĐÃ CHỐT)

## Overview

Đảo **121 call-site** adapter trong app-core (`app-core/src/*`) sang gọi qua port. Thứ tự tăng độ khó (số call-site): `state_publish_pipeline.c` (5) → `state_ota_runtime.c` (7) → `state_obd_runtime.c` (16) → `state_sleep_controller.c` (18) → `state_machine_core.c` (29) → `state_wake_prelude.c` (46). Bootstrap (12 call-site) giữ — đó là wiring hợp lệ.

**Nguyên tắc vault:** truyền `const tracker_runtime_ports_t *ports` qua THAM SỐ HÀM — không global, không setter. Vault dừng ở `fsm_init(&ports)`; vault KHÔNG nói ports xuống module con `state_*.c` như thế nào → **quyết định độc lập** (researcher-01 unresolved #2): truyền `const tracker_runtime_ports_t *` làm tham số cho từng hàm entry của module con (đúng tinh thần vault).

**Domain vi phạm (3 domain) port-hoá bằng inversion:**
- `domain-connectivity` → `config_store` port (command_handler dùng `nvs_config_save`). **NGOẠI LỆ thực dụng giữ** (session_mgr I/O NVS+MQTT — vault 10:1786 mô tả ngoại lệ này): command_handler nhận `const config_store_port_t *` qua tham số, KHÔNG include adapter trực tiếp.
- `domain-storage` → `mqtt_transport` + `storage_queue` port (offline_queue dùng tracker_mqtt_* + sd_log_store_*). Adapter-mqtt implement port; sd_log_store qua storage_queue port.
- `domain-ota` → đã xử lý phase 04 (move transport). Policy thuần còn lại nhận `ota_download_port_t` từ app-core khi cần.

## Key Insights

- **Mỗi module con 1 bước**: bắt đầu module ít call-site nhất (publish_pipeline 5) để học pattern, rồi tăng dần. Mỗi bước build + verify.
- **Bootstrap là nơi duy nhất gọi adapter trực tiếp** (wiring): tạo wrapper `static` cho từng port function (đã có 9 wrapper ở bootstrap:75-164), gán vào `s_runtime_ports`. Các module con chỉ nhận `const tracker_runtime_ports_t *`.
- **`state_runtime_context.h` (~70 global extern)** — không nhét ports vào đây (scout-01 B9 khuyến nghị struct mới `tracker_runtime_t`). Với phạm vi 24h, phương án KISS: các module con đã nhận ports qua tham số; các global `s_*` còn lại (trạng thái FSM) giữ nguyên như hiện tại — KHÔNG tạo struct context mới trừ khi bắt buộc (YAGNI).
- **Bootstrap gọi thẳng `nvs_config_init/load` (302-310)** → đổi sang `s_runtime_ports.config_store->init/load` (sửa mục audit #9).
- **`imu_runtime_enabled`** là hàm app-core (KHÔNG phải adapter) — không đổi. `ble_mac` là field của `g_rtc_context` — không đổi (scout-01 C10 cảnh báo đếm).
- Sau migrate: app-core CMake REQUIRES bỏ 5 adapter (giữ `platform-board`, `platform-hal`). Vì bootstrap vẫn nằm chung app-core và include adapter để wiring — CMake vẫn cần adapter để BUILD. → **Giữ REQUIRES adapter ở app-core** (vault 12:1745: app-core là exception được REQUIRES mọi adapter), nhưng các `state_*.c` KHÔNG còn include adapter header → include-level audit sạch. Ghi rõ giới hạn này.

## Requirements

- **Functional:** app-core + domain gọi qua port; `state_*.c` không còn `#include` adapter.
- **Non-functional:** Build pass sau MỖI bước con; hành vi tương đương.
- **Non-goal:** Tạo struct context mới, setter global port, thay đổi state machine logic.

## Architecture

```
bootstrap (app_core_bootstrap_run)
  ├── s_runtime_ports (static const, 11 port, wrapper gọi adapter)
  ├── validate 100%
  └── state_machine_init(&config, &s_runtime_ports)   ← ports qua tham số

state_machine.c facade → state_machine_core_run(state, &s_runtime_ports)
  └── mỗi module con nhận ports qua tham số:
      state_publish_pipeline(ports, ...)
      state_ota_runtime(ports, ...)
      state_obd_runtime(ports, ...)
      state_sleep_controller(ports, ...)
      state_wake_prelude(ports, ...)
```

## Related code files

- **Sửa (wiring):** `app-core/src/tracker-app-bootstrap.c` (thêm wrapper 3 port mới + field thiếu; đổi nvs_config_init/load → config_store port)
- **Sửa (migrate, theo thứ tự):** `app-core/src/state_publish_pipeline.c` (5) → `state_ota_runtime.c` (7) → `state_obd_runtime.c` (16) → `state_sleep_controller.c` (18) → `state_machine_core.c` (29) → `state_wake_prelude.c` (46)
- **Sửa header:** `app-core/include/state_*.h` (thêm tham số `const tracker_runtime_ports_t *ports`)
- **Sửa domain:** `domain-connectivity/src/command_handler.c` (nhận config_store port), `domain-storage/src/offline_queue.c` (nhận mqtt/storage port)
- **Sửa CMake:** `app-core/CMakeLists.txt` (bỏ adapter nếu không còn include — xem Key Insights: GIỮ REQUIRES vì bootstrap wiring; gỡ các REQUIRES domain nếu hết dùng), 3 domain CMake (gỡ adapter REQUIRES, thêm platform-hal hoặc contracts)

## Implementation Steps

1. **Bootstrap**: bổ sung wrapper cho 3 port mới (gnss, imu, adc) + field thiếu; đổi `nvs_config_init/load` → `s_runtime_ports.config_store->init/load` (302-310). Build.
2. **Facade**: `state_machine_init`/`state_machine_core_run`/`state_machine_run` nhận thêm `const tracker_runtime_ports_t *ports`; truyền xuống module con. Build.
3. **publish_pipeline (5)**: `tracker_mqtt_*` → `ports->mqtt->...`; `offline_queue_*` → `ports->storage_queue->...`. Build.
4. **ota_runtime (7)**: `nvs_config_{save,load,clear}_ota_context` → `ports->config_store->...`; `util_ota_apply_update`/`manual_rollback` → `ports->ota_download->...`. Build.
5. **obd_runtime (16)**: `ble_obd_*` → `ports->obd_reader->...`; `s_ble_ctx` dùng `void *` từ port connect (đã opaque từ phase 06). Build.
6. **sleep_controller (18)**: `modem_lte_*`/`power_mgr` → `ports->modem`/`ports->power_control`; `modem_gnss_*` → `ports->gnss`; `ble_stack_deinit` → `ports->obd_reader->stack_deinit`. Build.
7. **machine_core (29)**: `rtc_ds3231m_*` → `ports->rtc_clock`; `nvs_config_{save,load,clear}_session_context` → `ports->config_store`; `adc_*` → `ports->adc`; `imu_*` → `ports->imu`; `modem_lte_*` → `ports->modem`. Build.
8. **wake_prelude (46)**: toàn bộ adapter còn lại → port tương ứng (gnss, obd, rtc, modem, adc, imu, mqtt). Đây là module lớn nhất — chia sub-step theo từng nhóm adapter, build sau mỗi nhóm. Build.
9. **Domain inversion**:
   - `command_handler.c`: thay `nvs_config_save` (chỉ 1 call) bằng `config_store_port_t` (nhận qua tham số `command_handler_init(config, ports)`).
   - `offline_queue.c`: `tracker_mqtt_*` (29 call) → `mqtt_transport_port_t`; `sd_log_store_*` (29 call) → storage_queue port (hoặc để adapter implement sẵn trong port storage_queue). Build.
10. **CMake cleanup**: gỡ `adapter-*` khỏi REQUIRES của 3 domain; app-core GIỮ adapter REQUIRES (bootstrap wiring, vault 12:1745 exception). Build.
11. **Include audit**: `grep -rn "#include \"adapter\|#include \"ble_obd\|#include \"modem_at\|#include \"mqtt_client\|#include \"nvs_config\|#include \"sd_log_store"` trong `app-core/src/state_*.c` + `domain-*/src/*.c` → 0 kết quả.
12. Build lần cuối + smoke test (nếu board): khởi động, telemetry publish, sleep/wake.

## Todo list

- [ ] Bootstrap: thêm wrapper 3 port + nvs qua config_store
- [ ] Facade nhận ports qua tham số
- [ ] publish_pipeline (5)
- [ ] ota_runtime (7)
- [ ] obd_runtime (16)
- [ ] sleep_controller (18)
- [ ] machine_core (29)
- [ ] wake_prelude (46)
- [ ] Domain: command_handler config_store port
- [ ] Domain: offline_queue mqtt/storage port
- [ ] CMake cleanup 3 domain
- [ ] Include audit = 0 adapter header trong app-core state_*.c + domain
- [ ] Build pass (từng bước)

## Success Criteria

- [ ] Build pass sau MỖI bước con.
- [ ] Grep: 0 `#include` adapter trong `app-core/src/state_*.c` và `domain-*/src/*.c`.
- [ ] Bootstrap gọi qua `s_runtime_ports.config_store` (không gọi thẳng nvs_config_init/load).
- [ ] Ports truyền qua tham số hàm; không global port, không setter.
- [ ] Hành vi tương đương (telemetry, OBD, GNSS, sleep/wake).

## Risk & Rollback

- **Risk cao nhất:** wake_prelude (46) — nhiều adapter, nhiều nhánh. Giảm: sub-step theo nhóm adapter, build sau mỗi nhóm; nếu vỡ 1 nhóm, revert nhóm đó.
- **Risk:** Đổi chữ ký `state_machine_init`/`core_run` lan rộng — làm trước ở bước 2, build ngay.
- **Risk:** Domain inversion (offline_queue 29 call mqtt + 29 sd_log_store) — làm sau cùng khi pattern port đã chín; nếu phức tạp, tách thành phase riêng.
- **Rollback:** Mỗi module là 1 commit — revert module lỗi; ports đã chốt ở phase 06 không đổi.

## Security Considerations

- Giảm bề mặt: app-core không include adapter → type adapter không rò rỉ; hạn chế truy cập trực tiếp I/O.
- Ngoại lệ domain-connectivity (I/O NVS) — ghi rõ có chủ đích, audit sau không báo nhầm.

## Next steps

- Phase 08 (god function) — code đã đi qua port, tách hàm an toàn hơn.