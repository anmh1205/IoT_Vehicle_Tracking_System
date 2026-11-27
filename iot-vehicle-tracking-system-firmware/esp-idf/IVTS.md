# Thiết kế firmware IVTS trên ESP32-S3

Firmware lấy mẫu nguồn và chuyển động, thu GNSS và OBD, lưu RAW khi offline và gửi MQTT qua SIM7600. [README](README.md) hướng dẫn build và chạy test. Các README của component chỉ ra nơi sửa từng tính năng.

## Quyết định thiết kế

| Quyết định | Triển khai |
| --- | --- |
| D1 · Task board | ISR của LIS3DSH chỉ đánh thức task board. Task nhả ngắt, đọc IMU và lấy mẫu ADC. RTC và IMU chia sẻ mutex I2C. Ignition được suy từ điện áp nguồn xe với hysteresis và debounce. [Board](components/board/README.md) · [Axes](components/ivts-core/src/fsm/axes.c) |
| D2 · Hàng đợi command | SIM7600 gửi PUBACK tầng MQTT. Modem giữ FIFO bốn lệnh và báo `IVTS_EV_CMD_PENDING` để app lấy payload. App lưu 32 ID lệnh thành công gần nhất ở NVS và trả kết quả trên `commands/ack`. [FIFO](components/modem/src/mqtt/mqtt_slots.c) · [Receipts](components/app/src/command/cmd_receipts.c) |
| D3 · Đọc JSON có giới hạn | Tokenizer làm việc trên buffer có sẵn và giới hạn độ dài, số token và độ sâu. Giá trị trả về dương là số token, giá trị âm là mã lỗi. Các handler đọc field qua API có kiểu. [Tokenizer](components/ivts-core/src/payload/json_reader.c) · [JSON fields](components/ivts-core/src/payload/json_fields.c) |
| D4 · Nguồn byte OTA | App nối `ota_source_t` với HTTPS của modem. Task OTA chờ kết quả RPC qua semaphore. Task modem xử lý AT và hoàn thành RPC trước khi caller thu hồi buffer. [Wiring](components/app/src/boot/app_wiring.c) · [HTTP](components/modem/src/services/http.c) |

## Task và khởi tạo

| Task | Priority | Stack (byte) | Sở hữu |
| --- | ---: | ---: | --- |
| modem | 6 | 6144 | UART, AT, link LTE/MQTT, GNSS, HTTPS |
| app | 5 | 6144 | Hàng đợi sự kiện, FSM, telemetry, bản tin đang chờ ACK |
| obd | 4 | 4096 | Phiên BLE/ELM327, live PID và chẩn đoán |
| storage | 3 | 5120 | SD, offline queue và log |
| ota | 3 | 6144 | Tải, xác minh và ghi image trong thời gian chạy job |
| board | 2 | 3072 | ADC và ngắt IMU |

App tạo queue trước, rồi khởi tạo board, storage, đọc NVS, modem, OBD và OTA theo thứ tự. Lỗi queue, board bắt buộc, NVS, modem, OTA hoặc tạo task app dẫn đến khởi động lại. Board tiếp tục khi dò RTC hoặc IMU thất bại. Lỗi SD hoặc khởi tạo OBD dẫn đến chế độ suy giảm. [Khởi tạo](components/app/src/boot/app_boot.c) · [Wiring](components/app/src/boot/app_wiring.c) · [Cấu hình task](components/app/src/boot/task_table.h)

Sự kiện được sao chép theo giá trị và có kích thước tối đa 64 byte. Trạng thái do task sở hữu cập nhật. Chỗ chia sẻ payload hoặc snapshot giữa các task dùng mutex trong thời gian sao chép. Sink, AT và thao tác file chạy ngoài mutex sao chép. [Hợp đồng sự kiện](components/ivts-core/include/ivts_core/event/event.h) · [Queue app](components/app/src/runtime/app_task.c)

## Phần cứng

