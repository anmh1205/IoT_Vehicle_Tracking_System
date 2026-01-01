## PHẦN XI.4: CUSTOMERS APIs

### XI.4 Customers APIs

#### GET /api/customers

**Mô tả:** Lấy danh sách khách hàng

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 20)
- `status` (string, optional): 'active', 'suspended', 'blacklisted'
- `verification_status` (string, optional): 'pending', 'verified', 'rejected'
- `search` (string, optional): Tìm kiếm theo tên, phone, email, CMND

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "full_name": "Nguyễn Văn A",
      "phone": "0123456789",
      "email": "nguyenvana@example.com",
      "license_number": "BL123456",
      "license_type": "B2",
      "status": "active",
      "verification_status": "verified",
      "total_rentals": 5,
      "rating_average": 4.5
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

#### GET /api/customers/:id

**Mô tả:** Lấy chi tiết khách hàng

**Response (200 OK):**

```json
{
  "id": 1,
  "user_id": null,
  "full_name": "Nguyễn Văn A",
  "email": "nguyenvana@example.com",
  "phone": "0123456789",
  "date_of_birth": "1990-01-01",
  "id_card_number": "001234567890",
  "id_card_issue_date": "2010-01-01",
  "id_card_issue_place": "Công an Hà Nội",
  "address": "123 Đường ABC, Quận XYZ, Hà Nội",
  "license_number": "BL123456",
  "license_type": "B2",
  "license_issue_date": "2015-01-01",
  "license_expiry_date": "2030-01-01",
  "license_issue_place": "Sở GTVT Hà Nội",
  "status": "active",
  "verification_status": "verified",
  "verified_by": 1,
  "verified_at": "2024-01-01T00:00:00Z",
  "total_rentals": 5,
  "total_spent": 5000000,
  "rating_average": 4.5,
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
    "message": "Customer with ID 123 not found",
    "status": 404,
    "path": "/api/v1/customers/123",
    "details": null,
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### POST /api/customers

**Mô tả:** Tạo khách hàng mới

**Request:**

```json
{
  "full_name": "Nguyễn Văn B",
  "email": "nguyenvanb@example.com",
  "phone": "0987654321",
  "date_of_birth": "1995-05-15",
  "id_card_number": "001234567891",
  "id_card_issue_date": "2015-01-01",
  "id_card_issue_place": "Công an Hà Nội",
  "address": "456 Đường XYZ, Quận ABC, Hà Nội",
  "license_number": "BL123457",
  "license_type": "B2",
  "license_issue_date": "2018-01-01",
  "license_expiry_date": "2033-01-01",
  "license_issue_place": "Sở GTVT Hà Nội"
}
```

**Response (201 Created):**

```json
{
  "id": 2,
  "full_name": "Nguyễn Văn B",
  "phone": "0987654321",
  "status": "active",
  "verification_status": "pending",
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
    "path": "/api/v1/customers",
    "details": [
      {
        "field": "phone",
        "message": "Phone number is required",
        "value": null
      },
      {
        "field": "id_card_number",
        "message": "ID card number must be 12 digits",
        "value": "12345"
      }
    ],
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**409 Conflict - Duplicate phone/email/id_card:**
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Customer with phone number '0987654321' already exists",
    "status": 409,
    "path": "/api/v1/customers",
    "details": {
      "field": "phone",
      "existing_id": 5
    },
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### PUT /api/customers/:id

**Mô tả:** Cập nhật thông tin khách hàng

**Request:**

```json
{
  "email": "newemail@example.com",
  "phone": "0987654322",
  "address": "789 Đường MNO, Quận PQR, Hà Nội"
}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "email": "newemail@example.com",
  "phone": "0987654322",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

---

#### PUT /api/customers/:id/verify

**Mô tả:** Xác minh khách hàng (chỉ admin/manager)

**Request:**

```json
{
  "verification_status": "verified",
  "notes": "Đã kiểm tra giấy tờ hợp lệ"
}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "verification_status": "verified",
  "verified_by": 1,
  "verified_at": "2024-01-15T11:00:00Z"
}
```

---

#### GET /api/customers/:id/rentals [Phase 2]

**Mô tả:** [Phase 2] Lấy lịch sử thuê xe của khách hàng

**Response (200 OK):**

```json
{
  "customer_id": 1,
  "rentals": [
    {
      "booking_id": 10,
      "vehicle": {
        "id": 1,
        "plate_number": "30A-12345"
      },
      "pickup_time": "2024-01-10T08:00:00Z",
      "return_time": "2024-01-12T18:00:00Z",
      "status": "completed",
      "total_amount": 1500000
    }
  ]
}
```

---

