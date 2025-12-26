## PHẦN XI.10: DEVICES APIs

### XI.10 Devices APIs

#### GET /api/devices

**Mô tả:** Lấy danh sách devices

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 20)
- `status` (string, optional): 'active', 'inactive', 'offline', 'error'
- `vehicle_id` (number, optional): Filter theo xe

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "device_id": "TRACKER_001",
      "vehicle": {
        "id": 1,
        "plate_number": "30A-12345"
      },
      "firmware_version": "1.0.0",
      "hardware_version": "1.0",
      "status": "active",
      "last_seen": "2024-01-15T10:00:00Z",
      "battery_level": 85.5,
      "signal_strength": 20
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

---

#### GET /api/devices/:id

**Mô tả:** Lấy chi tiết device

**Response (200 OK):**

```json
{
  "id": 1,
  "device_id": "TRACKER_001",
  "vehicle": {
    "id": 1,
    "plate_number": "30A-12345"
  },
  "device_type": "tracker",
  "firmware_version": "1.0.0",
  "hardware_version": "1.0",
  "imei": "123456789012345",
  "sim_card_number": "0123456789",
  "status": "active",
  "last_seen": "2024-01-15T10:00:00Z",
  "battery_level": 85.5,
  "signal_strength": 20,
  "configurations": [
    {
      "config_key": "heartbeat_interval",
      "config_value": "900"
    },
    {
      "config_key": "tracking_interval",
      "config_value": "10"
    }
  ],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

---

#### POST /api/devices

**Mô tả:** Đăng ký device mới

**Request:**

```json
{
  "device_id": "TRACKER_002",
  "vehicle_id": 2,
  "imei": "123456789012346",
  "sim_card_number": "0987654321",
  "firmware_version": "1.0.0",
  "hardware_version": "1.0"
}
```

**Response (201 Created):**

```json
{
  "id": 2,
  "device_id": "TRACKER_002",
  "status": "active",
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

#### PUT /api/devices/:id/config

**Mô tả:** Cập nhật cấu hình device

**Request:**

```json
{
  "heartbeat_interval": 900,
  "tracking_interval": 10
}
```

**Response (200 OK):**

```json
{
  "device_id": "TRACKER_001",
  "configurations": [
    {
      "config_key": "heartbeat_interval",
      "config_value": "900"
    },
    {
      "config_key": "tracking_interval",
      "config_value": "10"
    }
  ],
  "updated_at": "2024-01-15T11:00:00Z"
}
```

---