- Chân, địa chỉ I2C, hệ số ADC và cực tính PWRKEY nằm trong bản wiring PCB. INT1 nối GPIO36. Khi cần wake theo IMU, FSM chọn light sleep. Deep sleep trên PCB hiện tại thức bằng timer. [Pin map](components/board/include/board/board_hw.h) · [Wake IMU](components/board/src/power/wake.c)
- LIS3DSH dùng state machine SM1 để phát ngắt chốt. Đọc OUTS1 nhả ngắt. DS3231M báo thời gian đáng tin khi OSF đã xóa và ngày đạt mốc cấu hình. [LIS3DSH](components/board/src/drivers/lis3dsh.c) · [RTC](components/board/src/drivers/ds3231.c)
- PWRKEY dùng GPIO34. GPIO35 đã nối RESET và hiện chưa được dùng. PCB dùng hai chân này với biến thể ESP32-S3 phù hợp vì GPIO33–37 có thể dành cho octal PSRAM. SIM7600 đọc GNSS bằng `AT+CGNSSINFO`, với `AT+CGPSINFO` là đường dự phòng. [Pin map](components/board/include/board/board_hw.h) · [GNSS](components/modem/src/services/gnss.c)

## Hợp đồng giữ qua refactor

- NVS dùng namespace `ivts`, magic `0x49565453` và header kèm version, kích thước, CRC. Config, boot counter, OTA context, receipts, restart intent, tracking, session và alarm giữ key và layout đã triển khai. Payload tối đa 1.537 byte theo kích thước receipts. OTA context v2 và restart intent v1 còn đọc được. [NVS](components/storage/src/nvs/nvs_store.c) · [Typed records](components/app/src/persist/app_records.c)
- Offline queue dùng `/sd/q/QNNNNNNN.BIN` với frame `A5 | len | payload | crc32`. Cursor `CURSOR.BIN` được ghi mỗi 16 lần pop hoặc khi queue hết. Replay RAW giữ boot ID và sequence gốc. Bản ghi replay hợp lệ chỉ được pop sau PUBACK thành công. Replay loại riêng các khung có payload lỗi giải mã. [Frame codec và cursor](components/storage/src/queue/queue_rw.c) · [Replay](components/app/src/publish/replay.c)
- RTC giữ boot ID, sequence và trạng thái FSM qua deep sleep với magic, version, kích thước và CRC. Boot nguội lấy boot ID mới từ NVS. [RTC context](components/app/src/persist/rtc_context.c)
- Topic và field JSON giữ hợp đồng với MQTT Bridge. Publisher khớp ACK với một transaction đang gửi. Thứ tự control là firmware khi confirm hoặc chờ reboot OTA, alarm, ranh giới phiên sau RAW đứng trước, status, firmware, rồi event. [Publish](components/app/src/publish/outbox.c) · [Hợp đồng cloud](tests/test_cloud_contract.py)
- App ghi receipt lệnh thành công trước khi gửi ACK. Với reboot đã ghi receipt, PUBACK kích hoạt reboot ngay. Thiết bị có đường dự phòng 20 giây khi thiếu PUBACK. OTA xác minh digest, kết thúc ghi image, kiểm tra version và lưu context trước khi đặt boot partition. Context được giữ tới PUBACK báo cáo cuối. PUBACK trạng thái, ranh giới phiên hoặc báo cáo `confirming` có thể xác nhận image nếu broker đang kết nối và còn trong hạn. [Restart](components/app/src/command/cmd_restart.c) · [OTA job](components/ota/src/ota_job.c) · [Xác nhận OTA](components/app/src/fw/fw_update.c)
- Component board sở hữu mọi lời gọi ngủ của ESP-IDF. App xử lý sự kiện trong vòng chính khi chờ modem dừng. Hết hạn chờ thì hủy ngủ và khôi phục yêu cầu kết nối. [Sleep controller](components/app/src/power/sleep_controller.c) · [Board sleep](components/board/src/power/sleep.c)

## Kiểm chứng

Bộ host gồm 53 ca khi có trình xác thực MQTT Bridge. Chạy cả bản thường và ASan/UBSan theo [README](README.md). [Bài test app](tests/test_app_flow.py), [luật kiến trúc](tests/test_layers.py) và [ca độ tin cậy](tests/test_reliability.py) bao phủ luồng ACK, replay, framing, receipts, OTA boot và shutdown radio.

Build ESP32-S3 xác nhận khả năng biên dịch và giới hạn phân vùng. Xác nhận ADC, RTC, wake IMU/timer, MQTT TLS/QoS 1, SD khi mất nguồn, ELM327 và OTA rollback trên phần cứng thử nghiệm.
