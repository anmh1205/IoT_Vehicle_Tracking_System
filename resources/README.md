# Resources — IoT Vehicle Tracking System

> Index file cho thư mục `resources/`. Mỗi folder = 1 domain rõ ràng.

---

## Coding Plans (Agent đọc để implement)

| Folder | Mô tả | Entry Point |
|--------|--------|-------------|
| **`cloud-coding-plan/`** | Backend, Frontend, Mobile, Infra — 20 spec files + compact phases | `00-README.md` |
| **`firmware-coding-plan/`** | ESP32-S3 firmware — 6 sub-phases (8A→8F) | `80-firmware-architecture.md` |
| **`enhance/`** | Frontend UI upgrade plans (EH-0→EH-5) vs IVM26 reference | `00-README.md` |

## Design Reports (Đọc tham khảo, không implement trực tiếp)

| Folder | Mô tả |
|--------|--------|
| **`design-reports/`** | System design reports & original plans |
| ├── `firmware-development-plan.md` | Firmware dev plan gốc (Vietnamese, 22KB) |
| ├── `cloud-system-audit-report.md` | Cloud system audit report (26KB) |
| └── `iot-vehicle-tracking-report/` | Full system design report (Vietnamese, 130+ files) — hardware, firmware, backend, frontend |

## Reference Materials

| Folder | Mô tả |
|--------|--------|
| **`example/`** | Reference code — `esp32-obd2-meter/` (ESP-IDF BLE OBD2 firmware) |
| **`template/`** | Generic IoT project template (reusable starter kit) |
