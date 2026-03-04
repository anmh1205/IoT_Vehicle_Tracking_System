# System Architecture

> Kiến trúc chi tiết hệ thống IoT

---

## 1. Architecture Pattern

### Domain-Driven Design (Backend)

```
src/
├── api/                    # Interface Layer
│   ├── controllers/        # HTTP handlers
│   ├── routes/             # Route definitions
│   └── validators/         # Request validation
│
├── domain/                 # Business Logic Layer
│   ├── auth/               # Authentication domain
│   ├── device/             # Device management domain
│   ├── iot/                # IoT data domain
│   └── {domain}/           # Other domains
│       ├── services/       # Business logic
│       ├── repositories/   # Data access
│       └── types/          # Domain types
│
├── infrastructure/         # Infrastructure Layer
│   ├── database/           # Database connections
│   ├── mqtt/               # MQTT client
│   ├── cache/              # Redis/In-memory cache
│   └── logger/             # Logging
│
└── shared/                 # Shared utilities
    ├── constants/
    ├── utils/
    └── types/
```

### Feature-Based Structure (Frontend)

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth routes
│   ├── dashboard/          # Dashboard routes
│   └── layout.tsx          # Root layout
│
├── features/               # Feature modules
│   ├── auth/               # Auth feature
│   ├── devices/            # Devices feature
│   └── {feature}/          # Other features
│       ├── components/     # Feature components
│       ├── hooks/          # Feature hooks
│       └── types/          # Feature types
│
├── components/             # Shared components
│   ├── ui/                 # UI primitives (shadcn)
│   └── common/             # Common components
│
├── hooks/                  # Global hooks
├── lib/                    # Utilities
└── config/                 # Configuration
```

---

## 2. Service Architecture

### 2.1 Backend Services

```
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND SERVICES                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   API SERVER                         │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │    │
│  │  │   Auth   │ │  Device  │ │   IoT    │  ...        │    │
│  │  │  Domain  │ │  Domain  │ │  Domain  │             │    │
│  │  └──────────┘ └──────────┘ └──────────┘             │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │              Socket.IO Server                 │   │    │
│  │  │  /dashboard  /devices  /iot  /notifications  │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   MQTT BRIDGE                        │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │    │
│  │  │ Handler  │ │  Batch   │ │  Cache   │             │    │
│  │  │  Layer   │ │ Service  │ │ Service  │             │    │
│  │  └──────────┘ └──────────┘ └──────────┘             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Database Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     DATA ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────┐         │
│  │     PostgreSQL      │    │   VictoriaMetrics   │         │
│  │                     │    │                     │         │
│  │  • Users            │    │  • Sensor data      │         │
│  │  • Devices          │    │  • Location data    │         │
│  │  • Sessions         │    │  • Performance      │         │
│  │  • Firmware         │    │  • Custom metrics   │         │
│  │  • Alerts           │    │                     │         │
│  │  • Error codes      │    │  Retention: 30-90d  │         │
│  │                     │    │                     │         │
│  └─────────────────────┘    └─────────────────────┘         │
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────┐         │
│  │   VictoriaLogs      │    │       Redis         │         │
│  │                     │    │    (Optional)       │         │
│  │  • Device logs      │    │                     │         │
│  │  • System logs      │    │  • Session store    │         │
│  │  • Audit logs       │    │  • Rate limiting    │         │
│  │                     │    │  • Cache            │         │
│  │  Retention: 7-30d   │    │                     │         │
│  └─────────────────────┘    └─────────────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Communication Patterns

### 3.1 MQTT Topics Structure

```
v1/{device_id}/rawdata      # Device → Server: Sensor data
v1/{device_id}/status       # Device → Server: Status updates
v1/{device_id}/error        # Device → Server: Error reports
v1/{device_id}/firmware     # Device → Server: Firmware status

v1/{device_id}/commands     # Server → Device: Commands
v1/{device_id}/config       # Server → Device: Config updates
v1/{device_id}/ota          # Server → Device: OTA instructions
```

### 3.2 Socket.IO Namespaces

```
/                           # Default namespace
├── /dashboard              # Dashboard updates
│   ├── stats.updated       # Stats changed
│   └── activity.new        # New activity
│
├── /devices                # Device updates
│   ├── device.status.changed
│   ├── device.location.updated
│   └── device.data.received
│
├── /iot                    # IoT-specific events
│   ├── sensor.data
│   └── alert.triggered
│
└── /notifications          # User notifications
    ├── notification.received
    └── notification.read
```

### 3.3 API Response Format

