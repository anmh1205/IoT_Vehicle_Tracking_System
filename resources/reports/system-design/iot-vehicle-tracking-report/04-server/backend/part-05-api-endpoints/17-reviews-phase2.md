## PHẦN XI.17: [PHASE 2] REVIEWS APIs

### XI.17 [Phase 2] Reviews APIs

#### GET /api/reviews [Phase 2]

**Mô tả:** [Phase 2] Lấy danh sách đánh giá

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
      "vehicle_rating": 5,
      "service_rating": 4,
      "overall_rating": 4.5,
      "is_public": true,
      "status": "approved",
      "created_at": "2024-01-23T10:00:00Z"
    }
  ]
}
```

---

#### POST /api/reviews [Phase 2]

**Mô tả:** [Phase 2] Tạo đánh giá mới

**Request:**

```json
{
  "booking_id": 1,
  "vehicle_id": 1,
  "vehicle_rating": 5,
  "vehicle_comment": "Xe rất tốt",
  "service_rating": 4,
  "service_comment": "Dịch vụ tốt"
}
```

**Response (201 Created):**

```json
{
  "id": 1,
  "status": "pending",
  "created_at": "2024-01-23T10:00:00Z"
}
```

---

