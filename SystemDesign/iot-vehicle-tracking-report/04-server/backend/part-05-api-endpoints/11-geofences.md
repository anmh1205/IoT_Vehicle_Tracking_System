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
      "geofence_type": "circle",
      "center": {
        "lat": 21.028511,
        "lon": 105.804817
      },
      "radius_meters": 500,
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
  "geofence_type": "circle",
  "center_lat": 21.028511,
  "center_lon": 105.804817,
  "radius_meters": 500,
  "alert_on_entry": false,
  "alert_on_exit": true
}
```

**Request (Polygon):**

```json
{
  "name": "Khu vực cấm",
  "geofence_type": "polygon",
  "coordinates": [
    [21.028511, 105.804817],
    [21.029511, 105.805817],
    [21.030511, 105.806817],
    [21.028511, 105.804817]
  ],
  "alert_on_entry": true,
  "alert_on_exit": true
}
```

**Response (201 Created):**

```json
{
  "id": 1,
  "name": "Văn phòng chính",
  "enabled": true,
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

#### PUT /api/geofences/:id/assign

**Mô tả:** Gán geofence cho xe

**Request:**

```json
{
  "vehicle_ids": [1, 2, 3]
}
```

**Response (200 OK):**

```json
{
  "geofence_id": 1,
  "assigned_vehicles": [
    {
      "vehicle_id": 1,
      "plate_number": "30A-12345"
    }
  ]
}
```

---

