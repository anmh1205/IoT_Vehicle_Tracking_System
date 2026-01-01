## PHẦN XI.3: VEHICLES APIs

### XI.3 Vehicles APIs

#### GET /api/vehicles

**Mô tả:** Lấy danh sách xe (có pagination và filter)

**Query Parameters:**

- `page` (number, default: 1): Số trang
- `limit` (number, default: 20): Số item mỗi trang
- `status` (string, optional): Filter theo status ('active', 'inactive', 'maintenance', 'retired')
- `vehicle_type` (string, optional): Filter theo loại xe
- `search` (string, optional): Tìm kiếm theo biển số, brand, model

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "vehicle_id": "VEHICLE_001",
      "plate_number": "30A-12345",
      "brand": "Toyota",
      "model": "Camry",
      "year": 2020,
      "color": "White",
      "vehicle_type": "sedan",
      "status": "active",
      "mileage_km": 15000,
      "device": {
        "id": 1,
        "device_id": "TRACKER_001",
        "status": "active",
        "last_seen": "2024-01-15T10:00:00Z",
        "battery_level": 85.5
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

#### GET /api/vehicles/:id

**Mô tả:** Lấy chi tiết một xe

**Response (200 OK):**

```json
{
  "id": 1,
  "vehicle_id": "VEHICLE_001",
  "plate_number": "30A-12345",
  "owner_id": 1,
  "brand": "Toyota",
  "model": "Camry",
  "year": 2020,
  "color": "White",
  "vin": "JT1234567890",
  "seats": 5,
  "transmission": "automatic",
  "fuel_type": "gasoline",
  "mileage_km": 15000,
  "registration_number": "REG123456",
  "insurance_expiry": "2024-12-31",
  "status": "active",
  "rental_price_per_day": 500000, // [Phase 2]
  "rental_price_per_hour": 50000, // [Phase 2]
  "deposit_amount": 5000000, // [Phase 2]
  "availability_status": "available", // [Phase 2]
  "device": {
    "id": 1,
    "device_id": "TRACKER_001",
    "firmware_version": "1.0.0",
    "status": "active",
    "last_seen": "2024-01-15T10:00:00Z",
    "battery_level": 85.5,
    "signal_strength": 20
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

**Errors:**

**404 Not Found:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Vehicle with ID 123 not found",
    "status": 404,
    "path": "/api/v1/vehicles/123",
    "details": null,
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### POST /api/vehicles

**Mô tả:** Tạo xe mới

**Request:**

```json
{
  "vehicle_id": "VEHICLE_002",
  "plate_number": "30A-12346",
  "brand": "Honda",
  "model": "Civic",
  "year": 2021,
  "color": "Black",
  "vehicle_type": "sedan",
  "vin": "JT1234567891",
  "seats": 5,
  "transmission": "automatic",
  "fuel_type": "gasoline",
  "registration_number": "REG123457",
  "insurance_expiry": "2024-12-31"
}
```

**Response (201 Created):**

```json
{
  "id": 2,
  "vehicle_id": "VEHICLE_002",
  "plate_number": "30A-12346",
  "status": "active",
  "created_at": "2024-01-15T10:00:00Z"
}
```

**Errors:**

**400 Bad Request - Validation failed:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "status": 400,
    "path": "/api/v1/vehicles",
    "details": [
      {
        "field": "plate_number",
        "message": "Plate number is required",
        "value": null
      },
      {
        "field": "vehicle_id",
        "message": "Vehicle ID must be unique",
        "value": "VEHICLE_001"
      }
    ],
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**409 Conflict - Duplicate vehicle_id/plate_number:**
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Vehicle with plate number '30A-12345' already exists",
    "status": 409,
    "path": "/api/v1/vehicles",
    "details": {
      "field": "plate_number",
      "existing_id": 1
    },
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**403 Forbidden:**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to create vehicles",
    "status": 403,
    "path": "/api/v1/vehicles",
    "details": null,
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### PUT /api/vehicles/:id

**Mô tả:** Cập nhật thông tin xe

**Request:**

```json
{
  "brand": "Honda",
  "model": "Civic 2022",
  "mileage_km": 20000,
  "status": "maintenance"
}
```

**Response (200 OK):**

```json
{
  "id": 2,
  "vehicle_id": "VEHICLE_002",
  "brand": "Honda",
  "model": "Civic 2022",
  "mileage_km": 20000,
  "status": "maintenance",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

---

#### DELETE /api/vehicles/:id

**Mô tả:** Xóa xe (soft delete hoặc hard delete)

**Response (200 OK):**

```json
{
  "message": "Vehicle deleted successfully"
}
```

---

#### GET /api/vehicles/:id/status

**Mô tả:** Lấy trạng thái hiện tại của xe (vị trí, device status, alerts)

**Response (200 OK):**

```json
{
  "vehicle_id": 1,
  "status": "active",
  "current_location": {
    "lat": 21.028511,
    "lon": 105.804817,
    "speed": 60.0,
    "course": 180.0,
    "timestamp": "2024-01-15T10:00:00Z"
  },
  "device": {
    "status": "active",
    "last_seen": "2024-01-15T10:00:00Z",
    "battery_level": 85.5,
    "signal_strength": 20
  },
  "current_trip": {
    "id": 10,
    "status": "in_progress",
    "start_time": "2024-01-15T09:00:00Z",
    "distance_km": 50.5
  },
  "active_alerts": [
    {
      "id": 5,
      "alert_type": "speeding",
      "severity": "high",
      "created_at": "2024-01-15T09:30:00Z"
    }
  ]
}
```

---

#### GET /api/vehicles/:id/availability [Phase 2]

**Mô tả:** [Phase 2] Kiểm tra availability của xe trong khoảng thời gian

**Query Parameters:**

- `start_time` (ISO 8601): Thời gian bắt đầu
- `end_time` (ISO 8601): Thời gian kết thúc

**Response (200 OK):**

```json
{
  "vehicle_id": 1,
  "available": true,
  "conflicting_bookings": []
}
```

---

