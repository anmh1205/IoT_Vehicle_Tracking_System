## PHẦN XI.10: DEVICES APIs

### XI.10 Devices APIs

#### GET /api/devices

**Mô tả:** Lấy danh sách devices

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 20)
- `status` (string, optional): 'active', 'inactive', 'offline', 'error'
- `vehicleId` (number, optional): Filter theo xe

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "deviceId": "TRACKER_001",
      "vehicle": {
        "id": 1,
        "plateNumber": "30A-12345"
      },
      "firmwareVersion": "1.0.0",
      "hardwareVersion": "1.0",
      "status": "active",
      "lastSeen": "2024-01-15T10:00:00Z",
      "batteryLevel": 85.5,
      "signalStrength": 20
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
  "deviceId": "TRACKER_001",
  "vehicle": {
    "id": 1,
    "plateNumber": "30A-12345"
  },
  "deviceType": "tracker",
  "firmwareVersion": "1.0.0",
  "hardwareVersion": "1.0",
  "imei": "123456789012345",
  "simCardNumber": "0123456789",
  "status": "active",
  "lastSeen": "2024-01-15T10:00:00Z",
  "batteryLevel": 85.5,
  "signalStrength": 20,
  "configurations": [
    {
      "configKey": "heartbeat_interval",
      "configValue": "900"
    },
    {
      "configKey": "tracking_interval",
      "configValue": "10"
    }
  ],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

---

#### POST /api/devices

**Mô tả:** Đăng ký device mới

**Request:**

```json
{
  "deviceId": "TRACKER_002",
  "vehicleId": 2,
  "imei": "123456789012346",
  "simCardNumber": "0987654321",
  "firmwareVersion": "1.0.0",
  "hardwareVersion": "1.0"
}
```

**Response (201 Created):**

```json
{
  "id": 2,
  "deviceId": "TRACKER_002",
  "status": "active",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

---

#### PUT /api/devices/:id/config

**Mô tả:** Cập nhật cấu hình device

**Request:**

```json
{
  "heartbeatInterval": 900,
  "trackingInterval": 10
}
```

**Response (200 OK):**

```json
{
  "deviceId": "TRACKER_001",
  "configurations": [
    {
      "configKey": "heartbeat_interval",
      "configValue": "900"
    },
    {
      "configKey": "tracking_interval",
      "configValue": "10"
    }
  ],
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

**Errors:**

**404 Not Found:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Device with ID 123 not found",
    "status": 404,
    "path": "/api/v1/devices/123",
    "details": null,
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**400 Bad Request - Validation failed:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "status": 400,
    "path": "/api/v1/devices",
    "details": [
      {
        "field": "deviceId",
        "message": "Device ID is required",
        "value": null
      },
      {
        "field": "imei",
        "message": "IMEI must be 15 digits",
        "value": "12345"
      }
    ],
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**409 Conflict - Duplicate device_id:**
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Device with ID 'TRACKER_001' already exists",
    "status": 409,
    "path": "/api/v1/devices",
    "details": {
      "field": "deviceId",
      "existingId": 1
    },
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

