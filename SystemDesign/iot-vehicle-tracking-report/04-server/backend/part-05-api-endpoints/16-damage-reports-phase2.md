## PHẦN XI.16: [PHASE 2] DAMAGE REPORTS APIs

### XI.16 [Phase 2] Damage Reports APIs

#### GET /api/damage-reports [Phase 2]

**Mô tả:** [Phase 2] Lấy danh sách báo cáo hư hỏng

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "booking": {
        "id": 1,
        "booking_number": "BK-20240115-001"
      },
      "vehicle": {
        "id": 1,
        "plate_number": "30A-12345"
      },
      "report_type": "return",
      "damage_description": "Vết xước trên cửa trước",
      "status": "pending",
      "estimated_repair_cost": 500000,
      "created_at": "2024-01-22T18:30:00Z"
    }
  ]
}
```

---

#### POST /api/damage-reports [Phase 2]

**Mô tả:** [Phase 2] Tạo báo cáo hư hỏng mới

**Request:**

```json
{
  "booking_id": 1,
  "vehicle_id": 1,
  "report_type": "return",
  "damage_description": "Vết xước trên cửa trước",
  "damage_location": "Cửa trước bên phải",
  "damage_images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "estimated_repair_cost": 500000
}
```

**Response (201 Created):**

```json
{
  "id": 1,
  "status": "pending",
  "created_at": "2024-01-22T18:30:00Z"
}
```

---

