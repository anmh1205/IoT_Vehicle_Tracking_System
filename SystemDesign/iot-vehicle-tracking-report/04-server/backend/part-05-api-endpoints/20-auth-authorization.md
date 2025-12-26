## PHẦN XI.20: AUTHENTICATION & AUTHORIZATION

### XI.20 Authentication & Authorization

**JWT Token Format:**

```
Authorization: Bearer {access_token}
```

**Token Payload:**

```json
{
  "sub": 1,
  "username": "admin",
  "email": "admin@example.com",
  "role": "admin",
  "iat": 1705315200,
  "exp": 1705401600
}
```

**Role-based Access:**

- `admin`: Full access
- `manager`: Read/write access (không thể tạo/xóa admin)
- `staff`: Read/write access (hạn chế một số operations)

---

