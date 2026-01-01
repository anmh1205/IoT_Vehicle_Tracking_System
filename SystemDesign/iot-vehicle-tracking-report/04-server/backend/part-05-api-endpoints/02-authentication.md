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

**401 Unauthorized - Invalid credentials:**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password",
    "status": 401,
    "path": "/api/v1/auth/login",
    "details": null,
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**400 Bad Request - Validation failed:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "status": 400,
    "path": "/api/v1/auth/login",
    "details": [
      {
        "field": "email",
        "message": "Email must be a valid email",
        "value": "invalid-email"
      },
      {
        "field": "password",
        "message": "Password is required",
        "value": null
      }
    ],
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

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

**400 Bad Request - Duplicate email/username:**
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Email or username already exists",
    "status": 400,
    "path": "/api/v1/auth/register",
    "details": {
      "field": "email",
      "existing_id": 2
    },
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**403 Forbidden - Insufficient permissions:**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to create users",
    "status": 403,
    "path": "/api/v1/auth/register",
    "details": null,
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

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

