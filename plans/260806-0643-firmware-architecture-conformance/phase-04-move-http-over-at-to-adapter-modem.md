# Phase 04 — P1 Move HTTP-over-AT domain-ota → adapter-modem

**Status:** pending | **Priority:** P1 | **Effort:** 6h | **Depends:** —

## Context links

- Audit mục #6, #30: `plans/reports/audit-260806-0643-firmware-vs-vault-standard.md`
- Scout-01 A1 (`domain-ota/src/util_ota_http.c:10`, `util_ota_update.c:14` → `modem_at.h`)
- Quyết định user #5: move HTTP-over-AT sang `adapter-modem-sim7600-at`; domain-ota chỉ giữ policy thuần. Bề mặt công khai domain-ota giữ 2 hàm `util_ota_apply_update`, `util_ota_trigger_manual_rollback` (ĐÃ có trong `ota_download_port_t`) → app-core không đổi.

## Overview

`domain-ota` hiện chứa logic HTTP-over-AT (adapter concern) dùng `modem_at.h`:

- `util_ota_http.c` (507 dòng, **10 chuỗi AT**: AT+CSSLCFG ×4, AT+HTTPPARA, AT+HTTPINIT, AT+HTTPACTION, AT+HTTPREAD, AT+HTTPTERM…) — chứa `modem_at_send_expect` ×7, `modem_at_register_urc:242`, `modem_at_poll_urc:276`.
- `util_ota_update.c` (973 dòng, **22 chuỗi AT** gồm `AT+CSSLCFG`, `AT+HTTPACTION`) — `modem_at_send_expect` ×7, `modem_at_send_collect:491`.
- `util_ota_rollback.c` (69 dòng) — KHÔNG dùng AT, là policy thuần → **GIỮ NGUYÊN ở domain-ota**.

CMake hiện: `domain-ota` REQUIRES `adapter-modem-sim7600-at` + `domain-telemetry` + `mbedtls` + `app_update`. Sau move: bỏ adapter-modem, bỏ domain-telemetry (nếu hết counters — phase 03 đã xử lý), giữ mbedtls nếu còn dùng, giữ app_update.

**Đã làm một phần qua diff (giữ):** `util_ota_http.c` đã thêm `ESP_RETURN_ON_FALSE` truncation check cho snprintf (410-489).

## Key Insights

- Chia tách theo ranh giới thật: **adapter = biết modem/AT/UART/TLS-over-AT**; **domain = policy OTA (khi nào update, rollback, version check)**. Phần HTTP-over-AT là transport thuần của adapter.
- `util_ota_update.c` trộn lẫn policy + transport → khi move, chỉ tách phần AT ra, giữ policy ở domain. **KHÔNG move nguyên file** nếu policy (version check, command parse) thuộc domain.
- Bề mặt công khai `ota_download_port_t` (apply_update, manual_rollback) đã là cầu nối app-core → adapter; app-core không đổi.
- Kiểm chứng quan trọng: **grep toàn domain-ota sau move phải 0 chuỗi `AT+`**, và không còn include `modem_at.h`.

## Requirements

- **Functional:** OTA download/apply/rollback hoạt động y hệt.
- **Non-functional:** `domain-ota` không còn include adapter; 0 chuỗi AT trong domain-ota; build pass.
- **Non-goal:** Thay đổi API `util_ota_apply_update`/`util_ota_trigger_manual_rollback`.

## Architecture

```
domain-ota (policy thuần)
  ├── util_ota_rollback.c            (giữ)
  ├── util_ota_update.c (PHẦN policy) (giữ — tách phần AT)
  └── ota_policy/*                   (không đổi)

adapter-modem-sim7600-at (transport HTTP-over-AT)
  ├── src/util_ota_http.c            (move nguyên)
  └── src/util_ota_http_transport.*  (MỚI — phần AT tách từ util_ota_update.c)
```

- `util_ota_http.c` move nguyên sang adapter-modem.
- Phần AT trong `util_ota_update.c` (tách theo ranh giới transport: `AT+CSSLCFG`, `AT+HTTPPARA`, `AT+HTTPACTION`, `AT+HTTPREAD`, `AT+HTTPTERM`, download URL/port) → adapter-modem.
- domain-ota giữ: parse command, so version, quyết định update/rollback, gọi transport qua hàm do adapter expose.

