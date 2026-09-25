# Phase 02 — P0 Logic Bug: timestamp fake-fresh + GNSS verify (gated hardware)

**Status:** pending | **Priority:** P0 | **Effort:** 5h (3h code + 2h hardware gated) | **Depends:** —

## Context links

- Audit mục #2, #3, #4: `plans/reports/audit-260806-0643-firmware-vs-vault-standard.md`
- Researcher-02 §5 (speed knots risk), §7 (hardware verify list): `research/researcher-02-sim7600-gnss-at-standard.md`

## Overview

Hai việc:

1. **Bug logic (P0, làm ngay):** `state_machine_refresh_telemetry` (`state_wake_prelude.c:334-336`) gán `s_telemetry.gnss.timestamp_ms = now_ms` khi `==0` — bất kể fix có hợp lệ hay không. Nhánh else của GNSS poll đã clear `fix_valid=false; timestamp_ms=0` (dòng 324-325, ĐÃ SỬA qua diff), nhưng dòng 334 sau đó gán timestamp = now_ms → một fix không hợp lệ trông như dữ liệu mới.

2. **GNSS hardware verify (gated — cần board, KHÔNG chặn merge):** xác minh `speed_kmh = atof(fields[7]) * 1.852f` (giả định knots, `modem_gnss.c:474`) và ngưỡng `MODEM_GNSS_NO_FIX_RECOVER_THRESHOLD=10` (`modem_gnss.c:40`) có cắt ngang cold TTFF 30-120s không. Nếu speed lệch 1.852x → bỏ hệ số nhân.

**Đã làm một phần qua diff (giữ, không redo):** nhánh else clear fix_valid+timestamp (324-325), `modem_gnss_safe_atof/atoi`, `s_gnss_mutex`, soft retry 2.

## Phát hiện MỚI từ scout-02 (tích hợp vào phase này)

**N1 (P0 — CHẶN MERGE, vai trò deadlock):** `#define GNSS_LOCK()` (`modem_gnss.c:88`) — mutex KHÔNG đệ quy, `xSemaphoreTake(..., portMAX_DELAY)`. 3 đường tự khoá:
- A: `get_location`:825 LOCK → `try_self_heal`:905 → `power_off`:603 → `:775` LOCK lại
- B: `get_location`:825 LOCK → `try_no_fix_recover`:828 → `power_on`:635 → `:675` LOCK lại
- C: `get_location`:825 LOCK → `try_no_fix_recover`:962 → `power_off`:655 → `:775` LOCK lại

**Mutex KHÔNG cần thiết** — toàn bộ caller nằm trong 1 task FSM (`sleep_controller.c:408`, `wake_prelude.c:55,56,91,113,134,319`). → **XOÁ hẳn GNSS_LOCK/UNLOCK** (KISS) hoặc recursive + create trong power_on. Đây là bug do diff chưa commit VỪA THÊM VÀO — phải xử lý trong phase 02.

**B (P1 data-integrity):** `data_formatter.c:610` publish `satellites` VÔ ĐIỀU KIỆN (ngoài gate `has_valid_gnss_fix` `:601-603`) + `:426` `satellites_reported` → số vệ tinh CŨ bị rò khi mất fix. Fix: thêm `s_telemetry.gnss.satellites = 0;` vào nhánh else (`state_wake_prelude.c:324-325`), hoặc đưa `:610` vào gate.

**D2 (cần user chốt):** IGN OFF sleep đang **120s** không phải 60s (`core.c:168-174` clamp `heartbeat_interval_s` sdkconfig=900 trong `[MIN=60, PARKED_WAKE_CAP=120]` → 120s). User feedback trước "IGN OFF sleep 60s" — muốn 60s: đặt `heartbeat_interval_s=60` hoặc hạ cap. **Ghi unresolved — không tự sửa.**

**N3 (P1):** guard config `tracker-app-bootstrap.c:317-327` gọi `app_config_set_defaults` khi device_id/auth_token rỗng → XOÁ SẠCH NVS cấu hình hợp lệ khác. Fix sau (phase xử lý bootstrap): field-level fallback thay vì set_defaults toàn bộ. Ghi chú trong phase 08.

## Key Insights

- Dòng 334 phá mục đích của nhánh else: "clear timestamp để không fake-fresh" rồi lại gán now_ms. Chỉ nên gán timestamp khi `fix_valid` thật.
- GNSS speed: quy ước NMEA/CGPSINFO dẫn xuất là knots, nhưng vault không dám khẳng định (researcher-02 §5). Verify rẻ nhất: chạy xe 40-60 km/h, so speed GNSS với speed OBD (dự án đã có `adapter-ble-obd-nimble`).
- Ngưỡng no-fix recovery 10 lần: nếu `get_location` gọi ~1 Hz thì recovery power-cycle sau ~10 s no-fix — nằm TRONG cửa sổ cold TTFF. Cần đo cadence thật trước khi chốt.

## Requirements

