## PHẦN XI.14: [PHASE 2] CONTRACTS APIs

### XI.14 [Phase 2] Contracts APIs

#### GET /api/contracts [Phase 2]

**Mô tả:** [Phase 2] Lấy danh sách hợp đồng

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "contract_number": "HD-20240115-001",
      "booking": {
        "id": 1,
        "booking_number": "BK-20240115-001"
      },
      "status": "signed",
      "start_date": "2024-01-20T08:00:00Z",
      "end_date": "2024-01-22T18:00:00Z",
      "signed_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

#### POST /api/contracts [Phase 2]

**Mô tả:** [Phase 2] Tạo hợp đồng mới

**Request:**

```json
{
  "booking_id": 1,
  "contract_number": "HD-20240115-001",
  "start_date": "2024-01-20T08:00:00Z",
  "end_date": "2024-01-22T18:00:00Z",
  "terms_and_conditions": "Điều khoản hợp đồng..."
}
```

**Response (201 Created):**

```json
{
  "id": 1,
  "contract_number": "HD-20240115-001",
  "status": "draft",
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

