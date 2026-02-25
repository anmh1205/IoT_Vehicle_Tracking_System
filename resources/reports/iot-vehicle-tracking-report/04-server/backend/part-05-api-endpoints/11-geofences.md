## PHẦN XI.11: GEOFENCES APIs

### XI.11 Geofences APIs

#### GET /api/geofences

**Mô tả:** Lấy danh sách geofences

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Văn phòng chính",
      "geofenceType": "circle",
      "center": {
        "lat": 21.028511,
        "lon": 105.804817
      },
      "radiusMeters": 500,
      "enabled": true
    }
  ]
}
```

---

#### POST /api/geofences

**Mô tả:** Tạo geofence mới

**Request (Circle):**

```json
{
  "name": "Văn phòng chính",
  "description": "Khu vực văn phòng",
  "geofenceType": "circle",
  "centerLat": 21.028511,
  "centerLon": 105.804817,
  "radiusMeters": 500,
  "alertOnEntry": false,
  "alertOnExit": true
}
```

**Request (Polygon):**

```json
{
  "name": "Khu vực cấm",
  "geofenceType": "polygon",
  "coordinates": [
    [21.028511, 105.804817],
    [21.029511, 105.805817],
    [21.030511, 105.806817],
    [21.028511, 105.804817]
  ],
  "alertOnEntry": true,
  "alertOnExit": true
}
```

**Response (201 Created):**

```json
{
  "id": 1,
  "name": "Văn phòng chính",
  "enabled": true,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

---

#### PUT /api/geofences/:id/assign

**Mô tả:** Gán geofence cho xe

**Request:**

```json
{
  "vehicleIds": [1, 2, 3]
}
```

**Response (200 OK):**

```json
{
  "geofenceId": 1,
  "assignedVehicles": [
    {
      "vehicleId": 1,
      "plateNumber": "30A-12345"
    }
  ]
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
    "path": "/api/v1/geofences",
    "details": [
      {
        "field": "name",
        "message": "Name is required",
        "value": null
      },
      {
        "field": "geofence_type",
        "message": "Geofence type must be 'circle' or 'polygon'",
        "value": "invalid"
      }
    ],
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**404 Not Found:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Geofence with ID 123 not found",
    "status": 404,
    "path": "/api/v1/geofences/123",
    "details": null,
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

