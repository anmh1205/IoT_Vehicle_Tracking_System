# Phase 08 — P2 God Function: tách 5 hàm >150 dòng

**Status:** pending | **Priority:** P2 | **Effort:** 12h | **Depends:** phase 07

## Context links

- Audit mục #15-19: `plans/reports/audit-260806-0643-firmware-vs-vault-standard.md`
- Quyết định user #3: chỉ tách hàm >150 dòng (KHÔNG ép mọi file <200). 5 hàm cần tách, đặc biệt `refresh_telemetry` (232).

## Overview

Tách 5 hàm vượt >150 dòng, giữ logic nguyên vẹn. Làm sau phase 07 (code đã đi qua port, hàm có tham số rõ ràng nên dễ tách an toàn):

| # | Hàm | Vị trí | Số dòng | Ghi chú |
|---|---|---|---|---|
| 1 | `state_machine_refresh_telemetry` | `state_wake_prelude.c:259-498` | ~239 | Lớn nhất — tách theo nhóm (OBD block, GNSS block, ignition-debounce block) |
| 2 | `app_core_bootstrap_run` | `tracker-app-bootstrap.c:293-490` | ~188 | Tách init-config / retry-loop / wake-deduction |
| 3 | `data_formatter_add_diagnostics` | `contracts-device-cloud/src/data_formatter.c:386-556` | ~170 | Tách theo nhóm diagnostics |
| 4 | `imu_init` | `platform-board-esp32s3/src/imu_lis3dsh.c:288-~445` | ~157 | Tách register-config / motion-config / reset |
| 5 | `modem_gnss_get_location` | `adapter-modem-sim7600-at/src/modem_gnss.c:822-~976` | ~154 | Tách parse / no-fix-recover |

## Key Insights

- Chỉ tách hàm (split helper `static`), KHÔNG đổi hành vi, KHÔNG đổi contract.
- Mỗi block con thành `static` function riêng, nhận đúng tham số cần (không phụ thuộc biến cục bộ ngoài phạm vi).
- Sau khi tách, hàm chính chỉ còn là "orchestrator" gọi các helper → dễ đọc, dễ test.
- Đây là PHASE CUỐI cùng god function — cần cẩn trọng để không phá state machine FSM đang chạy.
- **Tích hợp N3 (scout-02, P1):** khi tách `app_core_bootstrap_run`, guard `:317-327` đang gọi `app_config_set_defaults` (xoá sạch NVS) khi device_id/auth_token rỗng → đổi sang **field-level fallback** (chỉ set các field thiếu, KHÔNG reset toàn bộ config). Đây là điểm tự nhiên để sửa vì đang chia hàm khối init-config.

## Requirements

- **Functional:** 5 hàm được tách thành nhiều hàm `static`; hành vi giữ nguyên.
- **Non-functional:** Build pass; không thay đổi tham số/trả về.
- **Non-goal:** Tách các file <200 dòng còn lại; đổi logic.

## Architecture

Giữ nguyên cấu trúc module. Mỗi hàm → 1 hoặc nhiều helper `static` cùng file. Các helper đặt phraseoán trên hàm chính hoặc dưới, tầm phạm vi file.

## Related code files

- `app-core/src/state_wake_prelude.c` (#1)
- `app-core/src/tracker-app-bootstrap.c` (#2)
- `contracts-device-cloud/src/data_formatter.c` (#3)
- `platform-board-esp32s3/src/imu_lis3dsh.c` (#4) — note: tên file thật `imu_lis3dsh.c` (đối chiếu grep trước)
- `adapter-modem-sim7600-at/src/modem_gnss.c` (#5)

## Implementation Steps

1. **#1 `refresh_telemetry`** — tách theo nhóm:
   - `state_machine_refresh_adc_imu()` — phần ADC/IMU (261-267)
   - `state_machine_sample_obd(now_ms)` — khối OBD (270-311)
   - `state_machine_sample_gnss(now_ms, ports)` — khối GNSS (313-332)
   - `state_machine_update_ignition_sources(now_ms)` — khối ignition/debounce (334-...)
   Hàm chính còn ~10 dòng gọi các helper. Build.
2. **#2 `app_core_bootstrap_run`** — tách:
   - `bootstrap_load_config()` (nvs init/load + defaults + field validation — **kèm N3: field-level fallback thay `app_config_set_defaults`**)
   - `bootstrap_deduce_wake_state(wakeup, config)`
   - `bootstrap_retry_loop(config, ports)`
   Hàm chính giữ thứ tự. Build.
3. **#3 `data_formatter_add_diagnostics`** — tách theo nhóm field (diag động cơ, diag battery, diag gnss, diag ble...). Build.
4. **#4 `imu_init`** — tách `imu_configure_pins()`, `imu_configure_interrupts()`, `imu_setup_defaults()`. Build.
5. **#5 `modem_gnss_get_location`** — tách `modem_gnss_try_recover_no_fix(now)`, `modem_gnss_query_and_decode(now, data)`. Build.
6. Build tổng + (nếu board) smoke test.

## Todo list

- [ ] Tách refresh_imu (8 helper)
- [ ] Tách app_core_bootstrap_run (3 helper, kèm N3 field-level fallback)
- [ ] Tách data_formatter_add_diagnostics (4+ helper)
- [ ] Tách imu_init (3 helper)
- [ ] Tách modem_gnss_get_location (2 helper)
- [ ] Build pass (từng hàm)
- [ ] N3: không còn `app_config_set_defaults` xoá sạch NVS trong guard (kiểm)

## Success Criteria

- [ ] Build pass.
- [ ] 5 hàm chính giảm xuống <150 dòng, là orchestrator ngắn.
- [ ] Hành vi giữ nguyên (không đổi logic, không đổi tham số).
- [ ] Không có hàm mới nào >150 dòng.

## Risk & Rollback

- **Risk:** Tách hàm làm vỡ trạng thái tĩnh (static var cục bộ) — giữ các `static` biến trong phạm vi đúng.
- **Risk:** Hàm helper truy cập biến cục bộ của function chính → phải truyền qua tham số.
- **Rollback:** 05 hàm là 5 commit tách biệt — revert hàm lỗi.

## Security Considerations

- Không liên quan bảo mật (refactor thuần).

## Next steps

- Phase 09 (naming + cleanup) — rename file đụng CMake + include, làm cuối.