## PHẦN XI.3: VEHICLES APIs

### XI.3 Vehicles APIs

#### GET /api/vehicles

**Mô tả:** Lấy danh sách xe (có pagination và filter)

**Query Parameters:**

- `page` (number, default: 1): Số trang
- `limit` (number, default: 20): Số item mỗi trang
- `status` (string, optional): Filter theo status ('active', 'inactive', 'maintenance', 'retired')
- `vehicleType` (string, optional): Filter theo loại xe
- `search` (string, optional): Tìm kiếm theo biển số, brand, model

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "vehicleId": "VEHICLE_001",
      "plateNumber": "30A-12345",
      "brand": "Toyota",
      "model": "Camry",
      "year": 2020,
      "color": "White",
      "vehicleType": "sedan",
      "status": "active",
      "mileageKm": 15000,
      "device": {
        "id": 1,
        "deviceId": "TRACKER_001",
        "status": "active",
        "lastSeen": "2024-01-15T10:00:00Z",
        "batteryLevel": 85.5
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
  "vehicleId": "VEHICLE_001",
  "plateNumber": "30A-12345",
  "ownerId": 1,
  "brand": "Toyota",
  "model": "Camry",
  "year": 2020,
  "color": "White",
  "vin": "JT1234567890",
  "seats": 5,
  "transmission": "automatic",
  "fuelType": "gasoline",
  "mileageKm": 15000,
  "registrationNumber": "REG123456",
  "insuranceExpiry": "2024-12-31",
  "status": "active",
  "rentalPricePerDay": 500000, // [Phase 2]
  "rentalPricePerHour": 50000, // [Phase 2]
  "depositAmount": 5000000, // [Phase 2]
  "availabilityStatus": "available", // [Phase 2]
  "device": {
    "id": 1,
    "deviceId": "TRACKER_001",
    "firmwareVersion": "1.0.0",
    "status": "active",
    "lastSeen": "2024-01-15T10:00:00Z",
    "batteryLevel": 85.5,
    "signalStrength": 20
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
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
  "vehicleId": "VEHICLE_002",
  "plateNumber": "30A-12346",
  "brand": "Honda",
  "model": "Civic",
  "year": 2021,
  "color": "Black",
  "vehicleType": "sedan",
  "vin": "JT1234567891",
  "seats": 5,
  "transmission": "automatic",
  "fuelType": "gasoline",
  "registrationNumber": "REG123457",
  "insuranceExpiry": "2024-12-31"
}
```

**Response (201 Created):**

```json
{
  "id": 2,
  "vehicleId": "VEHICLE_002",
  "plateNumber": "30A-12346",
  "status": "active",
  "createdAt": "2024-01-15T10:00:00Z"
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
        "field": "plateNumber",
        "message": "Plate number is required",
        "value": null
      },
      {
        "field": "vehicleId",
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
      "field": "plateNumber",
      "existingId": 1
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

#### PATCH /api/vehicles/:id

> **NOTE**: Backend uses PATCH (partial update) not PUT (full replacement)

**Mô tả:** Cập nhật thông tin xe (partial update)

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
  "mileageKm": 20000,
  "status": "maintenance",
  "updatedAt": "2024-01-15T11:00:00Z"
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
  "vehicleId": 1,
  "status": "active",
  "currentLocation": {
    "lat": 21.028511,
    "lon": 105.804817,
    "speed": 60.0,
    "course": 180.0,
    "timestamp": "2024-01-15T10:00:00Z"
  },
  "device": {
    "status": "active",
    "lastSeen": "2024-01-15T10:00:00Z",
    "batteryLevel": 85.5,
    "signalStrength": 20
  },
  "currentTrip": {
    "id": 10,
    "status": "in_progress",
    "startTime": "2024-01-15T09:00:00Z",
    "distanceKm": 50.5
  },
  "activeAlerts": [
    {
      "id": 5,
      "alertType": "speeding",
      "severity": "high",
      "createdAt": "2024-01-15T09:30:00Z"
    }
  ]
}
```

---

#### GET /api/vehicles/:id/availability [Phase 2]

**Mô tả:** [Phase 2] Kiểm tra availability của xe trong khoảng thời gian

**Query Parameters:**

- `startTime` (ISO 8601): Thời gian bắt đầu
- `endTime` (ISO 8601): Thời gian kết thúc

**Response (200 OK):**

```json
{
  "vehicleId": 1,
  "available": true,
  "conflictingBookings": []
}
```

---

