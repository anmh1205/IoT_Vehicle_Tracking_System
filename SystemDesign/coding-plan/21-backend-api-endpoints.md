# Backend API Endpoints

> Detailed REST API design for IoT Vehicle Tracking System (Advanced Features)

---

## 1. Overview

```
Base URL: /api/v1

Authentication:
├── /auth/*           # Login, logout, user management

Device Management:
├── /device/*         # Device CRUD, sessions, runtime
├── /devices/*        # Advanced device operations (Command, OTA, Import)

IoT Data (PUBLIC):
├── /iot/*            # Sensor data ingestion (no auth)

Tracking & Trips:
├── /trips/*          # Trip management and replay

Vehicles & Assets:
├── /vehicles/*       # Vehicle management

Dashboard & Analytics:
├── /dashboard/*      # Real-time dashboard
├── /stats/*          # Fleet statistics & analysis

Firmware:
├── /firmware/*       # OTA management

Export:
├── /exports/*        # Data export jobs

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
      "role": "admin",
      "avatarUrl": "https://example.com/avatar.png",
      "preferences": { "theme": "dark", "language": "vi" }
    },
    "token": "jwt_token_here",
    "expiresAt": "2024-01-02T12:00:00Z"
  }
}
```

### GET /api/v1/auth/me

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "fullName": "Administrator",
    "role": "admin",
    "deviceAccessMode": "all",
    "avatarUrl": "https://example.com/avatar.png",
    "preferences": { "theme": "dark" }
  }
}
```

---

## 3. Device Advanced Endpoints

### POST /api/v1/devices/{id}/command

Send a command to the device via MQTT.

**Parameters:**
- `id`: Device ID (e.g., TRACKER_001)

**Request:**
```json
{
  "command": "SET_INTERVAL",
  "params": {
    "interval": 5000
  },
  "timeout": 30000
}
```
*Supported commands: `SET_INTERVAL`, `REBOOT`, `FACTORY_RESET`, `LOCK_ENGINE`, `UNLOCK_ENGINE`*

**Response (200):**
```json
{
  "success": true,
  "data": {
    "commandId": "cmd_12345",
    "status": "sent",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### POST /api/v1/devices/{id}/ota

Trigger an Over-The-Air firmware update for a specific device.

**Parameters:**
- `id`: Device ID

**Request:**
```json
{
  "firmwareVersion": "1.2.0",
  "force": false
}
```

**Response (202):**
```json
{
  "success": true,
  "data": {
    "jobId": "ota_9876",
    "status": "pending",
    "targetVersion": "1.2.0"
  }
}
```

### POST /api/v1/devices/import

Bulk import devices from CSV/Excel.

**Request (Multipart):**
- `file`: CSV file containing `deviceId`, `imei`, `deviceName`, `model`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "imported": 50,
    "failed": 2,
    "errors": [
      { "row": 15, "error": "Duplicate deviceId" },
      { "row": 32, "error": "Invalid IMEI" }
    ]
  }
}
```

---

## 4. Trip & Tracking Endpoints

### GET /api/v1/devices/positions

Fetch the latest snapshot of positions for all visible devices.

**Query Params:**
- `groupId`: Optional filter.
- `status`: Optional filter.

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": "TRACKER_01", "lat": 21.0, "lon": 105.8, "spd": 50, "ts": 1704067200, "s": "moving" },
    { "id": "TRACKER_02", "lat": 21.1, "lon": 105.9, "spd": 0, "ts": 1704067200, "s": "stopped" }
  ]
}
```

### GET /api/v1/telemetry/history

Fetch raw time-series data for analysis or replay (Vehicle History).

**Query Params:**
- `deviceId`: Required.
- `from`: ISO Timestamp.
- `to`: ISO Timestamp.
- `fields`: `lat,lon,speed,fuel,engine_temp,battery`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deviceId": "TRACKER_01",
    "points": [ ... ]
  }
}
```

### POST /api/v1/telemetry/export

Trigger an asynchronous export job for telemetry data (CSV/Excel).

**Request:**
```json
{
  "deviceIds": ["TRACKER_01"],
  "from": "2024-01-01T00:00:00Z",
  "to": "2024-01-02T00:00:00Z",
  "format": "csv"
}
```

**Response (202):**
```json
{
  "success": true,
  "data": { "jobId": "export_555", "status": "processing" }
}
```

### GET /api/v1/trips/{id}/telemetry

Fetch time-series telemetry data for a completed trip (Trip Replay).

**Parameters:**
- `id`: Trip ID

**Query Params:**
- `resolution`: `raw` | `low` | `medium` | `high` (default: `medium` - reduces points for UI)
- `fields`: `lat,lon,speed,fuel,temp` (comma separated)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tripId": 1001,
    "points": [
      { "ts": 1704067200, "lat": 21.02, "lon": 105.85, "spd": 45, "fuel": 80 },
      { "ts": 1704067210, "lat": 21.03, "lon": 105.86, "spd": 48, "fuel": 79 }
    ],
    "events": [
      { "ts": 1704067205, "type": "HARSH_BRAKING", "lat": 21.025, "lon": 105.855 }
    ]
  }
}
```

