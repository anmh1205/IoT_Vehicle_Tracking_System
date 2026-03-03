# 03. Firmware (Phần mềm)

Folder này chứa thiết kế firmware cho thiết bị tracker.

## Nội dung

- **part-01-kien-truc-va-luong-hoat-dong.md**: Kiến trúc firmware, luồng hoạt động cơ bản, và các điểm chính trong code
- **part-02-ble-obd2.md**: Chiến lược kết nối BLE OBD2 (vgate iCar Pro), xử lý lỗi, và tối ưu hóa
- **part-03-modem-simcom.md**: Quản lý **A7670C (LTE)** và **NEO-M8N (GNSS)** theo kiến trúc tách rời, deep sleep, và điều khiển theo chế độ
- **part-04-power-management-gpio.md**: Power Path Management Control, GPIO mapping và configuration
- **part-05-data-format-state-machine.md**: Data format (MQTT), protocol, và state machine chi tiết
- **part-06-configuration.md**: Configuration management và calibration
- **part-07-vgate-icar-pro-esp-idf-reference/**: Tham khảo code ESP-IDF cho vgate iCar Pro (từ project esp32-obd2-meter)
  - Xem [`part-07-vgate-icar-pro-esp-idf-reference/README.md`](./part-07-vgate-icar-pro-esp-idf-reference/README.md) để biết danh sách đầy đủ
- **part-08-ble-obd2-giao-thuc-ket-noi/**: Giao thức kết nối BLE OBD2 chi tiết (tiếng Việt, phù hợp báo cáo đồ án)
  - Xem [`part-08-ble-obd2-giao-thuc-ket-noi/README.md`](./part-08-ble-obd2-giao-thuc-ket-noi/README.md) để biết danh sách đầy đủ

## Workflow

Sau khi đã chốt phần cứng (folder `02-hardware/`), thiết kế firmware dựa trên:
- Các component đã chọn (**ESP32-S3, LIS3DH, A7670C, NEO-M8N, vgate iCar Pro BLE**)
- Chiến lược quản lý năng lượng (3 chế độ)
- Yêu cầu từ scope (part-02)

## Current Gap vs Target Architecture

### Target architecture (docs)
- **LTE path**: A7670C qua UART riêng cho modem AT/MQTT/PPP
- **GNSS path**: NEO-M8N qua UART riêng, đọc NMEA/UBX
- LTE và GNSS tách lifecycle để bật/tắt độc lập theo state

### Current firmware baseline (code reality)
- `iot-vehicle-tracking-system/Tracking_Firmware/main/src/modem_gnss.c`: vẫn dùng `AT+CGNSPWR` và `AT+CGNSINF` (mô hình GNSS tích hợp modem)
- `iot-vehicle-tracking-system/Tracking_Firmware/main/inc/pin_map.h`: chưa định nghĩa UART riêng cho GNSS module
- `iot-vehicle-tracking-system/Tracking_Firmware/main/src/state_machine.c`: còn coupling LTE connect/disconnect với lifecycle GNSS theo cùng modem stack

> Tài liệu firmware trong folder này mô tả hướng thiết kế mục tiêu. Source firmware thực tế sẽ được refactor ở đợt riêng.
