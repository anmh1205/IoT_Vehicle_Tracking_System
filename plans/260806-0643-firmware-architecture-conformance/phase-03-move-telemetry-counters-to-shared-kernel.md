# Phase 03 — P1 Move `telemetry_counters` → shared-kernel

**Status:** pending | **Priority:** P1 | **Effort:** 2h | **Depends:** —

## Context links

- Audit mục #5: `plans/reports/audit-260806-0643-firmware-vs-vault-standard.md`
- Scout-01 A4 (7 component dùng): `scout/scout-01-dependency-di-map.md`
- Quyết định user #6: move `telemetry_counters` → shared-kernel (fix rẻ nhất, làm đầu)

## Overview

`telemetry_counters.h/.c` hiện ở `domain-telemetry` (`components/domain-telemetry/include/telemetry_counters.h`, `src/telemetry_counters.c`). Được dùng bởi **7 component**: domain-telemetry (32), adapter-storage (15), adapter-modem (15), domain-storage (8), domain-ota (6), app-core (5), adapter-ble (3).

- 2 cạnh **domain↔domain**: domain-ota → telemetry (`inc_ota_http_*`, `util_ota_update.c:320-371`), domain-storage → telemetry (`inc_{replay_success,drop,retry,sd_write_fail}`, `offline_queue.c:466-709`).
- 3 cạnh **adapter→domain** (ngược chiều, sai hướng): adapter-modem, adapter-storage, adapter-ble include domain-telemetry.

Đây là bộ đếm observability write-only (fire-and-forget), không phải business logic domain → đặt ở shared-kernel sẽ xoá đồng thời 5 cạnh sai hướng một lần, không cần port nào.

## Key Insights

- `telemetry_counters` không phụ thuộc domain-telemetry data model — chỉ là bộ đếm (check trước khi move để chắc không include header domain khác).
- Move = di chuyển file + sửa CMake REQUIRES (gỡ domain-telemetry khỏi adapter-modem/storage/ble + domain-ota/storage) + sửa các `#include "telemetry_counters.h"` (path không đổi vì shared-kernel cũng expose include dir).
- Không đổi symbol, không đổi API — build là kiểm chứng chính.

## Requirements

- **Functional:** Bộ đếm hoạt động y hệt, đặt ở shared-kernel.
- **Non-functional:** Xoá 5 cạnh sai hướng; build pass.
- **Non-goal:** Đổi tên/symbol, thêm tính năng.

## Architecture

```
domain-telemetry/src/telemetry_counters.c ──move──> shared-kernel/src/telemetry_counters.c
domain-telemetry/include/telemetry_counters.h ──move──> shared-kernel/include/telemetry_counters.h
```
CMake: thêm 1 SRCS vào `shared-kernel/CMakeLists.txt`; gỡ `domain-telemetry` khỏi REQUIRES của `adapter-modem-sim7600-at`, `adapter-storage-sdmmc-fatfs`, `adapter-ble-obd-nimble`, `domain-ota`, `domain-storage`.

## Related code files

- **Move:** `domain-telemetry/src/telemetry_counters.c` → `shared-kernel/src/`
- **Move:** `domain-telemetry/include/telemetry_counters.h` → `shared-kernel/include/`
- **Sửa CMake:** `shared-kernel/CMakeLists.txt`, `adapter-modem-sim7600-at/CMakeLists.txt`, `adapter-storage-sdmmc-fatfs/CMakeLists.txt`, `adapter-ble-obd-nimble/CMakeLists.txt`, `domain-ota/CMakeLists.txt`, `domain-storage/CMakeLists.txt`
- **Không sửa:** các file gọi `telemetry_counters_*` (include path không đổi)

## Implementation Steps

1. `git mv` 2 file sang shared-kernel.
2. Mở `shared-kernel/CMakeLists.txt`, thêm `"src/telemetry_counters.c"` vào SRCS (shared-kernel đã có `include/` expose sẵn).
3. Mở 5 CMake còn lại, gỡ `domain-telemetry` khỏi REQUIRES (chỉ gỡ khi không còn symbol domain khác — kiểm: `grep -rn telemetry` trong từng component).
4. `grep -rn "telemetry_counters"` toàn repo để xác nhận không còn component nào `REQUIRES domain-telemetry` chỉ vì counters.
5. Build:
   ```
   cd iot-vehicle-tracking-system-firmware
   idf.py build
   ```
6. Nếu còn component REQUIRES domain-telemetry vì lý do khác (data model), giữ nguyên.

## Todo list

- [ ] git mv 2 file
- [ ] Sửa shared-kernel CMake (thêm SRCS)
- [ ] Gỡ domain-telemetry khỏi 5 CMake REQUIRES
- [ ] Grep xác nhận không còn include chết
- [ ] Build pass

## Success Criteria

- [ ] Build pass.
- [ ] `telemetry_counters.h` nằm ở `shared-kernel/include/`.
- [ ] Grep: không component nào REQUIRES domain-telemetry chỉ vì counters.
- [ ] 5 cạnh sai hướng biến mất (re-check scout-01 A4).

## Risk & Rollback

- **Risk:** shared-kernel REQUIRES thêm dependency? — counters chỉ cần log/esp — kiểm trước, không thêm.
- **Risk:** Bỏ sót include path (component khác include theo path cũ) — include dir của shared-kernel đã có sẵn, path `"telemetry_counters.h"` không đổi → an toàn.
- **Rollback:** `git mv` ngược lại + revert CMake.

## Security Considerations

- Không liên quan (counters không nhạy cảm).

## Next steps

- Phase 04 (move HTTP) và Phase 06 (port design) độc lập — có thể chạy song song sau phase này.