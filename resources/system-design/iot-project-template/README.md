# IoT Project Template

> Template chuẩn cho các dự án IoT với Node.js/Express + Next.js + VictoriaMetrics

---

## Tổng Quan

Template này cung cấp kiến trúc và coding plan chi tiết cho các dự án IoT, bao gồm:

- **Backend**: Express.js + TypeScript + Domain-Driven Design
- **Frontend**: Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui
- **Database**: PostgreSQL (relational) + VictoriaMetrics (time-series)
- **Real-time**: Socket.IO + MQTT (EMQX broker)
- **Mobile**: Flutter WebView + Push Notifications

---

## Cấu Trúc Template

```
IoT_Project_Template/
├── README.md                           # File này
├── CUSTOMIZATION.md                    # Hướng dẫn customize cho domain cụ thể
│
├── system-design/                      # Thiết kế hệ thống
│   ├── 01-overview.md                  # Tổng quan kiến trúc
│   ├── 02-requirements.md              # Yêu cầu hệ thống
│   ├── 03-architecture.md              # Kiến trúc chi tiết
│   ├── 04-database-design.md           # Thiết kế database
│   ├── 05-api-design.md                # Thiết kế API
│   ├── 06-realtime-design.md           # Socket.IO + MQTT
│   ├── 07-frontend-design.md           # Thiết kế giao diện
│   ├── 08-security.md                  # Bảo mật
│   ├── 09-deployment.md                # Triển khai
│   └── 10-monitoring.md                # Giám sát & logging
│
└── coding-plan/                        # Kế hoạch coding chi tiết
    ├── README.md                       # Tổng quan coding plan
    ├── 01-coding-standards.md          # Quy chuẩn code
    ├── 02-project-structure.md         # Cấu trúc dự án
    ├── 03-backend-domains.md           # Backend domains
    ├── 04-backend-api.md               # API endpoints
    ├── 05-mqtt-bridge.md               # MQTT integration
    ├── 06-frontend-features.md         # Frontend features
    ├── 07-database-schema.md           # Database schema
    ├── 08-timeseries-metrics.md        # VictoriaMetrics
    ├── 09-realtime-events.md           # Socket.IO events
    ├── 10-docker-compose.md            # Docker deployment
    └── config/                         # Domain configuration
        ├── sensors.example.ts          # Sensor types config
        ├── metrics.example.ts          # Metrics config
        └── domains.example.ts          # Domain entities config
```

---

## Các Domain IoT Có Thể Áp Dụng

| Domain | Sensors | Use Cases |
|--------|---------|-----------|
| **Vehicle Tracking** | GPS, Vibration, Speed, Fuel | Fleet management, Logistics |
| **Smart Home** | Temperature, Humidity, Motion, Light | Home automation |
| **Industrial IoT** | Pressure, Flow, Temperature, Vibration | Manufacturing, Maintenance |
| **Agriculture** | Soil moisture, pH, Light, Weather | Smart farming |
| **Healthcare** | Heart rate, SpO2, Temperature | Patient monitoring |
| **Energy** | Voltage, Current, Power, Energy | Smart grid, Solar |

---

## Quick Start

### 1. Clone Template

```bash
cp -r IoT_Project_Template my-iot-project
cd my-iot-project
```

### 2. Customize Domain

1. Đọc `CUSTOMIZATION.md`
2. Sửa `coding-plan/config/sensors.example.ts` → `sensors.ts`
3. Sửa `coding-plan/config/domains.example.ts` → `domains.ts`
4. Update các file markdown theo domain

### 3. Bắt Đầu Coding

Theo thứ tự trong `coding-plan/README.md`:
1. Database schema
2. Backend API
3. MQTT Bridge
4. Frontend features

---

## Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL 16 + pg driver
- **Validation**: Zod
- **Auth**: JWT + bcrypt
- **Real-time**: Socket.IO 4.x
- **MQTT**: mqtt.js + EMQX broker

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **State**: TanStack Query + Zustand
- **Charts**: Recharts
- **Maps**: Leaflet / Mapbox

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Time-series DB**: VictoriaMetrics
- **Logging**: VictoriaLogs
- **Monitoring**: Grafana
- **MQTT Broker**: EMQX

---

## License

MIT License - Free to use for any IoT project.
