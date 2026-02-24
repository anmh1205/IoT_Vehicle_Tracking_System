## PHẦN XI.8: VIOLATIONS APIs

### XI.8 Violations APIs

#### GET /api/violations

**Mô tả:** Lấy danh sách vi phạm

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 20)
- `vehicleId` (number, optional)
- `customerId` (number, optional)
- `violationType` (string, optional)
- `severity` (string, optional)
- `acknowledged` (boolean, optional)
- `startDate` (ISO 8601, optional)
- `endDate` (ISO 8601, optional)

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "vehicle": {
        "id": 1,
        "plateNumber": "30A-12345"
      },
      "customer": {
        "id": 1,
        "fullName": "Nguyễn Văn A"
      },
      "trip": {
        "id": 1,
        "tripId": "TRIP-20240115-001"
      },
      "bookingId": null,
      "violationType": "speeding",
      "severity": "medium",
      "speedLimit": 80.0,
      "actualSpeed": 85.0,
      "location": {
        "lat": 21.028511,
        "lon": 105.804817
      },
      "violationTime": "2024-01-15T09:30:00Z",
      "fineAmount": 0,
      "acknowledged": false,
      "createdAt": "2024-01-15T09:30:00Z"
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
  "bookingId": null,
  "vehicle": {
    "id": 1,
    "plateNumber": "30A-12345"
  },
  "customer": {
    "id": 1,
    "fullName": "Nguyễn Văn A"
  },
  "trip": {
    "id": 1,
    "tripId": "TRIP-20240115-001"
  },
  "violationType": "speeding",
  "severity": "medium",
  "speedLimit": 80.0,
  "actualSpeed": 85.0,
  "location": {
    "lat": 21.028511,
    "lon": 105.804817,
    "address": "123 Đường ABC, Hà Nội"
  },
  "violationTime": "2024-01-15T09:30:00Z",
  "description": "Vượt quá tốc độ cho phép 5 km/h",
  "fineAmount": 0,
  "acknowledged": false,
  "acknowledgedBy": null,
  "acknowledgedAt": null,
  "createdAt": "2024-01-15T09:30:00Z"
}
```

**Errors:**

**404 Not Found:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Violation with ID 123 not found",
    "status": 404,
    "path": "/api/v1/violations/123",
    "details": null,
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
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
  "acknowledgedBy": 1,
  "acknowledgedAt": "2024-01-15T11:00:00Z",
  "fine_amount": 500000
}
```

---

