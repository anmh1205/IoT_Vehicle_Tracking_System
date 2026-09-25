# Phase 09 — P2 Naming + Cleanup: rename 4 file kebab-case, xoá comment lỗi thời, include chết

**Status:** pending | **Priority:** P2 | **Effort:** 7h | **Depends:** phase 07

## Context links

- Audit mục #8, #20, #21, #29: `plans/reports/audit-260806-0643-firmware-vs-vault-standard.md`
- Feedback user: firmware C file naming dùng **snake_case** (đồng nhất codebase)

## Overview

Ba nhóm cleanup:

1. **Rename 4 file kebab-case → snake_case** (quyết định user #2 trong plan cũ, feedback snake_case):
   - `app-core/src/tracker-app-bootstrap.c` → `tracker_app_bootstrap.c`
   - `app-core/include/tracker-app-bootstrap.h` → `tracker_app_bootstrap.h`
   - `platform-hal-esp-idf/include/tracker-runtime-ports.h` → `tracker_runtime_ports.h`
   - `platform-hal-esp-idf/src/tracker-runtime-ports.c` → `tracker_runtime_ports.c`
   → Đụng CMake SRCS + mọi `#include` tương ứng.
2. **Xoá include chết**: `domain-connectivity/include/command_handler.h:7` (`#include "nvs_config.h"` — không dùng symbol nào, xác nhận scout-01). Nếu phase 07 chưa xoá thì xoá ở đây.
3. **Sửa doc-comment lỗi thời**: `state_sleep_controller.c:47` nhắc `state_machine_can_sleep` (tên cũ) — hàm thật là `state_machine_can_enter_sleep` (305).

**Đã làm một phần qua diff (giữ):** `s_user_led_cycle_started_ms` (biến chết) đã xoá ở state_led_control.c + state_runtime_context.c.

## Key Insights

- Rename file ảnh hưởng CMake SRCS + mọi file `#include "tracker-app-bootstrap.h"`/`"tracker-runtime-ports.h"`. Grep trước để biết đủ call-site (scout-02 H: 10 chỗ code/build bắt buộc, ~15 chỗ docs tuỳ chọn).
- File `state_sleep_controller.c` đã đổi tên hàm (can_enter_sleep) nhưng doc-comment chưa theo → sửa doc cho khớp (mess nhỏ, chỉ comment).
- Cleanup này làm CUỐI vì rename đụng nhiều file — tránh xung đột với phase 07 (DI migrate còn chỉnh file).
- **Scout-02 H naming bổ sung (P2):** `led_*` thiếu prefix module (`state_led_control.c:39,54,92,112` — 4 hàm); `config_store_*` không nhất quán (`config_store_nvs.c:60,74` vs `:121,153`). Đây là rename symbol — **tách riêng khỏi rename file**, commit riêng, chỉ làm nếu không rủi ro build.

## Requirements

- **Functional:** Tên file/header chuẩn snake_case; không include chết; comment đúng tên hàm.
- **Non-functional:** Build pass; mọi include path được cập nhật.
- **Non-goal:** Rename thêm file khác ngoài 4 file này; đổi symbol/hàm.

## Architecture

Chỉ rename + sửa tham chiếu — không đổi cấu trúc.

## Related code files

- **Rename:** `app-core/src/tracker-app-bootstrap.c`, `app-core/include/tracker-app-bootstrap.h`, `platform-hal-esp-idf/include/tracker-runtime-ports.h`, `platform-hal-esp-idf/src/tracker-runtime-ports.c`
- **Sửa CMake:** `app-core/CMakeLists.txt`, `platform-hal-esp-idf/CMakeLists.txt`
- **Sửa include:** mọi file `#include "tracker-app-bootstrap.h"` / `"tracker-runtime-ports.h"` (grep trước)
- **Xoá include chết:** `domain-connectivity/include/command_handler.h:7`
- **Sửa comment:** `app-core/src/state_sleep_controller.c:47`

## Implementation Steps

1. Grep toàn repo: `grep -rn "tracker-app-bootstrap\|tracker-runtime-ports"` → lập danh sách call-site.
2. `git mv` 4 file sang tên snake_case.
3. Sửa CMake SRCS 2 component (app-core, platform-hal-esp-idf).
4. Sửa mọi `#include` theo tên mới (dùng sed/rename trong các file C/H).
5. Xoá `#include "nvs_config.h"` ở `command_handler.h:7` (nếu phase 07 chưa xoá).
6. Sửa doc-comment `state_sleep_controller.c:47`: `state_machine_can_sleep` → `state_machine_can_enter_sleep`.
7. Build:
   ```
   cd iot-vehicle-tracking-system-firmware
   idf.py build
   ```
8. Grep lại: `grep -rn "tracker-app-bootstrap\|tracker-runtime-ports"` → 0 kết quả (tên cũ không còn).

## Todo list

- [ ] Grep call-site rename
- [ ] git mv 4 file
- [ ] Sửa CMake SRCS
- [ ] Sửa mọi #include
- [ ] Xoá include chết command_handler.h:7
- [ ] Sửa comment can_sleep
- [ ] (Tuỳ chọn, P2) prefix `led_*` + nhất quán `config_store_*` — commit riêng
- [ ] Build pass
- [ ] Grep tên cũ = 0

## Success Criteria

- [ ] Build pass.
- [ ] 4 file tên snake_case; grep tên cũ = 0.
- [ ] `command_handler.h` không include nvs_config.h.
- [ ] Doc-comment `state_sleep_controller.c` khớp tên hàm thật.

## Risk & Rollback

- **Risk:** Sót include path (file khác vẫn include tên cũ) → build fail, grep step 1 + 8 bắt được.
- **Risk:** Xoá include chết nhưng thật ra có dùng (scout-01 nói "KHÔNG dùng symbol nào" — kiểm lại grep `nvs_config` trong command_handler.c trước khi xoá).
- **Rollback:** `git mv` ngược + revert — rename thuần, an toàn.

## Security Considerations

- Không liên quan bảo mật.

## Next steps

- Kết thúc 9 phase → chạy build tổng, cập nhật report audit (mọi mục CÒN → ĐÃ SỬA), cập nhật `resources/docs` nếu cần.