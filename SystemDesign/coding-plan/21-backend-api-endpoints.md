# Backend API Endpoints

> Chi tiết thiết kế REST API theo chuẩn IVM26

---

## 1. Tổng Quan

```
Base URL: /api/v1

Authentication:
├── /auth/*           # Login, logout, user management
│
Device Management:
├── /device/*         # Device CRUD, sessions, runtime
│
IoT Data (PUBLIC):
├── /iot/*            # Sensor data ingestion (no auth)
│
Dashboard:
├── /dashboard/*      # Statistics, activity, alerts
│
Firmware:
├── /firmware/*       # OTA management
│
Export:
├── /exports/*        # Data export jobs
│
System Admin:
├── /system-admin/*   # Metrics, logs (admin only)
└── /victoria/*       # VictoriaMetrics/Logs queries
```

---

## 2. Authentication Endpoints

### POST /api/v1/auth/login

**Request:**
```json
{
  "username": "admin",
  "password": "sha256_hashed_password"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "fullName": "Administrator",
      "role": "admin"
    },
    "token": "jwt_token_here",
    "expiresAt": "2024-01-02T12:00:00Z"
  }
}
```

### GET /api/v1/auth/me

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
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

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /api/v1/auth/change-password

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "currentPassword": "sha256_current",
  "newPassword": "sha256_new"
}
```

### GET /api/v1/auth/users (Admin)

**Query Params:**
- `page` (default: 1)
- `limit` (default: 20)
- `search` (optional)
- `role` (optional): user | admin | root

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "username": "admin",
        "fullName": "Administrator",
        "role": "admin",
        "status": "active",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

### POST /api/v1/auth/users (Admin)

**Request:**
```json
{
  "username": "newuser",
  "password": "sha256_password",
  "fullName": "New User",
  "role": "user",
  "deviceAccessMode": "limited",
  "deviceIds": ["DEVICE_001", "DEVICE_002"]
}
```

### PUT /api/v1/auth/users/:id (Admin)

**Request:**
```json
{
  "fullName": "Updated Name",
  "role": "admin",
  "status": "active"
}
```

### DELETE /api/v1/auth/users/:id (Admin)

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### GET /api/v1/auth/users/:id/device-access (Admin)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": 2,
    "accessMode": "limited",
    "devices": ["DEVICE_001", "DEVICE_002"]
  }
}
```

### PUT /api/v1/auth/users/:id/device-access (Admin)

**Request:**
```json
{
  "accessMode": "limited",
  "deviceIds": ["DEVICE_001", "DEVICE_002", "DEVICE_003"]
}
```

---

## 3. Device Endpoints

### GET /api/v1/device/list

**Query Params:**
- `status`: running | stopped | disconnected
- `search`: search by name or device_id
- `sortBy`: name | status | runtime | lastSeen (default: name)
- `sortOrder`: asc | desc (default: asc)
- `page`: page number (default: 1)
- `limit`: items per page (default: 20, max: 100)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "deviceId": "TRACKER_001",
        "deviceName": "Vehicle A",
        "currentStatus": "running",
        "lastSeenAt": "2024-01-01T12:00:00Z",
        "totalRuntimeSeconds": 86400,
        "latitude": 21.0285,
        "longitude": 105.8542,
        "firmwareVersion": "1.0.0",
        "lastErrorCode": 0
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

**Query Params:**
- `deviceId`: required

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deviceId": "TRACKER_001",
    "deviceName": "Vehicle A",
    "currentStatus": "running",
    "lastSeenAt": "2024-01-01T12:00:00Z",
    "totalRuntimeSeconds": 86400,
    "vibrationThreshold": 1.5,
    "requestInterval": 2000,
    "firmwareVersion": "1.0.0",
    "targetFirmwareVersion": "1.1.0",
    "latitude": 21.0285,
    "longitude": 105.8542,
    "imei": "123456789012345",
    "config": {},
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### POST /api/v1/device/manage (Admin)

**Request:**
```json
{
  "deviceId": "TRACKER_002",
  "deviceName": "Vehicle B",
  "vibrationThreshold": 1.5,
  "requestInterval": 2000,
  "latitude": 21.0285,
  "longitude": 105.8542
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "deviceId": "TRACKER_002",
    "authToken": "generated_auth_token"
  }
}
```

