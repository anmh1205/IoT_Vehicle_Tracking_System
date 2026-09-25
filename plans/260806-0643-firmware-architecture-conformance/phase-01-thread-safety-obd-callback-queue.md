# Phase 01 — P0 Thread Safety: queue hoá OBD callback ↔ FSM

**Status:** pending | **Priority:** P0 | **Effort:** 4h | **Depends:** —

## Context links

- Audit mục #1, #25: `plans/reports/audit-260806-0643-firmware-vs-vault-standard.md`
- Chuẩn callback non-blocking vault: `research/researcher-01-vault-di-ports-standard.md` §6 A9
- Pattern queue có sẵn để học: `s_ble_connect_result_queue` (`app-core/src/state_machine_core.c:1171-1176`, `state_obd_runtime.c:689-708`)

## Overview

`state_machine_obd_response_cb` (`state_obd_runtime.c:389-472`) được đăng ký làm callback của adapter BLE qua `ble_obd_connect` tại `state_obd_runtime.c:672`, nối với NimBLE host task qua `ble_obd_notify_cb` (`ble_obd.c:658`). Callback này ghi TRỰC TIẾP vào `s_telemetry` (global `extern telemetry_t`), `s_last_obd_sample_ms`, `s_last_obd_engine_on_evidence_ms` — trong khi FSM task (`state_machine_refresh_telemetry`) đọc/ghi cùng các biến đó mỗi vòng. **Torn read / data race P0** khi hai task truy cập đồng thời (NimBLE host task trên core khác).

**Scout-02 E1 xác nhận `s_telemetry` bị 3 task chạm**: task FSM, NimBLE host, `ble_obd_conn` (`state_obd_runtime.c:860`). Queue hoá callback (phase này) bao phủ CẢ NimBLE host lẫn `ble_obd_conn` (cả hai đều đi qua `state_machine_obd_response_cb`) → E1 được giải quyết.

**Đã làm một phần qua diff (giữ, không redo):** `modem_gnss.c` đã bọc `s_gnss_mutex` (xem N1 phase 02 — sẽ XOÁ vì deadlock), `command_handler.c` đã atomic hoá `s_dropped_command_count`. Phần còn lại là race OBD — phiên này chưa xử lý.

**Phát hiện MỚI (scout-02 E2, P1) trong cùng scope:** UAF `ble_obd_ctx_t` — `ble_mgr_disconnect` (`ble_mgr.c:970-1020`) quiesce loop break sau `BLE_DISCONNECT_WAIT_MS=1200` (`:38,:991`) → caller vẫn `free(ctx)` (`ble_obd.c:692-699`) trong khi NimBLE host task có thể còn chạy `notify_cb` chạm ctx. Đường gọi: `obd_runtime.c:716,811`, `sleep_controller.c:376`. Xử lý cùng phase này.

## Key Insights

- Dự án đã có pattern chuẩn cho "callback task khác → FSM consume": `s_ble_connect_result_queue` dùng `xQueueOverwrite` (giữ giá trị mới nhất) ở producer, `xQueueReceive(...,0)` (non-blocking) ở consumer FSM. Queue hoá OBD payload theo đúng pattern này.
- `tracker_obd_response_callback_t` (port signature) đã có `user_ctx` — giữ nguyên.
- NimBLE host task chạy trên core riêng; việc chờ lock/wait trong callback là A9 anti-pattern (non-blocking). Queue với `portMAX_DELAY` ngắn + overwrite, KHÔNG block lâu.

## Requirements

- **Functional:** Payload OBD từ NimBLE host task được chở qua FreeRTOS queue; FSM task là PRODUCER duy nhất ghi `s_telemetry`/`s_last_obd_*`.
- **Non-functional:** Callback giữ non-blocking (không mutex dài, không malloc, không wait). Build pass.

## Architecture

```
[NimBLE host task]  ble_obd_notify_cb
        │  (chỉ gói + xQueueSend queue, không decode)
        ▼
s_obd_response_queue (FreeRTOS queue, capacity > 1)
        │
        ▼
[FSM task]  drain queue mỗi loop → decode → ghi s_telemetry + s_last_obd_*
```

- Queue: `static QueueHandle_t s_obd_response_queue` (thêm vào `state_obd_runtime.c`; khởi tạo trong hàm `init` cùng nơi khởi tạo `s_ble_connect_result_queue`).
- Payload queue item: struct nhỏ chứa `mode`, `pid`, `len`, và buffer `data[≤8]` (OBD payload ngắn; cần mảng cố định + copy, không giữ con trỏ đã free của adapter).
- Callback MỚI: chỉ đọc field + x_queue, không gọi hàm decode.
- Hàm `state_machine_drain_obd_responses()`: được gọi từ `state_machine_refresh_telemetry` (hoặc loop FSM) — drain và decode.
- `s_telemetry` chỉ được ghi từ FSM task.

