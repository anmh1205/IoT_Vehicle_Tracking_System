## PHẦN XI.12: MAINTENANCE APIs

### XI.12 Maintenance APIs

#### GET /api/maintenance

**Mô tả:** Lấy danh sách bảo trì

**Query Parameters:**

- `vehicle_id` (number, optional)
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
        "plate_number": "30A-12345"
      },
      "maintenance_type": "oil_change",
      "description": "Thay dầu động cơ",
      "cost": 500000,
      "mileage_km": 15000,
      "performed_by": "Kỹ thuật viên A",
      "next_maintenance_date": "2024-04-15",
      "next_maintenance_mileage": 20000,
      "created_at": "2024-01-15T10:00:00Z"
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
  "vehicle_id": 1,
  "maintenance_type": "oil_change",
  "description": "Thay dầu động cơ",
  "cost": 500000,
  "mileage_km": 15000,
  "performed_by": "Kỹ thuật viên A",
  "next_maintenance_date": "2024-04-15",
  "next_maintenance_mileage": 20000
}
```

**Response (201 Created):**

```json
{
  "id": 1,
  "vehicle_id": 1,
  "maintenance_type": "oil_change",
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

