## PHẦN V.7.1-2: TỔNG QUAN PROJECT VÀ CẤU TRÚC

### V.7.1 Tổng Quan Project

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

### V.7.2 Cấu Trúc Project

```
esp32-obd2-meter/
├── main/
│   ├── main.c              # Entry point, OBD task, UI callbacks
│   ├── inc/
│   │   ├── ble_init.h      # BLE stack initialization
│   │   ├── ble_mgr.h       # BLE manager (discovery, connection, GATT)
│   │   ├── ble_obd.h       # OBD2 over BLE interface
│   │   ├── ble_util.h      # BLE utilities (address conversion)
│   │   ├── obd.h           # OBD2 PID definitions
│   │   ├── config.h        # Configuration management
│   │   └── ui.h            # UI interface
│   └── src/
│       ├── ble_init.c      # BLE stack init implementation
│       ├── ble_mgr.c       # BLE manager implementation
│       ├── ble_obd.c       # OBD2 over BLE implementation
│       ├── ble_util.c      # BLE utilities
│       ├── config.c        # NVS configuration
│       └── ui.c            # UI implementation
└── bsp/                     # Board support package (LCD, touch)
```

---