## Related code files

- **Sửa:** `app-core/src/state_obd_runtime.c` (callback 389-472 → split decode; thêm queue init + drain)
- **Sửa:** `app-core/include/state_obd_runtime.h` (thêm hàm drain + khai báo queue nếu cần)
- **Sửa:** `app-core/src/state_machine_core.c` (khởi tạo queue trong `state_machine_init` vùng 1170-1176)
- **Sửa:** `app-core/src/state_wake_prelude.c` (gọi drain trong `state_machine_refresh_telemetry`)
- **Tham chiếu (KHÔNG sửa):** `adapter-ble-obd-nimble/src/ble_obd.c` (notify_cb giữ nguyên — bên BLE chỉ chở qua callback type hiện có)

## Implementation Steps

1. Định nghĩa struct item queue `typedef struct { uint8_t mode; int pid; uint8_t len; uint8_t data[OBD_PAYLOAD_MAX]; } tracker_obd_response_msg_t;` (hằng `OBD_PAYLOAD_MAX` = 32, đủ OBD 6-byte response + spare).
2. Tạo `static QueueHandle_t s_obd_response_queue = NULL;` trong `state_obd_runtime.c`.
3. `state_machine_obd_response_cb` → đổi thành wrapper nhẹ: nếu queue NULL thì bỏ (drop), nếu không thì `xQueueOverwrite(s_obd_response_queue, &msg)` (hoặc `xQueueSend` với timeout 0). KHÔNG decode, KHÔNG truy s_telemetry.
4. Tách toàn bộ logic decode hiện tại (dòng 392-471) thành `static void state_machine_decode_obd_response_msg(const tracker_obd_response_msg_t *)` — GHI `s_telemetry`/`s_last_obd_*` từ FSM task.
5. Thêm `void state_machine_drain_obd_responses(void)` — loop `xQueueReceive(..., 0)` gọi decode từng msg rồi tiếp.
6. Khởi tạo queue trong `state_machine_init` (cùng chỗ `s_ble_connect_result_queue` init, state_machine_core.c:1170-1176).
7. Gọi `state_machine_drain_obd_responses()` đầu `state_machine_refresh_telemetry` (state_wake_prelude.c:259).
8. Build:

```
cd iot-vehicle-tracking-system-firmware
idf.py build
```

9. Post-build: grep `s_telemetry` trong `state_obd_runtime.c` → chỉ còn trong hàm decode (FSM task), không còn trong callback.

## Todo list

- [ ] Queue + item type
- [ ] Callback → wrapper non-blocking (chỉ copy + queue)
- [ ] Tách decode function
- [ ] Hàm drain
- [ ] Khởi tạo queue trong init
- [ ] Gọi drain trong refresh_telemetry
- [ ] (E2 P1) Sửa UAF `ble_obd_ctx_t`: gỡ response_cb của ctx TRƯỚC khi `free(ctx)` (hoặc orphan có chủ đích) — không để NimBLE host chạm ctx đã free
- [ ] Build pass
- [ ] Grep xác nhận callback không còn ghi s_telemetry

## Success Criteria

- [ ] Build pass.
- [ ] Callback OBD không còn ghi `s_telemetry`/`s_last_obd_*` (grep xác nhận).
- [ ] No mutex/wait lâu trong callback (xem lại — callback chỉ copy + queue).
- [ ] E1: `s_telemetry` không còn bị đọc/g bởi NimBLE host / `ble_obd_conn` — chỉ task FSM.
- [ ] E2: không còn UAF `ble_obd_ctx_t` (ctx không bị free khi NimBLE host còn chạy callback).
- [ ] Hành vi: OBD live gauge/RPM/speed/coolant vẫn cập nhật bình thường (tương đương).

## Risk & Rollback

- **Risk:** Mất payload nếu queue đầy → dùng `xQueueOverwrite` (giữ mới nhất, đúng pattern `s_ble_connect_result_queue`) để không mất mẫu mới nhất.
- **Risk:** Decode sai vị trí drain (gọi trước khi `s_telemetry` dùng) → drain phải đặt ĐẦU `refresh_telemetry`.
- **Rollback:** Revert commit — callback cũ nguyên khối, behaviour quay về như trước.

## Security Considerations

- Không copy dữ liệu nhạy cảm; payload OBD chiều dài cố định `OBD_PAYLOAD_MAX`, kiểm `len <= OBD_PAYLOAD_MAX` trước khi copy để tránh buffer overflow.

## Next steps

- Sau khi pass → Phase 02 (logic bug timestamp). Phần GIỮ dao đã làm (GNSS mutex, atomic counter) không redo.