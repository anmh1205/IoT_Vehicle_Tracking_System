# Báo cáo rà soát rủi ro compile/runtime (Tracking_Firmware)

Ngày: 2026-03-02
Phạm vi: main/src/ble_mgr.c, main/src/ble_obd.c, main/src/mqtt_client.c, main/src/command_handler.c, main/inc/command_handler.h, main/src/ble_init.c
Mục tiêu: rà soát tĩnh, tìm compile blockers và rủi ro runtime cao (ESP-IDF tooling không khả dụng).

## Tóm tắt nhanh
- Compile blockers: 0 phát hiện chắc chắn.
- Rủi ro runtime cao: 4
- Rủi ro runtime trung bình: 5
- Khuyến nghị chính: kiểm soát deadlock trong BLE manager, validate handle/notify flow, kiểm soát payload length MQTT, bảo vệ callback concurrency.

## Phát hiện chi tiết

### 1) main/src/ble_mgr.c

**Rủi ro runtime cao**
1. [L497-L529] Deadlock/timeout do giữ mutex khi chờ queue trong `ble_mgr_connect_service`.
   - `xSemaphoreTake(lock_mtx, 0)` giữ khóa suốt quá trình scan/connect và `ble_mgr_queue_wait`.
   - Callback GAP/GATT không dùng mutex, nhưng API khác sẽ bị chặn dài; nếu có luồng khác cần `lock_mtx` sẽ treo (chờ vô hạn) hoặc fail.

2. [L533-L549] `ble_mgr_send` lấy mutex với timeout=0 và có thể thất bại ngay khi đang kết nối/đang chờ; gọi API từ task khác có thể trả `BLE_MGR_E_API_LOCK_ERROR` liên tục, gây mất dữ liệu.

3. [L239-L283] GATT char discovery: `ble_gattc_write_flat` dùng `chr->val_handle + 1` để ghi CCCD.
   - Không đảm bảo handle+1 là CCCD hợp lệ (phụ thuộc ATT table). Nếu CCCD không liền kề, sẽ fail/ghi sai handle.

4. [L365-L385] `ble_gap_connect` dùng `BLE_OWN_ADDR_PUBLIC`; nếu device cấu hình random addr nhưng chưa set, sẽ fail connect khó chẩn đoán.

**Rủi ro runtime trung bình**
5. [L149-L175] `ble_mgr_adv_contains_service` so sánh UUID string. Với UUID 16/32/128 dạng khác nhau hoặc định dạng khác (lower/upper, 0x prefix), có thể bỏ lọt thiết bị mong muốn.

6. [L178-L197] `ble_mgr_gap_notification_cb` dùng `om->om_data` và `om->om_len` trực tiếp; không đảm bảo contiguous (OS mbuf chain). Có rủi ro đọc thiếu dữ liệu nếu mbuf chain.

7. [L449-L487] `ble_mgr_init` tạo queue và gọi `ble_init_stack` rồi chờ queue; nếu sync callback không gọi (NimBLE fail), sẽ timeout và cleanup. OK, nhưng cleanup có thể bỏ sót `ble_init_stack` state nếu `ble_init_stack` đã khởi NimBLE task một phần.

8. [L389-L393] `BLE_GAP_EVENT_DISC_COMPLETE`: restart scanning nếu không connected; nhưng không reset `disc_cfg` state hay queue. Có thể loop scan liên tục nếu filter never matches.

### 2) main/src/ble_obd.c

**Rủi ro runtime cao**
1. [L92-L130] `ble_obd_notify_cb` giả định response nằm trong 1 packet và dùng `strtok_r` trên buffer cục bộ; nếu OBD response phân mảnh qua nhiều notify, parse sai và timeout/hang logic.

2. [L211-L237] `ble_obd_send_raw` dùng semaphore `response_sem` để đợi 1 tín hiệu; nếu notify không tới hoặc payload “>” không gửi, sẽ timeout. Không có cơ chế hủy/flush response cũ ngoài loop take sem.

