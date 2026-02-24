## PHẦN V: THIẾT KẾ PHẦN MỀM (FIRMWARE) - POWER MANAGEMENT VÀ GPIO

### V.6 Power Path Management Control

#### V.6.1 Điều Khiển MOSFET Power MUX

**GPIO Mapping:**

- **GPIO18**: POWER_MUX_SEL (chọn nguồn)
  - LOW (0): Dùng ắc quy (Q1 ON, Q2 OFF)
  - HIGH (1): Dùng pin (Q1 OFF, Q2 ON)

**Logic Điều Khiển:**

```c
// Chọn nguồn ắc quy
void select_battery_power() {
    gpio_set_level(POWER_MUX_SEL, 0);  // Q1 ON, Q2 OFF
}

// Chọn nguồn pin
void select_backup_power() {
    gpio_set_level(POWER_MUX_SEL, 1);  // Q1 OFF, Q2 ON
}
```

**Flowchart:**

```
Đọc U_batt (ADC)
  │
  ├─ IGN = ON?
  │   └─ YES → select_battery_power()
  │             DONE
  │
  └─ NO → U_batt < 12.0 V?
           ├─ YES → select_backup_power()
           │         Gửi cảnh báo
           │         DONE
           │
           └─ NO → U_batt > 12.2 V?
                    ├─ YES → select_battery_power()
                    │         Gửi cảnh báo phục hồi
                    │         DONE
                    │
                    └─ NO → Giữ nguyên trạng thái
                              DONE
```

#### V.6.2 Điều Khiển Charger (IP2312)

**GPIO Mapping:**

- **GPIO5**: CHARGER_EN (enable charger)
  - HIGH (1): Charger enabled (sạc pin)
  - LOW (0): Charger disabled (không sạc)

**Logic Điều Khiển:**

```c
// Bật sạc pin
void enable_charger() {
    gpio_set_level(CHARGER_EN, 1);
}

// Tắt sạc pin
void disable_charger() {
    gpio_set_level(CHARGER_EN, 0);
}
```

**Điều Kiện Sạc:**

- **IGN ON** + **U_batt > 12 V** → Enable charger
- **IGN OFF** → Disable charger (bảo vệ ắc quy)
- **U_batt < 12 V** → Disable charger (bảo vệ ắc quy)

#### V.6.3 Đọc Trạng Thái LVD

**GPIO Mapping:**

- **GPIO19**: LVD_STATUS (đọc từ comparator LM393)
  - HIGH (1): U_batt > 12 V
  - LOW (0): U_batt < 12 V

**Đọc Trạng Thái:**

```c
bool read_lvd_status() {
    return gpio_get_level(LVD_STATUS);
}
```

**Sử Dụng:**

- **Backup cho ADC**: Nếu ADC lỗi, có thể dùng LVD status
- **Fast check**: Đọc nhanh trạng thái nguồn
- **Hysteresis**: Comparator tự xử lý hysteresis (12.0V → 12.2V)

### V.7 GPIO Mapping và Configuration

**GPIO Định Nghĩa:**

| GPIO | Chức Năng        | Hướng  | Mô Tả                           |
| ---- | ---------------- | ------ | ------------------------------- |
| 2    | IGN_IN           | Input  | Đọc IGN status (GPIO hoặc OBD2) |
| 4    | U_BATT_ADC       | Input  | Đọc điện áp ắc quy (ADC)        |
| 5    | CHARGER_EN       | Output | Điều khiển IP2312 charger       |
| 18   | POWER_MUX_SEL    | Output | Chọn nguồn (Q1/Q2)              |
| 19   | LVD_STATUS       | Input  | Đọc trạng thái LVD              |
| 21   | LIS3DH_INT       | Input  | Interrupt từ IMU                |
| 22   | LIS3DH_SDA (I2C) | I/O    | I2C data                        |
| 23   | LIS3DH_SCL (I2C) | I/O    | I2C clock                       |
| 16   | MODEM_UART_TX    | Output | UART TX đến modem               |
| 17   | MODEM_UART_RX    | Input  | UART RX từ modem                |
| 25   | MODEM_PWRKEY     | Output | Điều khiển power modem          |

**Lưu Ý:**

- **GPIO 34–39**: Chỉ input, không có pull-up/pull-down
- **ADC**: GPIO 0–15, 25–27 (12-bit)
- **Deep Sleep Wake-up**: EXT0 (GPIO 0–31), EXT1 (GPIO 32–39)

