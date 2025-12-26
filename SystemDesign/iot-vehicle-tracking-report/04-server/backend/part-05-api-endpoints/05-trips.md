## PHẦN XI.5: TRIPS APIs

### XI.5 Trips APIs

#### GET /api/trips

**Mô tả:** Lấy danh sách chuyến đi

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 20)
- `vehicle_id` (number, optional): Filter theo xe
- `customer_id` (number, optional): Filter theo khách hàng
- `status` (string, optional): 'in_progress', 'completed', 'cancelled'
- `start_date` (ISO 8601, optional): Từ ngày
- `end_date` (ISO 8601, optional): Đến ngày

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "trip_id": "TRIP-20240115-001",
      "vehicle": {
        "id": 1,
        "plate_number": "30A-12345"
      },
      "customer": {
        "id": 1,
        "full_name": "Nguyễn Văn A"
      },
      "start_time": "2024-01-15T08:00:00Z",
      "end_time": "2024-01-15T18:00:00Z",
      "distance_km": 150.5,
      "duration_minutes": 600,
      "max_speed": 80.0,
      "avg_speed": 45.0,
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
  "trip_id": "TRIP-20240115-001",
  "booking_id": null,
  "vehicle": {
    "id": 1,
    "plate_number": "30A-12345",
    "brand": "Toyota",
    "model": "Camry"
  },
  "customer": {
    "id": 1,
    "full_name": "Nguyễn Văn A",
    "phone": "0123456789"
  },
  "start_time": "2024-01-15T08:00:00Z",
  "end_time": "2024-01-15T18:00:00Z",
  "start_location": {
    "lat": 21.028511,
    "lon": 105.804817,
    "address": "123 Đường ABC, Hà Nội"
  },
  "end_location": {
    "lat": 20.998511,
    "lon": 105.824817,
    "address": "456 Đường XYZ, Hà Nội"
  },
  "distance_km": 150.5,
  "duration_minutes": 600,
  "max_speed": 80.0,
  "avg_speed": 45.0,
  "mileage_at_start": 15000,
  "mileage_at_end": 15150,
  "status": "completed",
  "events": [
    {
      "id": 1,
      "event_type": "ignition_on",
      "event_time": "2024-01-15T08:00:00Z",
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
      "stop_type": "parking",
      "arrival_time": "2024-01-15T10:00:00Z",
      "departure_time": "2024-01-15T10:30:00Z",
      "duration_minutes": 30,
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
      "violation_type": "speeding",
      "violation_time": "2024-01-15T09:30:00Z",
      "speed_limit": 80.0,
      "actual_speed": 85.0,
      "severity": "medium"
    }
  ],
  "created_at": "2024-01-15T08:00:00Z"
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
  "trip_id": 1,
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

---

