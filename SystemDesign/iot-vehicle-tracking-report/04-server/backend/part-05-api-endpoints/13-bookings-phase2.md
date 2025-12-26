## PHẦN XI.13: [PHASE 2] BOOKINGS APIs

### XI.13 [Phase 2] Bookings APIs

#### GET /api/bookings [Phase 2]

**Mô tả:** [Phase 2] Lấy danh sách đặt xe

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 20)
- `customer_id` (number, optional)
- `vehicle_id` (number, optional)
- `status` (string, optional): 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
- `start_date` (ISO 8601, optional)
- `end_date` (ISO 8601, optional)

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "booking_number": "BK-20240115-001",
      "customer": {
        "id": 1,
        "full_name": "Nguyễn Văn A"
      },
      "vehicle": {
        "id": 1,
        "plate_number": "30A-12345"
      },
      "pickup_time": "2024-01-20T08:00:00Z",
      "return_time": "2024-01-22T18:00:00Z",
      "status": "confirmed",
      "total_amount": 1500000,
      "created_at": "2024-01-15T10:00:00Z"
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

#### POST /api/bookings [Phase 2]

**Mô tả:** [Phase 2] Tạo đặt xe mới

**Request:**

```json
{
  "customer_id": 1,
  "vehicle_id": 1,
  "pickup_time": "2024-01-20T08:00:00Z",
  "return_time": "2024-01-22T18:00:00Z",
  "pickup_location": "123 Đường ABC, Hà Nội",
  "pickup_lat": 21.028511,
  "pickup_lon": 105.804817,
  "return_location": "456 Đường XYZ, Hà Nội",
  "return_lat": 21.018511,
  "return_lon": 105.814817,
  "special_requests": "Cần thêm GPS"
}
```

**Response (201 Created):**

```json
{
  "id": 1,
  "booking_number": "BK-20240115-001",
  "status": "pending",
  "total_amount": 1500000,
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

#### PUT /api/bookings/:id/pickup [Phase 2]

**Mô tả:** [Phase 2] Xác nhận nhận xe

**Request:**

```json
{
  "actual_pickup_time": "2024-01-20T08:30:00Z",
  "mileage_at_start": 15000,
  "notes": "Xe trong tình trạng tốt"
}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "status": "in_progress",
  "actual_pickup_time": "2024-01-20T08:30:00Z",
  "updated_at": "2024-01-20T08:30:00Z"
}
```

---

#### PUT /api/bookings/:id/return [Phase 2]

**Mô tả:** [Phase 2] Xác nhận trả xe

**Request:**

```json
{
  "actual_return_time": "2024-01-22T18:30:00Z",
  "mileage_at_end": 15200,
  "notes": "Xe trả đúng hạn"
}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "status": "completed",
  "actual_return_time": "2024-01-22T18:30:00Z",
  "updated_at": "2024-01-22T18:30:00Z"
}
```

---

