## PHẦN XI.6: TELEMETRY APIs

### XI.6 Telemetry APIs

#### GET /api/telemetry/location

**Mô tả:** Lấy dữ liệu vị trí từ InfluxDB

**Query Parameters:**

- `deviceId` (string, required): Device ID
- `startTime` (ISO 8601, required): Thời gian bắt đầu
- `endTime` (ISO 8601, required): Thời gian kết thúc
- `interval` (string, optional): '1m', '5m', '10m', '1h' - Aggregate interval

**Response (200 OK):**

```json
{
  "deviceId": "TRACKER_001",
  "vehicleId": 1,
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
  "totalPoints": 100
}
```

**Errors:**

**400 Bad Request - Missing required parameters:**

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Missing required parameters: deviceId, startTime, endTime",
    "status": 400,
    "path": "/api/v1/telemetry/location",
    "details": {
      "missingFields": ["deviceId", "startTime"]
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
      "deviceId": "TRACKER_999"
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

- `vehicleId` (number, required)
- `startDate` (ISO 8601, required)
- `endDate` (ISO 8601, required)
- `includeStops` (boolean, default: false): Bao gồm điểm dừng

**Response (200 OK):**

```json
{
  "vehicleId": 1,
  "period": {
    "start": "2024-01-15T00:00:00Z",
    "end": "2024-01-15T23:59:59Z"
  },
  "summary": {
    "totalDistanceKm": 250.5,
    "totalDurationMinutes": 480,
    "maxSpeed": 80.0,
    "avgSpeed": 45.0,
    "stopsCount": 5
  },
  "trips": [
    {
      "tripId": 1,
      "startTime": "2024-01-15T08:00:00Z",
      "endTime": "2024-01-15T18:00:00Z",
      "distanceKm": 150.5
    }
  ],
  "stops": [
    {
      "stopType": "parking",
      "arrivalTime": "2024-01-15T10:00:00Z",
      "departureTime": "2024-01-15T10:30:00Z",
      "durationMinutes": 30,
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

> **BACKEND IMPLEMENTATION NOTE**:
>
> - Backend uses **Socket.io** with namespace pattern
> - Connection URL: `ws://host/ws` → namespace `vehicles`
> - Client should use `socket.io-client` library

**WebSocket Connection:**

```
ws://api.example.com/ws (namespace: vehicles)
```

**Subscribe Message:**

```json
{
  "action": "subscribe",
  "vehicleIds": [1, 2, 3]
}
```

**Unsubscribe Message:**

```json
{
  "action": "unsubscribe",
  "vehicleIds": [1]
}
```

**Location Update Message (Server → Client):**

```json
{
  "type": "location",
  "vehicleId": 1,
  "deviceId": "TRACKER_001",
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
