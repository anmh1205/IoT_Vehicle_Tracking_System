# Firmware Codebase Audit (2026-04-24)

## Scope
- Path: `iot-vehicle-tracking-system-firmware/`
- Focus: tổ chức code, phân chia file/module, luồng runtime, mức dùng thư viện hãng, độ sẵn sàng production.
- Method: static audit source + config + build metadata (không chạy build vì môi trường hiện tại không có `idf.py`).

## Verdict
**Chưa đạt chuẩn production.**  
Điểm mạnh có, nhưng hiện có lỗ hổng bảo mật nghiêm trọng và debt kiến trúc lớn.

## Findings (ưu tiên theo mức độ)

### Critical
1. Hard-code credential/token trong source và config.
   - `main/src/nvs_config.c:31-34`
   - `main/src/nvs_config.c:150-154`
   - `main/src/offline_queue.c:26`
   - `main/src/offline_queue.c:183-191`
   - `main/Kconfig.projbuild:9`
   - `main/Kconfig.projbuild:114`
   - `main/Kconfig.projbuild:118`
   - `sdkconfig:602`
   - Impact: lộ bí mật, khó xoay vòng credential, replay dữ liệu có thể dùng token cứng sai tenant/device.

2. TLS không verify server certificate cho MQTT và OTA.
   - `main/src/mqtt_client.c:897` (`authmode=0`)
   - `main/src/util.c:426` (`authmode=0`)
   - Impact: MITM có thể can thiệp command channel + OTA channel.

### High
1. Lỗi init có thể reset cứng thay vì trả lỗi cho FSM retry.
   - `main/src/modem_at.c:250-259` dùng `ESP_ERROR_CHECK(...)` trong `modem_at_init()`
   - Trong khi caller đang thiết kế retry non-blocking:
     - `main/src/modem_lte.c:450-453`
     - `main/src/modem_lte.c:777-780`
   - Impact: dễ boot-loop khi UART/pin/transient lỗi.

2. Offline queue có nguy cơ cắt payload âm thầm.
   - Record payload chỉ 384 bytes:
     - `main/inc/sd_log_store.h:32`
   - Enqueue copy không check overflow/truncation:
     - `main/src/offline_queue.c:353`
   - Raw/status payload có thể dài (diagnostics + metadata), dẫn đến JSON bị cắt, replay lỗi hoặc dữ liệu sai.

### Medium
1. File quá lớn, coupling cao, khó review/test.
   - `main/src/state_machine.c` ~2417 lines
   - `main/src/mqtt_client.c` ~1490 lines
   - `main/src/modem_lte.c` ~1083 lines
   - Hệ quả: thay đổi nhỏ dễ tạo regression chéo, khó unit test theo module.

2. Thiếu test firmware ở mức module/integration.
   - Không có test folder/source test thực cho firmware logic (ngoài docs/build artifacts).
   - Hệ quả: khó chứng minh ổn định khi refactor phần modem/MQTT/OTA/FSM.

3. Track file phát sinh build trong git.
   - `build_last.log`
   - `reconfigure.log`
   - `sdkconfig.old`
   - Hệ quả: nhiễu repo, khó review, tăng rủi ro lộ thông tin môi trường.

4. Khai báo dependency ESP-IDF dư thừa so với usage.
   - `main/CMakeLists.txt:32-38` có `esp_event`, `esp_netif`, `esp_http_client`, `mqtt`
   - Source không dùng trực tiếp các API tương ứng.
   - Hệ quả: tăng độ mơ hồ thiết kế, khó bảo trì dependency tree.

### Low
1. Trùng logic cấu hình SSL AT giữa MQTT và OTA.
   - `main/src/mqtt_client.c:891-921`
   - `main/src/util.c:420-450`
   - Hệ quả: khó đồng bộ khi thay đổi chính sách TLS.

## Điểm tốt hiện tại
- Đã tách module theo domain phần cứng/chức năng (`modem_*`, `imu_*`, `rtc_*`, `offline_queue`, `nvs_config`, `command_handler`).
- Dùng nhiều API ESP-IDF đúng hướng cho peripheral/core:
  - UART/I2C/GPIO/ADC/NVS/SDMMC/OTA/NimBLE.
- FSM runtime rõ trạng thái chính:
  - `INIT -> CHECK_IGN -> DRIVING/PARKED/ALARM/HEARTBEAT -> SLEEP`.
- Có retry policy/backoff ở nhiều điểm quan trọng (network, BLE, SD mount).

## Mức dùng thư viện hãng vs tự viết (đánh giá)
- **ESP32 side**: dùng thư viện hãng khá tốt (IDF drivers + OTA API + NVS + NimBLE).
- **Modem SIM7600 side**: đang tự viết AT transport/parser khá sâu.
  - Đây có thể chấp nhận do feature dùng AT MQTT/HTTP của modem.
  - Nhưng đang thiếu hardening security và quá phụ thuộc code custom lớn.

## Đề xuất chỉnh sửa (ưu tiên thực thi)

### P0 (bắt buộc trước khi coi là production-ready)
1. Gỡ toàn bộ credential/token hard-code khỏi source/Kconfig/sdkconfig tracked.
2. Bật verify TLS đúng chuẩn cho MQTT + OTA (`authmode` không để 0, quản lý CA/cert pinning).
3. Sửa `modem_at_init()` và các init khác: bỏ `ESP_ERROR_CHECK` trong đường runtime, trả lỗi để FSM xử lý retry.
4. Chặn truncation payload offline queue:
   - tăng payload limit hoặc
   - chunk/compress payload hoặc
   - reject có log + metrics rõ ràng.

### P1
1. Tách `state_machine.c` thành các flow module:
   - network orchestration
   - telemetry publish path
   - OTA flow
   - sleep policy
   - OBD/BLE lifecycle
2. Tách `mqtt_client.c` thành:
   - AT command transport adapter
   - URC parser
   - session manager
   - publish/subscription API.
3. Dọn tracked artifact (`*.log`, `sdkconfig.old`) khỏi git.

### P2
1. Thêm test tối thiểu:
   - command parser validation
   - config migration/repair
   - MQTT URC parsing
   - offline queue ACK/replay state transitions.
2. Rà lại `REQUIRES` trong `main/CMakeLists.txt` theo dependency dùng thực tế.

## Kết luận duyệt
- **Nếu tiêu chí là “chuẩn production, tổ chức tốt, security đúng chuẩn”**: **Không duyệt** ở trạng thái hiện tại.
- **Nếu tiêu chí là “prototype chạy được để field test nội bộ”**: có thể chạy, nhưng cần đóng các lỗ hổng P0 trước khi mở rộng triển khai.

## Unresolved Questions
1. Firmware này có đang target production thật hay chỉ UAT/field-validation?
2. Có yêu cầu bắt buộc mTLS hoặc CA pinning cho MQTT/OTA không?
3. Payload rawdata tối đa thực tế hiện trường (bytes) đã đo chưa, để chốt kích thước queue record?
4. Có kế hoạch chuẩn hóa secret provisioning (manufacturing/NVS bootstrap) thay cho giá trị mặc định hard-code chưa?
