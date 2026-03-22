## PHẦN XI.5: TRIPS APIs

### XI.5 Trips APIs

#### GET /api/trips

**Mô tả:** Lấy danh sách chuyến đi

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 20)
- `vehicleId` (number, optional): Filter theo xe
- `customerId` (number, optional): Filter theo khách hàng
- `status` (string, optional): 'in_progress', 'completed', 'cancelled'
- `startDate` (ISO 8601, optional): Từ ngày
- `endDate` (ISO 8601, optional): Đến ngày

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "tripId": "TRIP-20240115-001",
      "vehicle": {
        "id": 1,
        "plateNumber": "30A-12345"
      },
      "customer": {
        "id": 1,
        "fullName": "Nguyễn Văn A"
      },
      "startTime": "2024-01-15T08:00:00Z",
      "endTime": "2024-01-15T18:00:00Z",
      "distanceKm": 150.5,
      "durationMinutes": 600,
      "maxSpeed": 80.0,
      "avgSpeed": 45.0,
      "status": "completed"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 200,
    "totalPages": 10
  }
}
```

---

#### GET /api/trips/:id

**Mô tả:** Lấy chi tiết chuyến đi

**Response (200 OK):**

```json
{
  "id": 1,
  "tripId": "TRIP-20240115-001",
  "bookingId": null,
  "vehicle": {
    "id": 1,
    "plateNumber": "30A-12345",
    "brand": "Toyota",
    "model": "Camry"
  },
  "customer": {
    "id": 1,
    "fullName": "Nguyễn Văn A",
    "phone": "0123456789"
  },
  "startTime": "2024-01-15T08:00:00Z",
  "endTime": "2024-01-15T18:00:00Z",
  "startLocation": {
    "lat": 21.028511,
    "lon": 105.804817,
    "address": "123 Đường ABC, Hà Nội"
  },
  "endLocation": {
    "lat": 20.998511,
    "lon": 105.824817,
    "address": "456 Đường XYZ, Hà Nội"
  },
  "distanceKm": 150.5,
  "durationMinutes": 600,
  "maxSpeed": 80.0,
  "avgSpeed": 45.0,
  "mileageAtStart": 15000,
  "mileageAtEnd": 15150,
  "status": "completed",
  "events": [
    {
      "id": 1,
      "eventType": "ignition_on",
      "eventTime": "2024-01-15T08:00:00Z",
      "location": {
        "lat": 21.028511,
        "lon": 105.804817
      }
    },
    {
      "id": 2,
      "event_type": "speeding",
      "event_time": "2024-01-15T09:30:00Z",
      "speed": 85.0,
      "description": "Vượt quá tốc độ 80 km/h"
    }
  ],
  "stops": [
    {
      "id": 1,
      "stopType": "parking",
      "arrival_time": "2024-01-15T10:00:00Z",
      "departure_time": "2024-01-15T10:30:00Z",
      "durationMinutes": 30,
      "location": {
        "lat": 21.018511,
        "lon": 105.814817,
        "address": "Bãi đỗ xe ABC"
      }
    }
  ],
  "violations": [
    {
      "id": 1,
      "violationType": "speeding",
      "violation_time": "2024-01-15T09:30:00Z",
      "speed_limit": 80.0,
      "actualSpeed": 85.0,
      "severity": "medium"
    }
  ],
  "createdAt": "2024-01-15T08:00:00Z"
}
```

---

#### GET /api/trips/:id/route

**Mô tả:** Lấy route (tuyến đường) của chuyến đi từ InfluxDB

**Query Parameters:**

- `interval` (string, optional): '1m', '5m', '10m' - Khoảng thời gian giữa các điểm

**Response (200 OK):**

```json
{
  "tripId": 1,
  "route": [
    {
      "lat": 21.028511,
      "lon": 105.804817,
      "speed": 0.0,
      "timestamp": "2024-01-15T08:00:00Z"
    },
    {
      "lat": 21.029511,
      "lon": 105.805817,
      "speed": 45.0,
      "timestamp": "2024-01-15T08:01:00Z"
    }
  ],
  "total_points": 600
}
```

**Errors:**

**404 Not Found - Trip not found:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Trip with ID 123 not found",
    "status": 404,
    "path": "/api/v1/trips/123",
    "details": null,
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

