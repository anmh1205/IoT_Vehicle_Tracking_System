## PHẦN XI.1: TỔNG QUAN API

### XI.1 Tổng Quan

**Base URL:** `https://api.example.com/api`

**Authentication:** JWT Bearer Token (trừ auth endpoints)

**Response Format:** JSON

**Error Format:**

Tất cả các lỗi API đều tuân theo cấu trúc thống nhất:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message description",
    "status": 400,
    "path": "/api/v1/endpoint",
    "details": null,
    "traceId": null
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Xem chi tiết trong [`18-error-handling.md`](./18-error-handling.md)

