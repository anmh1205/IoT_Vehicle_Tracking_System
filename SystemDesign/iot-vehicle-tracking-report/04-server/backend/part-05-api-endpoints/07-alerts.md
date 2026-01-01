## PHẦN XI.7: ALERTS APIs

### XI.7 Alerts APIs

#### GET /api/alerts

**Mô tả:** Lấy danh sách cảnh báo

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 20)
- `vehicle_id` (number, optional): Filter theo xe
- `alert_type` (string, optional): Filter theo loại alert
- `severity` (string, optional): 'low', 'medium', 'high', 'critical'
- `acknowledged` (boolean, optional): Filter theo trạng thái acknowledge
- `start_date` (ISO 8601, optional)
- `end_date` (ISO 8601, optional)

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "vehicle": {
        "id": 1,
        "plate_number": "30A-12345"
      },
      "booking_id": null,
      "alert_type": "motion_detected",
      "severity": "high",
      "title": "Xe di chuyển khi đỗ",
      "message": "Phát hiện chuyển động khi xe đang đỗ",
      "location": {
        "lat": 21.028511,
        "lon": 105.804817
      },
      "acknowledged": false,
      "resolved": false,
      "created_at": "2024-01-15T10:00:00Z"
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

#### GET /api/alerts/:id

**Mô tả:** Lấy chi tiết cảnh báo

**Response (200 OK):**

```json
{
  "id": 1,
  "vehicle": {
    "id": 1,
    "plate_number": "30A-12345"
  },
  "booking_id": null,
  "device": {
    "id": 1,
    "device_id": "TRACKER_001"
  },
  "alert_type": "motion_detected",
  "severity": "high",
  "title": "Xe di chuyển khi đỗ",
  "message": "Phát hiện chuyển động khi xe đang đỗ",
  "location": {
    "lat": 21.028511,
    "lon": 105.804817
  },
  "acknowledged": false,
  "acknowledged_by": null,
  "acknowledged_at": null,
  "resolved": false,
  "resolved_by": null,
  "resolved_at": null,
  "created_at": "2024-01-15T10:00:00Z"
}
```

**Errors:**

**404 Not Found:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Alert with ID 123 not found",
    "status": 404,
    "path": "/api/v1/alerts/123",
    "details": null,
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### PUT /api/alerts/:id/acknowledge

**Mô tả:** Acknowledge cảnh báo

**Request:**

```json
{
  "notes": "Đã kiểm tra, không có vấn đề"
}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "acknowledged": true,
  "acknowledged_by": 1,
  "acknowledged_at": "2024-01-15T11:00:00Z"
}
```

---

#### PUT /api/alerts/:id/resolve

**Mô tả:** Resolve cảnh báo

**Request:**

```json
{
  "notes": "Đã xử lý xong"
}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "resolved": true,
  "resolved_by": 1,
  "resolved_at": "2024-01-15T11:30:00Z"
}
```

---

#### GET /api/alerts/realtime

**Mô tả:** WebSocket endpoint cho real-time alerts

**WebSocket Connection:**

```
ws://api.example.com/api/alerts/realtime
```

**Alert Message (Server → Client):**

```json
{
  "type": "alert",
  "data": {
    "id": 1,
    "vehicle_id": 1,
    "alert_type": "motion_detected",
    "severity": "high",
    "title": "Xe di chuyển khi đỗ",
    "location": {
      "lat": 21.028511,
      "lon": 105.804817
    },
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

---