---

## 5. Vehicle Endpoints

### GET /api/v1/vehicles

List vehicles with advanced filtering.

**Query Params:**
- `status`: `active` | `maintenance`
- `groupId`: Filter by group
- `search`: Plate number or driver name

**Response (200):**
```json
{
  "success": true,
  "data": {
    "vehicles": [
      {
        "id": 1,
        "vehicleId": "CAR_01",
        "plateNumber": "29A-12345",
        "iconType": "truck",
        "colorHex": "#FF5733",
        "status": "active",
        "lastLocation": { "lat": 21.02, "lon": 105.85, "ts": "..." }
      }
    ],
    "pagination": { "page": 1, "total": 50 }
  }
}
```

### POST /api/v1/vehicles/import

Bulk import vehicles.

**Request (Multipart):**
- `file`: CSV file

**Response (200):**
```json
{
  "success": true,
  "data": { "imported": 20, "failed": 0 }
}
```

---

## 6. Dashboard & Analytics Endpoints

### GET /api/v1/stats/fleet

Get high-level fleet statistics.

**Query Params:**
- `period`: `day` | `week` | `month`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalDistanceKm": 5430,
    "totalFuelLiters": 450,
    "avgEfficiency": 8.2,
    "activeTimeSeconds": 864000,
    "idleTimeSeconds": 12000,
    "safetyScore": 95,
    "violations": {
      "speeding": 12,
      "harshBraking": 5,
      "geofence": 2
    }
  }
}
```

### GET /api/v1/stats/maintenance

Get maintenance forecast and status.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "overdue": 2,
    "dueSoon": 5,
    "upcoming": 10,
    "vehicles": [
      {
        "vehicleId": "CAR_05",
        "plate": "29A-99999",
        "serviceType": "Oil Change",
        "dueDate": "2024-02-01",
        "status": "due_soon"
      }
    ]
  }
}
```

---

## 7. IoT Ingestion (Standard)

### POST /api/v1/iot/data

Standard telemetry ingestion.

**Request:**
```json
{
  "deviceId": "TRACKER_001",
  "authToken": "...",
  "timestamp": 1704067200000,
  "data": {
    "lat": 21.0285,
    "lon": 105.8542,
    "spd": 45.5,
    "hdg": 180,
    "alt": 100,
    "sat": 12,
    "batt": 4.1,
    "acc": 1,
    "io": { "di1": 1, "do1": 0 }
  }
}
```

---

## 8. Common Error Responses

**400 Bad Request:**
```json
{ "success": false, "error": { "code": "INVALID_PARAMS", "message": "Invalid date range" } }
```

**404 Not Found:**
```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Device not found" } }
```

**503 Service Unavailable:**
```json
{ "success": false, "error": { "code": "MQTT_UNAVAILABLE", "message": "Command timeout" } }
```

---

## 10. Firmware Management

### POST /api/v1/firmware

Upload new firmware version.

**Request (Multipart):**
- `file`: Binary firmware file (.bin)
- `version`: String (e.g., "1.2.0")
- `type`: String (e.g., "fota_v1")
- `description`: String

**Response (201):**
```json
{
  "success": true,
  "data": { "id": "fw_123", "version": "1.2.0", "url": "http://..." }
}
```

### GET /api/v1/firmware

List available firmware versions.

**Query Params:**
- `type`: Filter by firmware type
- `version`: Filter by version string

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": "fw_123", "version": "1.2.0", "filename": "update.bin", "size": 102400 }
  ]
}
```

### GET /api/v1/firmware/{id}

Get firmware details.

### GET /api/v1/firmware/{id}/download

Download the binary firmware file.

**Notes:**
- Validates access permissions (or uses a signed URL/public token if needed for devices).
- Must serve the file efficiently (Node.js stream or static file serve).
- Content-Type: `application/octet-stream`.
- Used by IoT devices during OTA process.

### DELETE /api/v1/firmware/{id}

Remove firmware file (physically and DB).

### PUT /api/v1/firmware/{id}/activate

Mark firmware as 'active' or 'stable' for general release.

### POST /api/v1/firmware/{id}/assign

Bulk assign firmware to a list of devices.

**Request:**
```json
{
  "deviceIds": ["TRACKER_001", "TRACKER_002"],
  "strategy": "rolling",
  "batchSize": 10
}
```

### GET /api/v1/firmware/{id}/devices

List devices assigned to this firmware version and their update status.

