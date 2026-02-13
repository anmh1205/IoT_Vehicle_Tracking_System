## PHẦN V.7.3: KIẾN TRÚC BLE OBD2

### V.7.3 Kiến Trúc BLE OBD2

#### V.7.3.1 Layer Architecture

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│  (main.c - OBD task, UI callbacks)      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         OBD Layer                       │
│  (ble_obd.c - OBD2 protocol handling)  │
│  - Parse OBD responses                  │
│  - Convert PID data                     │
│  - Handle OBD commands                  │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         BLE Manager Layer               │
│  (ble_mgr.c - GATT operations)         │
│  - Device discovery                     │
│  - Service/Characteristic discovery     │
│  - GATT read/write/notify               │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         BLE Stack Layer                 │
│  (ble_init.c - NimBLE initialization)  │
│  - NimBLE stack init                    │
│  - Host task                            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Hardware Layer                  │
│  (ESP32-S3 BLE Controller)             │
└─────────────────────────────────────────┘
```

---

