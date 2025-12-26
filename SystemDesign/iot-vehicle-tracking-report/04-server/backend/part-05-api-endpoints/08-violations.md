## PHẦN XI.8: VIOLATIONS APIs

### XI.8 Violations APIs

#### GET /api/violations

**Mô tả:** Lấy danh sách vi phạm

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 20)
- `vehicle_id` (number, optional)
- `customer_id` (number, optional)
- `violation_type` (string, optional)
- `severity` (string, optional)
- `acknowledged` (boolean, optional)
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
      "customer": {
        "id": 1,
        "full_name": "Nguyễn Văn A"
      },
      "trip": {
        "id": 1,
        "trip_id": "TRIP-20240115-001"
      },
      "booking_id": null,
      "violation_type": "speeding",
      "severity": "medium",
      "speed_limit": 80.0,
      "actual_speed": 85.0,
      "location": {
        "lat": 21.028511,
        "lon": 105.804817
      },
      "violation_time": "2024-01-15T09:30:00Z",
      "fine_amount": 0,
      "acknowledged": false,
      "created_at": "2024-01-15T09:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 30,
    "totalPages": 2
  }
}
```

---

#### GET /api/violations/:id

**Mô tả:** Lấy chi tiết vi phạm

**Response (200 OK):**

```json
{
  "id": 1,
  "booking_id": null,
  "vehicle": {
    "id": 1,
    "plate_number": "30A-12345"
  },
  "customer": {
    "id": 1,
    "full_name": "Nguyễn Văn A"
  },
  "trip": {
    "id": 1,
    "trip_id": "TRIP-20240115-001"
  },
  "violation_type": "speeding",
  "severity": "medium",
  "speed_limit": 80.0,
  "actual_speed": 85.0,
  "location": {
    "lat": 21.028511,
    "lon": 105.804817,
    "address": "123 Đường ABC, Hà Nội"
  },
  "violation_time": "2024-01-15T09:30:00Z",
  "description": "Vượt quá tốc độ cho phép 5 km/h",
  "fine_amount": 0,
  "acknowledged": false,
  "acknowledged_by": null,
  "acknowledged_at": null,
  "created_at": "2024-01-15T09:30:00Z"
}
```

---

#### PUT /api/violations/:id/acknowledge

**Mô tả:** Acknowledge vi phạm

**Request:**

```json
{
  "fine_amount": 500000,
  "notes": "Phạt vi phạm tốc độ"
}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "acknowledged": true,
  "acknowledged_by": 1,
  "acknowledged_at": "2024-01-15T11:00:00Z",
  "fine_amount": 500000
}
```

---

