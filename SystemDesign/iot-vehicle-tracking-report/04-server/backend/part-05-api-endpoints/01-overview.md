## PHẦN XI.1: TỔNG QUAN API

### XI.1 Tổng Quan

**Base URL:** `https://api.example.com/api`

**Authentication:** JWT Bearer Token (trừ auth endpoints)

**Response Format:** JSON

**Error Format:**

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Email must be a valid email"
    }
  ]
}
```

