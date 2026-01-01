## PHẦN XI.9: COMMANDS APIs (MQTT)

### XI.9 Commands APIs (MQTT)

#### POST /api/commands/:device_id

**Mô tả:** Gửi command đến tracker qua MQTT

**Request:**

```json
{
  "command": "update_config",
  "params": {
    "heartbeat_interval": 900,
    "tracking_interval": 10
  }
}
```

**Hoặc:**

```json
{
  "command": "request_location",
  "params": {}
}
```

**Hoặc:**

```json
{
  "command": "enable_tracking",
  "params": {
    "duration": 3600
  }
}
```

**Response (200 OK):**

```json
{
  "command_id": 1,
  "device_id": "TRACKER_001",
  "command": "update_config",
  "status": "sent",
  "sent_at": "2024-01-15T10:00:00Z"
}
```

**Errors:**

**404 Not Found - Device not found or offline:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Device with ID 'TRACKER_001' not found or is offline",
    "status": 404,
    "path": "/api/v1/commands/TRACKER_001",
    "details": {
      "device_id": "TRACKER_001"
    },
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**400 Bad Request - Invalid command:**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid command or parameters",
    "status": 400,
    "path": "/api/v1/commands/TRACKER_001",
    "details": {
      "command": "invalid_command",
      "allowed_commands": ["update_config", "request_location", "enable_tracking"]
    },
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### GET /api/commands

**Mô tả:** Lấy danh sách commands đã gửi

**Query Parameters:**

- `device_id` (string, optional)
- `status` (string, optional): 'pending', 'sent', 'acknowledged', 'failed'
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "device_id": "TRACKER_001",
      "command_type": "update_config",
      "status": "acknowledged",
      "sent_at": "2024-01-15T10:00:00Z",
      "acknowledged_at": "2024-01-15T10:00:05Z",
      "response_data": {
        "success": true
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

