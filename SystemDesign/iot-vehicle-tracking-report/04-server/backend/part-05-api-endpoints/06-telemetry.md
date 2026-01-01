## PHẦN XI.6: TELEMETRY APIs

### XI.6 Telemetry APIs

#### GET /api/telemetry/location

**Mô tả:** Lấy dữ liệu vị trí từ InfluxDB

**Query Parameters:**

- `device_id` (string, required): Device ID
- `start_time` (ISO 8601, required): Thời gian bắt đầu
- `end_time` (ISO 8601, required): Thời gian kết thúc
- `interval` (string, optional): '1m', '5m', '10m', '1h' - Aggregate interval

**Response (200 OK):**

```json
{
  "device_id": "TRACKER_001",
  "vehicle_id": 1,
  "data": [
    {
      "lat": 21.028511,
      "lon": 105.804817,
      "alt": 50.5,
      "speed": 60.0,
      "course": 180.0,
      "satellites": 8,
      "timestamp": "2024-01-15T10:00:00Z"
    }
  ],
  "total_points": 100
}
```

**Errors:**

**400 Bad Request - Missing required parameters:**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Missing required parameters: device_id, start_time, end_time",
    "status": 400,
    "path": "/api/v1/telemetry/location",
    "details": {
      "missing_fields": ["device_id", "start_time"]
    },
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**404 Not Found - Device not found:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Device with ID 'TRACKER_999' not found",
    "status": 404,
    "path": "/api/v1/telemetry/location",
    "details": {
      "device_id": "TRACKER_999"
    },
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### GET /api/telemetry/history

**Mô tả:** Lấy lịch sử di chuyển của xe trong khoảng thời gian

**Query Parameters:**

- `vehicle_id` (number, required)
- `start_date` (ISO 8601, required)
- `end_date` (ISO 8601, required)
- `include_stops` (boolean, default: false): Bao gồm điểm dừng

**Response (200 OK):**

```json
{
  "vehicle_id": 1,
  "period": {
    "start": "2024-01-15T00:00:00Z",
    "end": "2024-01-15T23:59:59Z"
  },
  "summary": {
    "total_distance_km": 250.5,
    "total_duration_minutes": 480,
    "max_speed": 80.0,
    "avg_speed": 45.0,
    "stops_count": 5
  },
  "trips": [
    {
      "trip_id": 1,
      "start_time": "2024-01-15T08:00:00Z",
      "end_time": "2024-01-15T18:00:00Z",
      "distance_km": 150.5
    }
  ],
  "stops": [
    {
      "stop_type": "parking",
      "arrival_time": "2024-01-15T10:00:00Z",
      "departure_time": "2024-01-15T10:30:00Z",
      "duration_minutes": 30,
      "location": {
        "lat": 21.018511,
        "lon": 105.814817
      }
    }
  ]
}
```

---

#### GET /api/telemetry/realtime

**Mô tả:** WebSocket endpoint cho real-time location updates

**WebSocket Connection:**

```
ws://api.example.com/api/telemetry/realtime
```

**Subscribe Message:**

```json
{
  "action": "subscribe",
  "vehicle_ids": [1, 2, 3]
}
```

**Unsubscribe Message:**

```json
{
  "action": "unsubscribe",
  "vehicle_ids": [1]
}
```

**Location Update Message (Server → Client):**

```json
{
  "type": "location",
  "vehicle_id": 1,
  "device_id": "TRACKER_001",
  "data": {
    "lat": 21.028511,
    "lon": 105.804817,
    "speed": 60.0,
    "course": 180.0,
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

---

