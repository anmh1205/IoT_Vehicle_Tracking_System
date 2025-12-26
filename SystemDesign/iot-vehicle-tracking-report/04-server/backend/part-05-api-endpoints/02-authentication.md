## PHẦN XI.2: AUTHENTICATION APIs

### XI.2 Authentication APIs

#### POST /api/auth/login

**Mô tả:** Đăng nhập admin/staff

**Request:**

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response (200 OK):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "full_name": "Admin User",
    "role": "admin"
  }
}
```

**Errors:**

- `401 Unauthorized`: Email hoặc password sai
- `400 Bad Request`: Validation failed

---

#### POST /api/auth/register

**Mô tả:** Đăng ký tài khoản admin/staff mới (chỉ admin mới được tạo)

**Request:**

```json
{
  "username": "staff01",
  "email": "staff01@example.com",
  "password": "password123",
  "full_name": "Staff User",
  "phone": "0123456789",
  "role": "staff"
}
```

**Response (201 Created):**

```json
{
  "id": 2,
  "username": "staff01",
  "email": "staff01@example.com",
  "full_name": "Staff User",
  "role": "staff",
  "status": "active",
  "created_at": "2024-01-15T10:00:00Z"
}
```

**Errors:**

- `400 Bad Request`: Email/username đã tồn tại
- `403 Forbidden`: Không có quyền tạo user

---

#### POST /api/auth/refresh

**Mô tả:** Refresh access token

**Request:**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### POST /api/auth/logout

**Mô tả:** Đăng xuất, vô hiệu hóa refresh token

**Headers:** `Authorization: Bearer {access_token}`

**Response (200 OK):**

```json
{
  "message": "Logged out successfully"
}
```

---