### PUT /api/v1/device/manage (Admin)

**Request:**
```json
{
  "deviceId": "TRACKER_002",
  "deviceName": "Updated Name",
  "vibrationThreshold": 2.0
}
```

### DELETE /api/v1/device/manage (Admin)

**Request:**
```json
{
  "deviceId": "TRACKER_002"
}
```

### GET /api/v1/device/sessions

**Query Params:**
- `deviceId`: required
- `startDate`: ISO date
- `endDate`: ISO date
- `status`: running | completed | disconnected
- `page`: default 1
- `limit`: default 20

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": 123,
        "deviceId": "TRACKER_001",
        "status": "completed",
        "sessionStart": "2024-01-01T08:00:00Z",
        "sessionEnd": "2024-01-01T17:00:00Z",
        "uptime": 32400,
        "avgVibration": 0.85,
        "maxVibration": 2.5,
        "dataPointsCount": 16200
      }
    ],
    "pagination": {...}
  }
}
```

### GET /api/v1/device/runtime

**Query Params:**
- `deviceId`: optional (all devices if not provided)
- `period`: day | week | month | year
- `startDate`: ISO date
- `endDate`: ISO date

**Response (200):**
```json
{
  "success": true,
  "data": {
    "runtime": [
      {
        "date": "2024-01-01",
        "deviceId": "TRACKER_001",
        "totalSeconds": 28800,
        "sessionCount": 3
      }
    ]
  }
}
```

### GET /api/v1/device/status

**Response (200):**
```json
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

### POST /api/v1/device/fcm-token

**Request:**
```json
{
  "token": "fcm_token_here",
  "platform": "android",
  "deviceId": "mobile_device_id"
}
```

---

## 4. IoT Endpoints (PUBLIC - No Auth)

### POST /api/v1/iot/data

**Request:**
```json
{
  "deviceId": "TRACKER_001",
  "authToken": "device_auth_token",
  "timestamp": 1704067200000,
  "data": {
    "vibration": 0.85,
    "batteryTop": 4.15,
    "batteryBot": 4.12,
    "latitude": 21.0285,
    "longitude": 105.8542,
    "uptime": 3600
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessionId": 123,
    "config": {
      "vibrationThreshold": 1.5,
      "requestInterval": 2000
    }
  }
}
```

### GET /api/v1/iot/status

**Query Params:**
- `deviceId`: required
- `authToken`: required

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deviceId": "TRACKER_001",
    "currentStatus": "running",
    "sessionId": 123,
    "lastUpdate": "2024-01-01T12:00:00Z"
  }
}
```

### GET /api/v1/iot/latest

**Query Params:**
- `deviceId`: required

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deviceId": "TRACKER_001",
    "timestamp": "2024-01-01T12:00:00Z",
    "vibration": 0.85,
    "batteryTop": 4.15,
    "batteryBot": 4.12,
    "latitude": 21.0285,
    "longitude": 105.8542
  }
}
```

### GET /api/v1/iot/bootstrap

**Query Params:**
- `deviceId`: required
- `authToken`: required

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deviceId": "TRACKER_001",
    "config": {
      "vibrationThreshold": 1.5,
      "requestInterval": 2000,
      "firmwareVersion": "1.0.0",
      "targetFirmwareVersion": "1.1.0"
    },
    "serverTime": "2024-01-01T12:00:00Z"
  }
}
```

---

## 5. Dashboard Endpoints

### GET /api/v1/dashboard/stats

**Response (200):**
```json
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
    "runtime": {
      "today": 86400,
      "thisWeek": 604800,
      "thisMonth": 2592000
    },
    "alerts": {
      "active": 5,
      "resolved": 120
    }
  }
}
```

### GET /api/v1/dashboard/activity-log

**Query Params:**
- `limit`: default 20
- `offset`: default 0
- `type`: device | user | system

**Response (200):**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": 1,
        "type": "device",
        "action": "session_started",
        "deviceId": "TRACKER_001",
        "deviceName": "Vehicle A",
        "timestamp": "2024-01-01T12:00:00Z",
        "details": {}
      }
    ]
  }
}
```

### GET /api/v1/dashboard/alerts

