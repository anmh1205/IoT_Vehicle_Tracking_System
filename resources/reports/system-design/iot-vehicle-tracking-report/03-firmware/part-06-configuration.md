## PHẦN V: THIẾT KẾ PHẦN MỀM (FIRMWARE) - CONFIGURATION MANAGEMENT

### V.10 Configuration Management

**Lưu Trữ Configuration:**

- **Flash/EEPROM**: Lưu cấu hình không đổi
- **RTC Memory**: Lưu trạng thái tạm thời (survive deep sleep)

**Cấu Hình:**

```c
typedef struct {
    char device_id[16];
    char mqtt_broker[64];
    uint16_t mqtt_port;
    char mqtt_username[32];
    char mqtt_password[32];
    uint16_t heartbeat_interval;  // giây
    uint16_t tracking_interval;  // giây
    char obd2_ble_address[18];  // BLE address (MAC) của vgate iCar Pro
    float lvd_threshold;  // 12.0 V
    float lvd_hysteresis;  // 12.2 V
} config_t;
```

**Calibration:**

- **ADC Calibration**: Calibrate ADC để đọc chính xác U_batt
- **IMU Calibration**: Calibrate IMU để giảm offset
- **GNSS Offset**: Calibrate offset GNSS (nếu cần)

