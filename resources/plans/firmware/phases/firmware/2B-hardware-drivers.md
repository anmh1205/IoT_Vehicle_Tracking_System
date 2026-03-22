# Sub-Phase 2B: Hardware Drivers

> **Context:** ~5KB | **Max Files:** 8 | **Est. Time:** 1 session

## Summary
Implement hardware abstraction drivers: ADC battery reader, IMU LIS3DH (I2C + motion interrupt), power manager (MUX, charger, LVD). Tất cả viết mới, không có reference code.

## Tasks
| ID     | Description                              | Files                                             |
| ------ | ---------------------------------------- | ------------------------------------------------- |
| FW-020 | ADC battery voltage reader               | `main/inc/adc_reader.h`, `main/src/adc_reader.c`  |
| FW-021 | IMU LIS3DH driver (I2C)                  | `main/inc/imu_lis3dh.h`, `main/src/imu_lis3dh.c`  |
| FW-022 | IMU motion interrupt config (EXT0 wake)  | In `imu_lis3dh.c` — INT1 -> GPIO21               |
| FW-023 | Power manager (MUX, charger, LVD)        | `main/inc/power_mgr.h`, `main/src/power_mgr.c`    |

## 1. ADC Reader (`adc_reader.c`)

| Item | Detail |
|------|--------|
| Driver | ESP-IDF ADC oneshot |
| Pin | GPIO4 (`U_BATT_ADC`) via voltage divider |
| Calibration | eFuse or manual |
| Sampling | Multi-sample average (8 samples) |

### API
```c
esp_err_t adc_reader_init(void);
float     adc_read_battery_voltage(void);  // Returns voltage in V
void      adc_reader_deinit(void);
```

### Implementation Notes
```c
// Voltage divider: R1=100K, R2=10K -> ratio = 11
// ADC range: 0-3.3V -> battery range: 0-36.3V
// Actual range: 10V-16V (vehicle battery)
#define VOLTAGE_DIVIDER_RATIO  11.0f
#define ADC_SAMPLES            8

// Use ESP-IDF ADC oneshot mode (not continuous)
// adc_oneshot_new_unit() -> adc_oneshot_config_channel() -> adc_oneshot_read()
// Apply calibration: adc_cali_raw_to_voltage()
```

## 2. IMU LIS3DH (`imu_lis3dh.c`)

| Item | Detail |
|------|--------|
| Bus | I2C master (GPIO22=SDA, GPIO23=SCL, 400kHz) |
| Address | 0x18 (SDO/SA0 = GND) or 0x19 (SDO/SA0 = VCC) |
| Interrupt | INT1 -> GPIO21 (motion wakeup from deep sleep) |
| Deep sleep | Configure EXT0 wakeup source on GPIO21 |

### API
```c
esp_err_t imu_init(void);
esp_err_t imu_configure_motion_interrupt(uint8_t threshold_mg, uint8_t duration_ms);
bool      imu_motion_detected(void);            // Read INT1 pin status
esp_err_t imu_read_accel(int16_t *x, int16_t *y, int16_t *z);
uint16_t  imu_get_vibration_composite(void);    // sqrt(x^2+y^2+z^2) mapped to 0-1000
void      imu_deinit(void);
```

### Register Configuration
```c
// CTRL_REG1 (0x20): ODR=10Hz, XYZ enable, low-power mode
// CTRL_REG2 (0x21): HP filter for INT1
// CTRL_REG3 (0x22): IA1 interrupt on INT1 pin
// CTRL_REG4 (0x23): +/-2g range, high resolution
// CTRL_REG5 (0x24): Latch interrupt
// INT1_CFG  (0x30): OR combination, XH+YH+ZH
// INT1_THS  (0x32): Motion threshold
// INT1_DURATION (0x33): Minimum duration

#define LIS3DH_REG_WHO_AM_I    0x0F  // Expected: 0x33
#define LIS3DH_REG_CTRL_REG1   0x20
#define LIS3DH_REG_OUT_X_L     0x28  // Auto-increment: 0x28-0x2D
```

### Vibration Composite Calculation
```c
// Bridge expects vibration value 0-1000
// LIS3DH range: +/-2g = +/-2000 mg per axis
// Composite = sqrt(x^2 + y^2 + z^2) - 1000 (subtract gravity)
// Scale to 0-1000 range
// Bridge alert threshold: VIBRATION_ALERT_THRESHOLD = 500
```

## 3. Power Manager (`power_mgr.c`)

| Item | Detail |
|------|--------|
| Power MUX | GPIO18: select battery (0) / backup (1) |
| Charger | GPIO5: enable IP2312 |
| LVD | GPIO19: read low-voltage status |
| Modem power | GPIO25: PWRKEY toggle (1s pulse) |

### API
```c
esp_err_t power_mgr_init(void);

// Power source control
void power_select_battery(void);    // GPIO18 = 0
void power_select_backup(void);     // GPIO18 = 1

// Charger control
void charger_enable(void);          // GPIO5 = 1
void charger_disable(void);         // GPIO5 = 0

// LVD status
bool power_is_low_voltage(void);    // Read GPIO19

// Modem power
esp_err_t modem_power_on(void);     // GPIO25 pulse 1s HIGH
esp_err_t modem_power_off(void);    // GPIO25 pulse 1s HIGH (toggle)

// Battery check with hysteresis
typedef struct {
    float voltage;
    bool  is_low;
    bool  charger_on;
} power_status_t;

power_status_t power_get_status(float lvd_threshold_v, float lvd_hysteresis_v);
```

### Power Logic
```c
// Decision matrix:
// IGN ON + U > 12.2V -> battery source + charger ON
// IGN ON + U < 12.0V -> backup source + charger OFF + alert
// IGN OFF             -> backup source + charger OFF
//
// Hysteresis: 12.0V (low) <-> 12.2V (recover)
// Prevents rapid switching near threshold
```

## Dependencies
- ✅ Phase 1A done (pin_map.h, util.h)
- ⚠️ Independent from Phase 2A, 2C (can run in parallel)
- ➡️ Phase 3A (MQTT) needs `adc_read_battery_voltage()` and `imu_get_vibration_composite()`
- ➡️ Phase 4A (State Machine) needs all power manager APIs

## Verification
- [ ] `idf.py build` — compiles without errors
- [ ] ADC reads battery voltage within 10-16V range (measure with multimeter)
- [ ] IMU WHO_AM_I returns 0x33 (LIS3DH confirmed)
- [ ] IMU motion interrupt triggers on GPIO21 (shake board)
- [ ] Deep sleep wakeup via EXT0 (GPIO21) works
- [ ] Power MUX switches between battery/backup (measure output)
- [ ] Charger enable/disable toggles GPIO5
- [ ] LVD status reads correctly from GPIO19
- [ ] Modem PWRKEY pulse works (GPIO25 toggles for 1s)

## Full Spec Reference
- [00-firmware-architecture.md](../../00-firmware-architecture.md) — Section 4 (GPIO Pin Map)
- [firmware-development-plan.md](../../../../reports/system-design/firmware-development/firmware-development-plan.md) — Phase 1