**Query Params:**
- `status`: active | resolved | acknowledged
- `severity`: critical | warning | info
- `deviceId`: optional
- `limit`: default 20

**Response (200):**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": 1,
        "deviceId": "TRACKER_001",
        "deviceName": "Vehicle A",
        "errorCode": 3,
        "errorName": "Low Battery",
        "severity": "warning",
        "status": "active",
        "timestamp": "2024-01-01T12:00:00Z"
      }
    ]
  }
}
```

---

## 6. Firmware Endpoints

### GET /api/v1/firmware/list

**Response (200):**
```json
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

**Request:** `multipart/form-data`
- `file`: firmware file (.bin, .hex)
- `version`: "1.1.0"
- `description`: "Bug fixes"

**Response (201):**
```json
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

### POST /api/v1/firmware/activate (Admin)

**Request:**
```json
{
  "firmwareId": 2,
  "isActive": true
}
```

### POST /api/v1/firmware/assign (Admin)

**Request:**
```json
{
  "firmwareId": 2,
  "deviceIds": ["TRACKER_001", "TRACKER_002"]
}
```

### DELETE /api/v1/firmware/delete (Admin)

**Request:**
```json
{
  "firmwareId": 2
}
```

### GET /api/v1/firmware/devices

**Query Params:**
- `firmwareId`: optional (show all if not provided)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "deviceId": "TRACKER_001",
        "deviceName": "Vehicle A",
        "currentVersion": "1.0.0",
        "targetVersion": "1.1.0",
        "updateStatus": "pending"
      }
    ]
  }
}
```

---

## 7. Export Endpoints

### POST /api/v1/exports/create

**Request:**
```json
{
  "type": "devices",
  "format": "xlsx",
  "filters": {
    "status": "running",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "columns": ["deviceId", "deviceName", "status", "runtime"]
}
```

**Response (202):**
```json
{
  "success": true,
  "data": {
    "jobId": "export_123",
    "status": "processing"
  }
}
```

### GET /api/v1/exports/jobs

**Response (200):**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "export_123",
        "type": "devices",
        "format": "xlsx",
        "status": "completed",
        "progress": 100,
        "createdAt": "2024-01-01T12:00:00Z",
        "completedAt": "2024-01-01T12:01:00Z",
        "downloadUrl": "/api/v1/exports/download/export_123"
      }
    ]
  }
}
```

### GET /api/v1/exports/download/:jobId

**Response:** File download (xlsx/csv)

---

## 8. System Admin Endpoints (Admin Only)

### GET /api/v1/system-admin/metrics

**Query Params:**
- `query`: PromQL query
- `start`: Unix timestamp
- `end`: Unix timestamp
- `step`: "1m" | "5m" | "1h"

### GET /api/v1/system-admin/logs

**Query Params:**
- `query`: LogsQL query
- `start`: Unix timestamp
- `end`: Unix timestamp
- `limit`: default 100

### GET /api/v1/victoria/metrics

**Query Params:**
- `query`: PromQL query
- `time`: Unix timestamp (instant query)

### GET /api/v1/victoria/logs

**Query Params:**
- `query`: LogsQL query
- `limit`: default 100

---

## 9. Error Codes Endpoints

### GET /api/v1/error-codes/definitions

**Response (200):**
```json
{
  "success": true,
  "data": {
    "definitions": [
      {
        "code": 0,
        "name": "Normal Operation",
        "nameVi": "Hoạt động bình thường",
        "category": "system",
        "severity": "info"
      }
    ]
  }
}
```

### GET /api/v1/error-codes/device-errors

**Query Params:**
- `deviceId`: required
- `status`: active | resolved
- `limit`: default 20

---

## 10. Health & Metrics

### GET /health

**Response (200):**
```json
{
  "status": "healthy",
  "uptime": 86400,
  "version": "1.0.0"
}
```

### GET /ws-health

**Response (200):**
```json
{
  "status": "healthy",
  "connections": 50,
  "namespaces": {
    "/dashboard": 10,
    "/devices": 20,
    "/iot": 20
  }
}
```

### GET /metrics

**Response:** Prometheus metrics format

---

## 11. Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      {
        "field": "deviceId",
        "message": "Required"
      }
    ]
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (async job) |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Rate Limited |
| 500 | Internal Error |