- **Functional:** timestamp chỉ tiến khi có fix hợp lệ; 0 giá trị "fake-fresh".
- **Non-functional:** Build pass. Không đổi contract.
- **Gated:** verify speed knots + TTFF trên board; kết quả log vào report.

## Architecture

Không đổi kiến trúc. Sửa cục bộ `state_wake_prelude.c` + điều tra `modem_gnss.c`.

## Related code files

- **Sửa:** `app-core/src/state_wake_prelude.c:334-336`
- **Điều tra (gated, có thể sửa sau khi verify):** `adapter-modem-sim7600-at/src/modem_gnss.c:40,474`

## Implementation Steps

1. `state_wake_prelude.c` — thay block 334-336:
   ```c
   if (s_telemetry.gnss.timestamp_ms == 0 && s_telemetry.gnss.fix_valid) {
       s_telemetry.gnss.timestamp_ms = now_ms;
   }
   ```
   → Chỉ gán khi `fix_valid`; khi không fix giữ `timestamp_ms=0` (dữ liệu "không mới").
2. **N1 (P0 deadlock)**: XOÁ `GNSS_LOCK()/GNSS_UNLOCK()` trong `modem_gnss.c` (88-90 + 9 vị trí gọi). Lý do: 1 task FSM duy nhất gọi, mutex không đệ quy tự khoá (3 đường A/B/C). Kiểm lại toàn file sau xoá không còn macro. Build.
3. **B (P1 leak satellites)**: thêm `s_telemetry.gnss.satellites = 0;` vào nhánh else (state_wake_prelude.c:324-325) — hoặc đưa `data_formatter.c:610` vào gate `has_valid_gnss_fix`. Build.
4. (Gated) Đo cadence thật của `modem_gnss_get_location()` — grep caller, thêm log cadence tạm thời nếu cần, xác định khoảng cách giữa 2 lần query.
5. (Gated) Hardware verify theo danh sách researcher-02 §7 mục 1-6 (AT+CGPS=1, CGPSINFO no-fix field count, CGPSINFO fix field 8 vs OBD speed, CGNSPWR/CGNSINF trả ERROR, CGPS=0 latency, TTFF cold start).
6. Chốt: nếu field 8 là km/h → bỏ `* 1.852f`. Nếu ngưỡng no-fix cắt TTFF → nâng `MODEM_GNSS_NO_FIX_RECOVER_THRESHOLD` hoặc điều chỉnh cửa sổ.
7. **D2**: KHÔNG tự sửa 60s/120s — ghi unresolved, chờ user.
8. Build:
   ```
   cd iot-vehicle-tracking-system-firmware
   idf.py build
   ```

## Todo list

- [ ] Fix dòng 334 chỉ gán timestamp khi fix_valid
- [ ] N1: xoá GNSS_LOCK/UNLOCK (deadlock P0)
- [ ] B: satellites=0 nhánh else (hoặc gate data_formatter.c:610)
- [ ] Build pass
- [ ] (Gated) Đo cadence get_location
- [ ] (Gated) Verify speed knots vs OBD
- [ ] (Gated) Verify CGNSINF/CGNSPWR trả ERROR
- [ ] (Gated) Chốt ngưỡng no-fix recovery
- [ ] Cập nhật report audit mục #3, #4 thành "ĐÃ XÁC MINH"
- [ ] (Chờ user) D2: chốt 60s vs 120s

## Success Criteria

- [ ] Build pass.
- [ ] N1: `GNSS_LOCK/UNLOCK` đã xoá — không còn deadlock tiềm năng (grep `GNSS_LOCK` = 0).
- [ ] `s_telemetry.gnss.timestamp_ms` không bao giờ "fake-fresh" khi `fix_valid=false`.
- [ ] B: `satellites` không bị rò khi mất fix (nhánh else clear hoặc gate data_formatter).
- [ ] (Gated) Kết luận speed knots/ km/h có bằng chứng hardware; ngưỡng no-fix không cắt TTFF hoặc đã điều chỉnh.

## Risk & Rollback

- **Risk:** Bỏ hệ số 1.852 khi chưa verify → tốc độ sai 1.852x ngược chiều. Gated: chỉ sửa sau khi có bằng chứng board.
- **Risk:** Thay đổi ngưỡng no-fix ảnh hưởng recovery → đo trước, đổi sau.
- **Risk (N1):** Xoá GNSS_LOCK có thể lộ race nếu sau này thêm task khác gọi GNSS — hiện chỉ 1 task FSM (KISS); nếu tương lai đa task, thêm mutex theo thread-safe profile mới.
- **Rollback:** Fix dòng 334 là 1 dòng — revert an toàn. Xoá GNSS_LOCK là xoá macro — revert commit.

## Security Considerations

- Không liên quan (không xử lý input biên — `safe_atof` đã lo).

## Next steps

- Phần gated cần board — KHÔNG chặn các phase 03-09. Ghi chú trong report để team nhắc lại khi có hardware.