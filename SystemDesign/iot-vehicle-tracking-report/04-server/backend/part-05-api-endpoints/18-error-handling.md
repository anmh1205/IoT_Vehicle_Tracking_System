## PHẦN XI.18: ERROR HANDLING

### XI.18 Error Handling

**Standard Error Response:**

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

**HTTP Status Codes:**

- `200 OK`: Success
- `201 Created`: Resource created successfully
- `400 Bad Request`: Validation error, invalid input
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (duplicate)
- `500 Internal Server Error`: Server error

---

