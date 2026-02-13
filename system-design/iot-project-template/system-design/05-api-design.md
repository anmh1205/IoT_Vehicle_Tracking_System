# API Design

> Thiết kế REST API cho hệ thống IoT

---

## 1. API Conventions

### Base URL

```
/api/v1
```

### Response Format

```typescript
// Success
{
  "success": true,
  "data": { ... }
}

// Success with pagination
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": [...]
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (async) |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Rate Limited |
| 500 | Server Error |

---

## 2. Authentication Endpoints

### POST /api/v1/auth/login

```typescript
// Request
{
  "username": "admin",
  "password": "hashed_password"
}

// Response 200
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "fullName": "Administrator",
      "role": "admin"
    },
    "token": "jwt_token",
    "expiresAt": "2024-01-02T12:00:00Z"
  }
}
```

### GET /api/v1/auth/me

```typescript
// Headers: Authorization: Bearer <token>

// Response 200
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "fullName": "Administrator",
    "role": "admin",
    "deviceAccessMode": "all"
  }
}
```

### POST /api/v1/auth/logout

```typescript
// Response 200
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /api/v1/auth/change-password

```typescript
// Request
{
  "currentPassword": "hashed_current",
  "newPassword": "hashed_new"
}
```

---

## 3. Device Endpoints

### GET /api/v1/device/list

```typescript
// Query params
?status=running|stopped|disconnected
&search=keyword
&sortBy=name|status|lastSeen
&sortOrder=asc|desc
&page=1
&limit=20

// Response 200
{
  "success": true,
  "data": {
    "devices": [
      {
        "deviceId": "DEVICE_001",
        "deviceName": "Device A",
        "currentStatus": "running",
        "lastSeenAt": "2024-01-01T12:00:00Z",
        "latitude": 21.0285,
        "longitude": 105.8542,
        "firmwareVersion": "1.0.0",
        "config": {}
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### GET /api/v1/device/details

```typescript
// Query: ?deviceId=DEVICE_001

