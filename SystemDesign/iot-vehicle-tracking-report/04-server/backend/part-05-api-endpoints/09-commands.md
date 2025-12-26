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

- `404 Not Found`: Device không tồn tại hoặc offline
- `400 Bad Request`: Command không hợp lệ

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

