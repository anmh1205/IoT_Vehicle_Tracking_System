# 03. Kiến trúc thành phần IVTS

## Thiết bị ESP32-S3

[Entry point](../../../../iot-vehicle-tracking-system-firmware/esp-idf/main/main.c) gọi `app_start()`. Task `app` điều phối các sự kiện và giữ quyền ghi trạng thái phiên. [Các component của firmware chính](../../../../iot-vehicle-tracking-system-firmware/esp-idf/components/) chia quyền sở hữu như sau.

| Component | Trách nhiệm |
| --- | --- |
| `app` | Khởi tạo, điều phối trạng thái tracker, chuẩn bị bản tin, xử lý phiên và lệnh. |
| `ivts-core` | Model, FSM, logic phiên và mã hóa/giải mã giao thức có thể kiểm thử trên host. |
| `board` | GPIO, ADC, RTC, IMU, I/O board và wake-up. |
| `modem` | SIM7600, LTE, GNSS, MQTT và nguồn tải HTTP cho OTA qua giao diện được nối khi khởi tạo. |
| `obd` | BLE và phiên trao đổi OBD-II với adapter ELM327 tương thích. |
| `storage` và `ota` | NVS, hàng đợi SD và ghi/kiểm tra image OTA theo ranh giới I/O riêng. |

Firmware lưu mốc phiên chưa gửi trong NVS và giữ danh tính khi phải thử lại. Luồng publish chuyển tiếp hàng đợi theo kết quả gửi của modem. Khi đổi từ firmware cũ sang firmware chính, xem các điều kiện về PCB, flash, CA cho SIM7600, migration hàng đợi và rollback trong [README firmware](../../../../iot-vehicle-tracking-system-firmware/README.md).

## Cloud và client

| Thành phần | Quyền sở hữu |
| --- | --- |
| [EMQX](../../../../iot-vehicle-tracking-system-cloud/Tracking_EMQX/) | Vận chuyển bản tin và áp dụng xác thực/ACL kết nối MQTT. |
| [MQTT Bridge](../../../../iot-vehicle-tracking-system-cloud/Tracking_MqttBridge/src/) | Định tuyến theo topic, kiểm tra payload, cập nhật trạng thái và phiên, phát sự kiện nội bộ. |
| [Express backend](../../../../iot-vehicle-tracking-system-cloud/Tracking_Backend/src/) | HTTP validation và response ở `api/`. Nghiệp vụ và quyền theo domain. MQTT listener ở `infrastructure/` ghi lịch sử rawdata nhận từ Bridge và chuyển tiếp sự kiện đến Socket.IO. |
| [Next.js](../../../../iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/) | Định tuyến App Router, API client, cache và feature UI cho dashboard điều hành. |
| [Flutter](../../../../iot-vehicle-tracking-system-cloud/Tracking_Mobile/lib/) | WebView, vòng đời phiên native, chức năng hệ điều hành và trải nghiệm khi mất kết nối. |

MQTT là đường ingest cho tracker và cloud simulator. [Bench ECU Uno](../../../../iot-vehicle-tracking-system-ecu-simulator/ecu-simulator/README.md) tạo tín hiệu chẩn đoán trên CAN. Tracker đọc bench bằng adapter BLE OBD-II như khi đọc ECU tương thích trên xe. Hai loại simulator kiểm tra hai chặng dữ liệu khác nhau.

[Thiết kế realtime](06-realtime-design.md) mô tả các điểm xác nhận và thứ tự ghi/phát mà mỗi lớp chịu trách nhiệm.