// Response 200
{
  "success": true,
  "data": {
    "deviceId": "DEVICE_001",
    "deviceName": "Device A",
    "currentStatus": "running",
    "lastSeenAt": "2024-01-01T12:00:00Z",
    "config": {
      // Domain-specific config
    },
    "latitude": 21.0285,
    "longitude": 105.8542,
    "firmwareVersion": "1.0.0",
    "targetFirmwareVersion": "1.1.0",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### POST /api/v1/device/manage (Admin)

```typescript
// Request - Create
{
  "deviceId": "DEVICE_002",
  "deviceName": "Device B",
  "config": {}
}

// Response 201
{
  "success": true,
  "data": {
    "id": 2,
    "deviceId": "DEVICE_002",
    "authToken": "generated_token"
  }
}
```

### PUT /api/v1/device/manage (Admin)

```typescript
// Request - Update
{
  "deviceId": "DEVICE_002",
  "deviceName": "Updated Name",
  "config": {}
}
```

### DELETE /api/v1/device/manage (Admin)

```typescript
// Request
{
  "deviceId": "DEVICE_002"
}
```

### GET /api/v1/device/status

```typescript
// Response 200
{
  "success": true,
  "data": {
    "total": 50,
    "running": 15,
    "stopped": 30,
    "disconnected": 5
  }
}
```

---

## 4. IoT Data Endpoints (Public - Device Auth)

### POST /api/v1/iot/data

```typescript
// Request
{
  "deviceId": "DEVICE_001",
  "authToken": "device_auth_token",
  "timestamp": 1704067200000,
  "data": {
    // Domain-specific sensor data
    "sensor1": 25.5,
    "sensor2": 65.0
  }
}

// Response 200
{
  "success": true,
  "data": {
    "sessionId": 123,
    "config": {
      // Updated config for device
    }
  }
}
```

### GET /api/v1/iot/status

```typescript
// Query: ?deviceId=DEVICE_001&authToken=xxx

// Response 200
{
  "success": true,
  "data": {
    "deviceId": "DEVICE_001",
    "currentStatus": "running",
    "sessionId": 123,
    "lastUpdate": "2024-01-01T12:00:00Z"
  }
}
```

### GET /api/v1/iot/bootstrap

```typescript
// Query: ?deviceId=DEVICE_001&authToken=xxx

// Response 200
{
  "success": true,
  "data": {
    "deviceId": "DEVICE_001",
    "config": {
      // Device configuration
    },
    "serverTime": "2024-01-01T12:00:00Z"
  }
}
```

---

## 5. Dashboard Endpoints

### GET /api/v1/dashboard/stats

```typescript
// Response 200
{
  "success": true,
  "data": {
    "devices": {
      "total": 50,
      "running": 15,
      "stopped": 30,
      "disconnected": 5
    },
    "sessions": {
      "today": 25,
      "thisWeek": 150,
      "thisMonth": 500
    },
    "alerts": {
      "active": 5,
      "resolved": 120
    }
  }
}
```

### GET /api/v1/dashboard/activity

```typescript
// Query: ?limit=20&type=device|user|system

// Response 200
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": 1,
        "type": "device",
        "action": "session_started",
        "deviceId": "DEVICE_001",
        "timestamp": "2024-01-01T12:00:00Z",
        "details": {}
      }
    ]
  }
}
```

### GET /api/v1/dashboard/alerts

```typescript
// Query: ?status=active&severity=critical&limit=20

// Response 200
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": 1,
        "deviceId": "DEVICE_001",
        "alertType": "threshold_exceeded",
        "severity": "warning",
        "status": "active",
        "message": "Temperature exceeded threshold",
        "triggeredAt": "2024-01-01T12:00:00Z"
      }
    ]
  }
}
```

---

## 6. Metrics Endpoints

### GET /api/v1/metrics/query

```typescript
// Query: ?query=device_temperature{device_id="DEVICE_001"}[1h]&step=1m

// Response 200
{
  "success": true,
  "data": {
    "resultType": "matrix",
    "result": [
      {
        "metric": {"device_id": "DEVICE_001"},
        "values": [
          [1704067200, "25.5"],
          [1704067260, "25.8"]
        ]
      }
    ]
  }
}
```

### GET /api/v1/metrics/device/:deviceId

```typescript
// Query: ?hours=24

// Response 200
{
  "success": true,
  "data": {
    "deviceId": "DEVICE_001",
    "timeRange": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-02T00:00:00Z"
    },
    "metrics": {
      "sensor1": {
        "current": 25.5,
        "avg": 24.2,
        "min": 20.1,
        "max": 28.5
      }
    }
  }
}
```

---

## 7. Firmware Endpoints

### GET /api/v1/firmware/list

```typescript
// Response 200
{
  "success": true,
  "data": {
    "firmware": [
      {
        "id": 1,
        "version": "1.1.0",
        "filename": "firmware_1.1.0.bin",
        "size": 1048576,
        "sha256": "abc123...",
        "description": "Bug fixes",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00Z",
        "assignedDevices": 10
      }
    ]
  }
}
```

### POST /api/v1/firmware/upload (Admin)

```typescript
// Request: multipart/form-data
// - file: firmware file
// - version: "1.1.0"
// - description: "Bug fixes"

// Response 201
{
  "success": true,
  "data": {
    "id": 2,
    "version": "1.1.0",
    "filename": "firmware_1.1.0.bin",
    "size": 1048576,
    "sha256": "abc123..."
  }
}
```

### POST /api/v1/firmware/assign (Admin)

```typescript
// Request
{
  "firmwareId": 2,
  "deviceIds": ["DEVICE_001", "DEVICE_002"]
}
```

---

## 8. User Management Endpoints (Admin)

### GET /api/v1/users

```typescript
// Query: ?page=1&limit=20&role=user

// Response 200
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {...}
  }
}
```

### POST /api/v1/users

```typescript
// Request
{
  "username": "newuser",
  "password": "hashed",
  "fullName": "New User",
  "role": "user",
  "deviceAccessMode": "limited",
  "deviceIds": ["DEVICE_001"]
}
```

### PUT /api/v1/users/:id

### DELETE /api/v1/users/:id

---

## 9. Health & Monitoring

### GET /health

```typescript
{
  "status": "healthy",
  "uptime": 86400,
  "version": "1.0.0"
}
```

### GET /metrics

```
# Prometheus format
http_requests_total{method="GET",path="/api/v1/device/list",status="200"} 1234
http_request_duration_seconds{method="GET",path="/api/v1/device/list"} 0.045
```

---

## 10. Rate Limiting

| Endpoint | Rate Limit |
|----------|------------|
| /api/v1/auth/login | 5/minute |
| /api/v1/iot/data | 100/second/device |
| General API | 100/minute/user |
