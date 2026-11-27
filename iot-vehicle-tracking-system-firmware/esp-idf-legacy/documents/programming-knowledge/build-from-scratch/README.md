# Build From Scratch — Tự code lại firmware từ đầu

Bộ tài liệu này hướng dẫn **tự xây dựng lại toàn bộ firmware ESP32-S3** của dự án IoT Vehicle Tracking System, từ thư mục trống cho tới firmware chạy được — theo đúng kiến trúc của codebase hiện tại.

Khác với thư mục `firmware-programming-guide/` (reference theo chủ đề: FreeRTOS, MQTT, OTA…), bộ này là **tutorial tuyến tính**: bạn code theo thứ tự từng bước, mỗi bước build được và hiểu được lý do.

## Bộ này dành cho ai

- Bạn muốn hiểu **vì sao** firmware được tách thành nhiều `component` thay vì 1 đống file trong `main/`.
- Bạn muốn tự dựng lại từng lớp (layer) và tự tay wiring chúng với nhau.
- Bạn cần nắm pattern **Clean Architecture + Dependency Injection** áp dụng trên C/ESP-IDF.

## Yêu cầu trước khi bắt đầu

- Đã đọc `../getting_started_for_firmware_devs.md` và `../glossary.md`.
- Đã cài ESP-IDF (xem `01-thiet-lap-moi-truong-esp-idf.md`).
- Biết C cơ bản: con trỏ, struct, function pointer, `static`, header guard.
- Có ESP32-S3 + module SIM7600 nếu muốn test thật (không bắt buộc để build).

## Triết lý xuyên suốt

1. **Xây từ dưới lên (bottom-up).** Lớp không phụ thuộc ai (models, config) làm trước; lớp điều phối (FSM, bootstrap) làm cuối.
2. **Mỗi component là 1 thư viện độc lập** với `CMakeLists.txt` riêng, khai báo rõ nó `REQUIRES` ai.
3. **App-core không gọi thẳng driver.** Nó gọi qua _port_ (struct chứa function pointer). Adapter mới chỉ cần điền port — không sửa FSM.
4. **Mỗi bước phải build pass** trước khi sang bước sau. Đừng dồn 5 lớp rồi mới `idf.py build`.

## Lộ trình (đọc theo thứ tự)

| #   | File                                                                             | Lớp xây dựng                             | Build được gì                |
| --- | -------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------- |
| 00  | [00-tong-quan-kien-truc-va-lo-trinh.md](./00-tong-quan-kien-truc-va-lo-trinh.md) | —                                        | Hiểu bản đồ tổng thể         |
| 01  | [01-thiet-lap-moi-truong-esp-idf.md](./01-thiet-lap-moi-truong-esp-idf.md)       | Project skeleton                         | `app_main` chạy, in log      |
| 02  | [02-shared-kernel-models-va-config.md](./02-shared-kernel-models-va-config.md)   | `shared-kernel`                          | Types + config defaults      |
| 03  | [03-contracts-device-cloud.md](./03-contracts-device-cloud.md)                   | `contracts-device-cloud`                 | JSON payload formatter       |
| 04  | [04-platform-board-va-pin-map.md](./04-platform-board-va-pin-map.md)             | `platform-board-esp32s3`                 | Pin map + power GPIO         |
| 05  | [05-ports-va-dependency-injection.md](./05-ports-va-dependency-injection.md)     | `platform-hal-esp-idf`                   | Port registry (DI)           |
| 06  | [06-adapter-nvs-config-store.md](./06-adapter-nvs-config-store.md)               | `adapter-kv-nvs`                         | Lưu/đọc config NVS           |
| 07  | [07-adapter-modem-sim7600.md](./07-adapter-modem-sim7600.md)                     | `adapter-modem-sim7600-at`               | AT transport + LTE + GNSS    |
| 08  | [08-adapter-mqtt-va-ble-obd.md](./08-adapter-mqtt-va-ble-obd.md)                 | `adapter-mqtt`, `adapter-ble-obd`        | MQTT publish + OBD đọc PID   |
| 09  | [09-adapter-rtc-va-storage.md](./09-adapter-rtc-va-storage.md)                   | `adapter-rtc-ds3231m`, `adapter-storage` | RTC + offline queue          |
| 10  | [10-domain-telemetry-va-fusion.md](./10-domain-telemetry-va-fusion.md)           | `domain-*`                               | Logic fusion ignition/motion |
| 11  | [11-app-core-state-machine.md](./11-app-core-state-machine.md)                   | `app-core` (FSM)                         | State machine chạy           |
| 12  | [12-bootstrap-wiring-va-main.md](./12-bootstrap-wiring-va-main.md)               | bootstrap + `main.c`                     | Wiring toàn bộ port          |
| 13  | [13-power-sleep-ota-va-validation.md](./13-power-sleep-ota-va-validation.md)     | power/sleep/OTA                          | Firmware hoàn chỉnh          |

## Cách dùng tài liệu

- Mỗi file có phần **"Mục tiêu bước này"**, **"Code"**, **"Vì sao thiết kế vậy"**, **"Build & kiểm tra"**, **"Bẫy thường gặp"**.
- Code trong tài liệu là phiên bản **rút gọn để học** (đã giữ đúng signature và pattern thật). Khi cần bản đầy đủ, đối chiếu file nguồn được trỏ trong mỗi bước.
- Tên component/file giữ **đúng như codebase thật** để bạn dễ tra cứu chéo.

## Quy ước trong bộ tài liệu

- `🎯` mục tiêu — `🧩` code — `💡` lý do thiết kế — `🔧` build/test — `⚠️` bẫy.
- Đường dẫn nguồn ghi tương đối từ `iot-vehicle-tracking-system-firmware/`.
- Độ tin cậy: phần kiến trúc/source = **cao**; phần số liệu phần cứng (dòng, mức logic) = **trung bình**, cần bench test.

## Bản đồ nhanh component → trách nhiệm

```
shared-kernel            → models, config, util, retry, fsm_types (không phụ thuộc ai)
contracts-device-cloud   → hợp đồng payload JSON + OTA giữa firmware và cloud
platform-board-esp32s3   → pin map, power GPIO, board-specific
platform-hal-esp-idf     → định nghĩa PORT (interface) cho mọi subsystem
adapter-*                → triển khai thật cho từng phần cứng (modem, mqtt, ble, rtc, nvs, sd)
domain-*                 → logic nghiệp vụ thuần (telemetry fusion, obd, ota policy, storage)
app-core                 → FSM trung tâm + bootstrap + wiring (DI) toàn bộ port
main/                    → entry point mỏng, gọi app-core
```

Bắt đầu tại **[00 — Tổng quan kiến trúc và lộ trình](./00-tong-quan-kien-truc-va-lo-trinh.md)**.
