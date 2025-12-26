## PHẦN XI.15: [PHASE 2] PAYMENTS APIs

### XI.15 [Phase 2] Payments APIs

#### GET /api/payments [Phase 2]

**Mô tả:** [Phase 2] Lấy danh sách thanh toán

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "payment_number": "PAY-20240115-001",
      "booking": {
        "id": 1,
        "booking_number": "BK-20240115-001"
      },
      "payment_type": "deposit",
      "amount": 5000000,
      "payment_method": "bank_transfer",
      "payment_status": "completed",
      "payment_date": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

#### POST /api/payments [Phase 2]

**Mô tả:** [Phase 2] Tạo thanh toán mới

**Request:**

```json
{
  "booking_id": 1,
  "payment_type": "deposit",
  "amount": 5000000,
  "payment_method": "bank_transfer"
}
```

**Response (201 Created):**

```json
{
  "id": 1,
  "payment_number": "PAY-20240115-001",
  "payment_status": "pending",
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