**Rủi ro runtime trung bình**
3. [L148-L179] `ble_obd_connect` dùng `ble_mgr_connect_service` với timeout 15000; nếu kết nối fail, `ble_obd_disconnect` sẽ free ctx nhưng `ble_mgr_connect_service` có thể vẫn chạy (race). Chưa thấy cơ chế cancel scan/connect ngoài queue timeout ở mgr.

4. [L222-L232] `ble_mgr_send` trả OK dù handle chưa subscribe? Gửi đến TX handle ok, nhưng chưa verify MTU/notify subscription. Có thể fail runtime.

5. [L239-L248] `ble_obd_rxtx` ghi `tx_data` không có mutex guard; gọi song song từ nhiều task có thể data race.

### 3) main/src/mqtt_client.c

**Rủi ro runtime cao**
1. [L61-L73] `payload[512]` copy dữ liệu MQTT không kiểm tra JSON hoàn chỉnh; dữ liệu dài hơn 511 bytes bị cắt, có thể tạo JSON hỏng, command parse fail.

**Rủi ro runtime trung bình**
2. [L31-L35] `snprintf` topic sử dụng `device_id` không validate length; nếu device_id dài, topic bị cắt -> publish/subscribe mismatch.

3. [L82-L105] `tracker_mqtt_init` lưu config toàn cục `s_cfg = *cfg` (shallow copy). Nếu `cfg` chứa pointers đến buffer ngắn sống ngắn hơn, sẽ sử dụng dangling pointers.

4. [L51-L53] subscribe trong event CONNECTED không kiểm tra return code; nếu fail subscribe, không retry.

### 4) main/src/command_handler.c + main/inc/command_handler.h

**Rủi ro runtime trung bình**
1. [L33-L41] `command_apply_update_config` clamp nhưng cast `valuedouble` sang int, mất precision; ok, nhưng nếu float lớn, clamp ok. Không kiểm tra overflow khi `valuedouble` quá lớn (cJSON double). Rủi ro thấp.

2. [L71-L81] `s_pending_action` và `s_location_requested` là static global, không mutex; nếu gọi từ ISR/task khác song song, race.

### 5) main/src/ble_init.c

**Rủi ro runtime trung bình**
1. [L47-L66] `esp_nimble_hci_init` + `nimble_port_init` thành công rồi `xTaskCreate` fail: đã call `nimble_port_deinit` nhưng không call `nimble_port_freertos_deinit` (chỉ gọi khi task kết thúc). Có thể để lại state không sạch.

2. [L85-L87] `ble_stack_deinit` gọi `nimble_port_stop` không chờ task exit; nếu task còn chạy, có race.

## Compile blockers tiềm năng (chưa chắc)
- Không thấy symbol undefined trực tiếp trong phạm vi file đã kiểm.
- Cần đảm bảo header/typedef tồn tại: `ble_mgr.h`, `ble_util.h`, `util.h`, `ble_obd.h`, `mqtt_client.h`, `app_config.h`, `nvs_config.h` cung cấp đầy đủ typedef/defines như `ble_mgr_ctx_t`, `ble_gatt_char_def_t`, `config_t`, `ESP_RETURN_ON_NULL`, `ARRAY_SIZE`.

## Khuyến nghị (không chỉnh code)
- Rà soát xử lý CCCD handle, mbuf chain, và đồng bộ mutex/sem; xác nhận single-thread assumptions.
- Kiểm tra dữ liệu MQTT command tối đa và validate JSON input length trước parse.
- Bổ sung đánh giá thread-safety cho `command_handler_*` và `ble_obd_rxtx`.

## Unresolved questions
- `config_t` có chứa pointer tới buffer tạm thời không? lifetime thế nào?
- `ble_gatt_char_def_t` và `ble_mgr_disc_cfg_t` định nghĩa ở đâu, có đảm bảo CCCD handle không?
- Mô hình threading: callback BLE/MQTT có chạy trên task riêng hay ISR?
