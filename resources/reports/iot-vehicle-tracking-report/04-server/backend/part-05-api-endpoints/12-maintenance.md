## PHẦN XI.12: MAINTENANCE APIs

### XI.12 Maintenance APIs

#### GET /api/maintenance

**Mô tả:** Lấy danh sách bảo trì

**Query Parameters:**

- `vehicleId` (number, optional)
- `page` (number, default: 1)
- `limit` (number, default: 20)

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
      "maintenanceType": "oil_change",
      "description": "Thay dầu động cơ",
      "cost": 500000,
      "mileageKm": 15000,
      "performedBy": "Kỹ thuật viên A",
      "nextMaintenanceDate": "2024-04-15",
      "nextMaintenanceMileage": 20000,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

---

#### POST /api/maintenance

**Mô tả:** Tạo bản ghi bảo trì mới

**Request:**

```json
{
  "vehicleId": 1,
  "maintenanceType": "oil_change",
  "description": "Thay dầu động cơ",
  "cost": 500000,
  "mileageKm": 15000,
  "performedBy": "Kỹ thuật viên A",
  "nextMaintenanceDate": "2024-04-15",
  "nextMaintenanceMileage": 20000
}
```

**Response (201 Created):**

```json
{
  "id": 1,
  "vehicleId": 1,
  "maintenanceType": "oil_change",
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
    "path": "/api/v1/maintenance",
    "details": [
      {
        "field": "vehicleId",
        "message": "Vehicle ID is required",
        "value": null
      },
      {
        "field": "maintenanceType",
        "message": "Maintenance type is required",
        "value": null
      }
    ],
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**404 Not Found - Vehicle not found:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Vehicle with ID 999 not found",
    "status": 404,
    "path": "/api/v1/maintenance",
    "details": {
      "vehicle_id": 999
    },
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

