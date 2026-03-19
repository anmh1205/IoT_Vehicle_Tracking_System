# System Overview

> Tổng quan kiến trúc hệ thống IoT

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              IOT SYSTEM ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                 │
│  │  IoT Device  │     │  IoT Device  │     │  IoT Device  │                 │
│  │  (ESP32/STM) │     │  (ESP32/STM) │     │  (ESP32/STM) │                 │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘                 │
│         │                    │                    │                          │
│         └────────────────────┼────────────────────┘                          │
│                              │                                               │
│                              ▼                                               │
│                    ┌──────────────────┐                                      │
│                    │    EMQX Broker   │                                      │
│                    │   (MQTT Server)  │                                      │
│                    └────────┬─────────┘                                      │
│                             │                                                │
│         ┌───────────────────┼───────────────────┐                           │
│         │                   │                   │                            │
│         ▼                   ▼                   ▼                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │ MQTT Bridge │    │   Backend   │    │  Frontend   │                      │
│  │  (Worker)   │    │  (Express)  │    │  (Next.js)  │                      │
│  └──────┬──────┘    └──────┬──────┘    └─────────────┘                      │
│         │                  │                                                 │
│         ▼                  ▼                                                 │
│  ┌─────────────────────────────────────┐                                    │
│  │           DATA LAYER                 │                                    │
│  │  ┌────────────┐  ┌────────────────┐ │                                    │
│  │  │ PostgreSQL │  │ VictoriaMetrics│ │                                    │
│  │  │ (Metadata) │  │ (Time-series)  │ │                                    │
│  │  └────────────┘  └────────────────┘ │                                    │
│  └─────────────────────────────────────┘                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Overview

### 2.1 IoT Devices (Edge Layer)

| Component | Technology | Purpose |
|-----------|------------|---------|
| MCU | ESP32 / STM32 | Main controller |
| Sensors | Domain-specific | Data collection |
| Communication | MQTT over WiFi/4G | Data transmission |
| Firmware | C/C++ / MicroPython | Device logic |

### 2.2 Message Broker

| Component | Technology | Purpose |
|-----------|------------|---------|
| MQTT Broker | EMQX 5.x | Message routing |
| WebSocket | EMQX WSS | Browser connections |
| Authentication | Username/Password | Device auth |

### 2.3 Backend Services

| Service | Technology | Purpose |
|---------|------------|---------|
| API Server | Express.js + TypeScript | REST API |
| MQTT Bridge | Node.js Worker | MQTT → Database |
| Socket.IO | Socket.IO 4.x | Real-time updates |
| Auth | JWT + bcrypt | Authentication |

### 2.4 Data Layer

| Database | Technology | Purpose |
|----------|------------|---------|
| Relational | PostgreSQL 16 | Device metadata, users |
| Time-series | VictoriaMetrics | Sensor data |
| Logs | VictoriaLogs | Event logging |

### 2.5 Frontend

| Component | Technology | Purpose |
|-----------|------------|---------|
| Web App | Next.js 16 | Dashboard |
| UI Library | shadcn/ui + Tailwind | Components |
| State | TanStack Query + Zustand | Data management |
| Real-time | Socket.IO Client | Live updates |

### 2.6 Mobile

| Component | Technology | Purpose |
|-----------|------------|---------|
| App Shell | Flutter | Cross-platform |
| WebView | flutter_inappwebview | Dashboard embed |
| Push | FCM + Socket.IO | Notifications |

---

## 3. Data Flow

### 3.1 Sensor Data Flow

```
IoT Device
    │
    │ 1. MQTT Publish (v1/{device_id}/rawdata)
    ▼
EMQX Broker
    │
    │ 2. Subscribe & Receive
    ▼
MQTT Bridge
    │
    ├── 3a. Write to VictoriaMetrics (time-series)
    ├── 3b. Update PostgreSQL (device state)
    └── 3c. Emit Socket.IO event
           │
           │ 4. Real-time broadcast
           ▼
      Dashboard / Mobile App
```

### 3.2 API Request Flow

```
User/Client
    │
    │ 1. HTTP Request
    ▼
Backend API
    │
    ├── 2. Auth middleware (JWT)
    ├── 3. Validation (Zod)
    ├── 4. Business logic
    │
    ├── 5a. Query PostgreSQL (metadata)
    └── 5b. Query VictoriaMetrics (metrics)
           │
           │ 6. Response
           ▼
      Client
```

### 3.3 Real-time Event Flow

```
State Change (device status, alert, etc.)
    │
    │ 1. Event emitted
    ▼
Socket.IO Server
    │
    │ 2. Broadcast to namespace
    ▼
Connected Clients
    │
    │ 3. React Query cache update
    ▼
UI Re-render
```

---

## 4. Scalability

### Horizontal Scaling

```
                    ┌─────────────┐
                    │ Load Balancer│
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ Backend 1  │  │ Backend 2  │  │ Backend 3  │
    └────────────┘  └────────────┘  └────────────┘
           │               │               │
           └───────────────┼───────────────┘
                           ▼
                    ┌─────────────┐
                    │   Redis     │ (Session store)
                    └─────────────┘
```

### MQTT Bridge Scaling

```
EMQX Broker (Shared Subscription)
    │
    ├── MQTT Bridge Worker 1
    ├── MQTT Bridge Worker 2
    └── MQTT Bridge Worker 3
```

---

## 5. Technology Summary

| Layer | Technology | Version |
|-------|------------|---------|
| **Device** | ESP32 / STM32 | - |
| **Protocol** | MQTT 5.0 | EMQX 5.3 |
| **Backend** | Express + TypeScript | Node 20 |
| **Frontend** | Next.js + React | 16 / 19 |
| **Database** | PostgreSQL | 16 |
| **Time-series** | VictoriaMetrics | 1.96+ |
| **Logging** | VictoriaLogs | 1.0+ |
| **Monitoring** | Grafana | 10.x |
| **Container** | Docker Compose | 3.8 |
