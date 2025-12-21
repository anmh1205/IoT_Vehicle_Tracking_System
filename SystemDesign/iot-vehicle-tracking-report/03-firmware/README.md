# 03. Firmware (Phần mềm)

Folder này chứa thiết kế firmware cho thiết bị tracker.

## Nội dung

- **part-01-kien-truc-va-luong-hoat-dong.md**: Kiến trúc firmware, luồng hoạt động cơ bản, và các điểm chính trong code
- **part-02-bluetooth-obd2.md**: Chiến lược kết nối Bluetooth OBD2, xử lý lỗi, và tối ưu hóa
- **part-03-modem-simcom.md**: Quản lý modem SIMCom A7600CE-T (4G/LTE + GNSS), deep sleep, và điều khiển theo chế độ
- **part-04-power-management-gpio.md**: Power Path Management Control, GPIO mapping và configuration
- **part-05-data-format-state-machine.md**: Data format (MQTT), protocol, và state machine chi tiết
- **part-06-configuration.md**: Configuration management và calibration

## Workflow

Sau khi đã chốt phần cứng (folder `02-hardware/`), thiết kế firmware dựa trên:
- Các component đã chọn (ESP32, LIS3DH, A7600CE‑T)
- Chiến lược quản lý năng lượng (3 chế độ)
- Yêu cầu từ scope (part-02)