```typescript
// Success response
{
  "success": true,
  "data": {
    // Response data
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": [] // Optional validation errors
  }
}

// Paginated response
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

## 4. Security Architecture

### 4.1 Authentication Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client  │         │  Backend │         │    DB    │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │
     │  POST /auth/login  │                    │
     │  {username, pass}  │                    │
     │───────────────────▶│                    │
     │                    │  Verify password   │
     │                    │───────────────────▶│
     │                    │◀───────────────────│
     │                    │                    │
     │    {token, user}   │                    │
     │◀───────────────────│                    │
     │                    │                    │
     │  GET /api/resource │                    │
     │  Auth: Bearer xxx  │                    │
     │───────────────────▶│                    │
     │                    │  Verify JWT        │
     │                    │  Check permissions │
     │                    │                    │
     │    {resource data} │                    │
     │◀───────────────────│                    │
```

### 4.2 Device Authentication

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Device  │         │   EMQX   │         │  Backend │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │
     │  CONNECT           │                    │
     │  user: device_id   │                    │
     │  pass: auth_token  │                    │
     │───────────────────▶│                    │
     │                    │  HTTP Auth webhook │
     │                    │───────────────────▶│
     │                    │                    │
     │                    │  allow/deny        │
     │                    │◀───────────────────│
     │                    │                    │
     │  CONNACK           │                    │
     │◀───────────────────│                    │
```

---

## 5. Deployment Architecture

### 5.1 Docker Compose (Development/Small Scale)

```
┌─────────────────────────────────────────────────────────────┐
│                     DOCKER COMPOSE                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  nginx  │  │frontend │  │ backend │  │  mqtt   │        │
│  │  :80    │  │  :3002  │  │  :3000  │  │ bridge  │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │postgres │  │victoria │  │victoria │  │  emqx   │        │
│  │  :5432  │  │ metrics │  │  logs   │  │  :1883  │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                              │
│  ┌─────────┐                                                │
│  │ grafana │                                                │
│  │  :3001  │                                                │
│  └─────────┘                                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Production Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PRODUCTION                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌──────────────┐                         │
│                    │ Load Balancer│                         │
│                    │   (nginx)    │                         │
│                    └──────┬───────┘                         │
│            ┌──────────────┼──────────────┐                  │
│            ▼              ▼              ▼                  │
│     ┌──────────┐   ┌──────────┐   ┌──────────┐             │
│     │ Backend 1│   │ Backend 2│   │ Backend 3│             │
│     └──────────┘   └──────────┘   └──────────┘             │
│            │              │              │                  │
│            └──────────────┼──────────────┘                  │
│                           ▼                                 │
│     ┌──────────┐   ┌──────────┐   ┌──────────┐             │
│     │  Redis   │   │ Postgres │   │ Victoria │             │
│     │ (Session)│   │ (Primary)│   │ Metrics  │             │
│     └──────────┘   └──────────┘   └──────────┘             │
│                           │                                 │
│                    ┌──────────┐                             │
│                    │ Postgres │                             │
│                    │ (Replica)│                             │
│                    └──────────┘                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Error Handling Strategy

### 6.1 Error Categories

| Category | HTTP Code | Handling |
|----------|-----------|----------|
| Validation | 400/422 | Return field errors |
| Authentication | 401 | Redirect to login |
| Authorization | 403 | Show access denied |
| Not Found | 404 | Show not found page |
| Rate Limit | 429 | Show retry message |
| Server Error | 500 | Log + generic message |

### 6.2 Retry Strategy

```typescript
// MQTT reconnection
{
  reconnectPeriod: 5000,      // 5 seconds
  connectTimeout: 30000,      // 30 seconds
  maxReconnectAttempts: 10
}

// Database connection pool
{
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
}

// HTTP client retry
{
  retries: 3,
  retryDelay: 1000,
  retryCondition: (error) => error.code === 'ECONNRESET'
}
```

---

## 7. Monitoring & Observability

### 7.1 Metrics (Prometheus format)

```promql
# Application metrics
http_requests_total{method, path, status}
http_request_duration_seconds{method, path}
websocket_connections_current
mqtt_messages_received_total
mqtt_messages_processed_total

# Business metrics
devices_total{status}
sessions_active
alerts_triggered_total{type}
```

### 7.2 Logging Structure

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "info",
  "message": "Device data received",
  "service": "mqtt-bridge",
  "deviceId": "DEVICE_001",
  "correlationId": "uuid",
  "data": {}
}
```

### 7.3 Health Checks

```
GET /health          → API server health
GET /ws-health       → WebSocket health
GET /metrics         → Prometheus metrics
```
