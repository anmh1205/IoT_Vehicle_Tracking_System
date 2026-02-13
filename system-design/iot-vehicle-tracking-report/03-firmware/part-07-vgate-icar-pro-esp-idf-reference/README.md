# PHẦN V.7: THAM KHẢO FIRMWARE ESP-IDF CHO VGATE ICAR PRO

Tài liệu này đã được tách thành các file chi tiết:

- [`01-overview.md`](./01-overview.md) - Tổng quan project và cấu trúc
- [`02-architecture.md`](./02-architecture.md) - Kiến trúc BLE OBD2
- [`03-vgate-specs.md`](./03-vgate-specs.md) - VGATE iCar Pro BLE Specifications
- [`04-code-implementation.md`](./04-code-implementation.md) - Code Implementation chi tiết
- [`05-obd2-commands.md`](./05-obd2-commands.md) - OBD2 Commands và Responses
- [`06-application-flow.md`](./06-application-flow.md) - Application Flow
- [`07-error-handling.md`](./07-error-handling.md) - Error Handling và Retry Logic
- [`08-best-practices.md`](./08-best-practices.md) - Best Practices và Tips
- [`09-troubleshooting.md`](./09-troubleshooting.md) - Troubleshooting
- [`10-code-examples.md`](./10-code-examples.md) - Code Examples
- [`11-references.md`](./11-references.md) - Tài Liệu Tham Khảo

---

## Tổng Quan

**Nguồn:** [esp32-obd2-meter](https://gitlab.com/janoskut/esp32-obd2-meter)

**Mô Tả:**

- Firmware cho ESP32-S3 kết nối với OBD2 BLE adapter (vgate iCar Pro)
- Sử dụng ESP-IDF framework với NimBLE stack
- Hiển thị dữ liệu OBD2 real-time trên LCD (LVGL)

**Tech Stack:**

- **ESP-IDF**: v5.4.1
- **NimBLE**: BLE stack của Espressif
- **LVGL**: GUI framework (cho display)
- **FreeRTOS**: RTOS cho multitasking

---