## Related code files

- **Move:** `domain-ota/src/util_ota_http.c` → `adapter-modem-sim7600-at/src/util_ota_http.c`
- **Sửa:** `adapter-modem-sim7600-at/include/` (thêm header công khai cho transport hàm — nếu `util_ota_http.h` hiện ở domain-ota/include thì move kèm)
- **Sửa:** `domain-ota/src/util_ota_update.c` (tách phần AT; giữ policy)
- **Sửa CMake:** `domain-ota/CMakeLists.txt` (gỡ `adapter-modem-sim7600-at`, `domain-telemetry` nếu hết dùng), `adapter-modem-sim7600-at/CMakeLists.txt` (thêm SRCS + REQUIRES `app_update`/`mbedtls` nếu cần)
- **Tham chiếu:** `ota_download_port_t` trong `platform-hal-esp-idf/include/tracker-runtime-ports.h` (bề mặt app-core → adapter, KHÔNG đổi)

## Implementation Steps

1. `git mv util_ota_http.c` + header sang adapter-modem. Cập nhật `#include "ota_contract.h"` path nếu adapter không expose sẵn contracts (adapter-modem đã REQUIRES contracts? — kiểm; nếu không, thêm `contracts-device-cloud` vào REQUIRES).
2. Trong `util_ota_update.c`, liệt kê mọi hàm/cuộc gọi AT (`modem_at_*`) → tách thành module transport mới (vd `ota_http_transport.c`) trong adapter-modem, expose hàm như `ota_http_download(url, ...)`, `ota_http_set_tls(...)`.
3. domain-ota chỉ giữ: gọi hàm transport adapter (include header mới), quyết định update/rollback.
4. Sửa CMake domain-ota: bỏ `adapter-modem-sim7600-at`; giữ `app_update` (policy cần esp_ota), `mbedtls` (nếu còn), `contracts-device-cloud`, `log`, `shared-kernel`. Sửa CMake adapter-modem: thêm SRCS mới, REQUIRES `app_update` (để flash), `mbedtls`, `contracts-device-cloud`.
5. Grep verify: trong `domain-ota/` → `grep -rn "modem_at\|AT+HTTP\|AT+CSSLCFG"` = 0 kết quả.
6. Build:
   ```
   cd iot-vehicle-tracking-system-firmware
   idf.py build
   ```
7. Verify: app-core vẫn gọi `ota_download->apply_update` (không đổi), OTA path build không vỡ.

## Todo list

- [ ] git mv util_ota_http sang adapter-modem
- [ ] Tách phần AT khỏi util_ota_update.c → adapter-modem
- [ ] domain-ota giữ policy thuần
- [ ] Sửa CMake 2 component
- [ ] Grep: 0 chuỗi AT / 0 include modem_at trong domain-ota
- [ ] Build pass

## Success Criteria

- [ ] Build pass.
- [ ] `domain-ota` không còn REQUIRES `adapter-modem-sim7600-at`; không còn `modem_at.h` include.
- [ ] `util_ota_http.c` nằm ở adapter-modem; phần AT từ `util_ota_update.c` đã tách.
- [ ] `ota_download_port_t` bề mặt không đổi → app-core không đổi.

## Risk & Rollback

- **Risk cao nhất:** Tách AT khỏi `util_ota_update.c` làm hỏng luồng download (state machine OTA). Giảm: giữ nguyên toàn bộ logic `util_ota_update.c`, chỉ DI CHUYỂN file/hàm, không viết lại; build + (nếu có board) smoke test OTA.
- **Risk:** mbedtls/app_update REQUIRES thiếu ở adapter-modem → build fail, sửa CMake.
- **Rollback:** `git mv` ngược + revert CMake — đây là move file, rollback sạch.

## Security Considerations

- TLS: `AT+CSSLCFG` authmode vẫn theo `CONFIG_TRACKER_TLS_VERIFY_SERVER` — không thay đổi chính sách, chỉ đổi vị trí code.

## Next steps

- Phase 05 (GNSS) độc lập; Phase 06 (port design) độc lập — song song OK.