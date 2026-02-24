## PHẦN V: THIẾT KẾ PHẦN MỀM (FIRMWARE) - DATA FORMAT VÀ STATE MACHINE

### V.8 Data Format và Protocol

#### V.8.1 Format Dữ Liệu MQTT

**Topic Structure:**

```
vehicle/{device_id}/telemetry
vehicle/{device_id}/alerts
vehicle/{device_id}/status
```

**Telemetry Message (JSON):**

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "device_id": "TRACKER_001",
  "vehicle_id": "VEHICLE_001",
  "location": {
    "lat": 22.123456,
    "lon": 105.123456,
    "alt": 50.5,
    "speed": 60.0,
    "course": 180.0,
    "satellites": 8
  },
  "obd2": {
    "ign": true,
    "rpm": 2000,
    "speed": 60,
    "fuel": 75,
    "temp": 85
  },
  "power": {
    "battery_voltage": 12.5,
    "backup_battery": 3.8,
    "power_source": "battery",
    "charger_enabled": true
  },
  "status": {
    "mode": "driving",
    "signal_strength": 20
  }
}
```

**Lưu Ý:**

- Phase 1: Không có booking context, chỉ theo dõi xe và khách hàng
- [Phase 2] Server sẽ tự động liên kết với `booking_id` dựa trên `vehicle_id` và thời gian hiện tại (nếu có booking active)

**Alert Message (JSON):**

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "device_id": "TRACKER_001",
  "vehicle_id": "VEHICLE_001",
  "alert_type": "motion_detected",
  "severity": "high",
  "location": {
    "lat": 22.123456,
    "lon": 105.123456
  },
  "description": "Vehicle movement detected while parked"
}
```

**Các Loại Alert:**

**Phase 1:**

- `motion_detected`: Xe di chuyển khi đỗ (cảnh báo cao)
- `geofence_exit`: Xe ra khỏi vùng cho phép
- `speeding`: Vượt quá tốc độ cho phép
- `low_battery`: Pin backup thấp
- `ignition_on`: Bật máy
- `ignition_off`: Tắt máy

**[Phase 2]:**

- `unauthorized_movement`: Xe di chuyển khi không có booking active
- `unauthorized_movement`: Xe di chuyển ngoài thời gian thuê

**Heartbeat Message (JSON):**

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "device_id": "TRACKER_001",
  "type": "heartbeat",
  "location": {
    "lat": 22.123456,
    "lon": 105.123456
  },
  "power": {
    "battery_voltage": 12.3,
    "backup_battery": 4.0,
    "power_source": "battery"
  },
  "status": "parked"
}
```

#### V.8.2 MQTT Commands từ Server

**Topic:**

```
vehicle/{device_id}/commands
```

**Commands:**

```json
{
  "command": "update_config",
  "params": {
    "heartbeat_interval": 900,
    "tracking_interval": 10
  }
}
```

```json
{
  "command": "request_location",
  "params": {}
}
```

```json
{
  "command": "enable_tracking",
  "params": {
    "duration": 3600
  }
}
```

### V.9 State Machine Chi Tiết

**Các State:**

1. **INIT**: Khởi tạo hệ thống
2. **CHECK_IGN**: Kiểm tra IGN status
3. **DRIVING**: Chế độ lái xe
4. **PARKED**: Chế độ đỗ xe
5. **ALARM**: Chế độ cảnh báo
6. **SLEEP**: Deep sleep
7. **HEARTBEAT**: Gửi heartbeat

**State Transition:**

```
INIT → CHECK_IGN
  │
  ├─ IGN ON → DRIVING
  │   │
  │   └─ IGN OFF → PARKED
  │
  ├─ IGN OFF → PARKED
  │   │
  │   └─ Motion → ALARM
  │
  └─ Timer/IMU → HEARTBEAT → SLEEP
```

**Điều Kiện Chuyển State:**

- **INIT → CHECK_IGN**: Sau khi khởi tạo xong
- **CHECK_IGN → DRIVING**: IGN = ON
- **CHECK_IGN → PARKED**: IGN = OFF
- **DRIVING → PARKED**: IGN = OFF được phát hiện
- **PARKED → ALARM**: IMU interrupt (motion detected)
- **PARKED → HEARTBEAT**: Timer wake-up
- **ALARM → PARKED**: Motion stopped, IGN = OFF
- **HEARTBEAT → SLEEP**: Sau khi gửi heartbeat
- **SLEEP → CHECK_IGN**: Wake-up từ timer hoặc IMU
