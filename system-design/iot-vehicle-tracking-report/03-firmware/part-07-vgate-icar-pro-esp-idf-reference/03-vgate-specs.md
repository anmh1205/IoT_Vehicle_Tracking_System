## PHẦN V.7.4: VGATE ICAR PRO BLE SPECIFICATIONS

### V.7.4 VGATE ICAR PRO BLE SPECIFICATIONS

#### V.7.4.1 Service và Characteristics UUIDs

**Service UUID:**

- **0x18F0** - OBD2 Service (16-bit UUID)

**Characteristics:**

- **TX Characteristic**: `0x2AF1` - Gửi OBD2 commands
- **RX Characteristic**: `0x2AF0` - Nhận OBD2 responses (notify)

**Code Definition:**

```c
// main/src/ble_obd.c
static ble_gatt_char_def_t obd_svc_chars1[] = {
    /* TX */ {.uuid = "0x2af1", .notify_cb = NULL},
    /* RX */ {.uuid = "0x2af0", .notify_cb = ble_obd_notify_cb},
};

static const ble_mgr_svc_def_t obd_svc_def1 = {
    .service_uuid = "0x18f0",
    .chars        = obd_svc_chars1,
    .num_chars    = ARRAY_SIZE(obd_svc_chars1),
};
```

#### V.7.4.2 GATT Communication Flow

```
ESP32-S3 (Central)                    vgate iCar Pro (Peripheral)
     │                                         │
     │  ──────── Scan & Discover ────────>  │
     │                                         │
     │  <─────── Advertisement ─────────────  │
     │  (Service UUID: 0x18F0)                │
     │                                         │
     │  ──────── Connect ──────────────────>  │
     │                                         │
     │  ──────── Discover Services ─────────>  │
     │  <─────── Service: 0x18F0 ───────────  │
     │                                         │
     │  ──────── Discover Characteristics ─>  │
     │  <─────── TX: 0x2AF1, RX: 0x2AF0 ────  │
     │                                         │
     │  ──────── Enable Notify (RX) ────────>  │
     │  (Write CCCD: 0x0100)                   │
     │                                         │
     │  ──────── Write TX: "010C\r" ────────>  │
     │  (Request RPM - PID 0x0C)              │
     │                                         │
     │  <─────── Notify RX: "41 0C 1F 40" ───  │
     │  (Response: mode 0x41, PID 0x0C, data) │
     │                                         │
     │  <─────── Notify RX: ">\r" ───────────  │
     │  (Prompt - ready for next command)     │
```

---

