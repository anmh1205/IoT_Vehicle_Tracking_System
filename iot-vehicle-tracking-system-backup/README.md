# IoT Vehicle Tracking System

Hệ thống theo dõi xe tự lái sử dụng IoT trackers, MQTT, và real-time monitoring.

## 🏗️ Cấu Trúc Project

```
iot-vehicle-tracking-system/
├── backend/          # NestJS API Server
├── frontend/         # Next.js Web App
├── docker/           # Docker configuration files
├── data/             # Persistent data volumes
└── docker-compose.yml # Docker Compose configuration
```

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Copy environment file
cp .env.example .env

# Edit .env với các giá trị thực tế
nano .env
```

### 2. Start Services

```bash
# Build và start tất cả services
docker-compose up -d --build

# Xem logs
docker-compose logs -f
```

### 3. Access Services

- **Frontend**: http://localhost:4001
- **Backend API**: http://localhost:4000
- **PostgreSQL**: localhost:5432
- **InfluxDB**: http://localhost:8086
- **EMQX Dashboard**: http://localhost:18083
- **Nginx Proxy Manager**: http://localhost:81

## 📋 Services

- **Backend**: NestJS API Server (Port 4000)
- **Frontend**: Next.js Web App (Port 4001)
- **PostgreSQL**: Relational database
- **InfluxDB**: Time-series database
- **EMQX**: MQTT Broker
- **Nginx Proxy Manager**: Reverse proxy

## 🔧 Development

### Option 1: Run cả Frontend và Backend cùng lúc (Recommended)

```bash
# Cài đặt dependencies cho root, backend và frontend
npm run install:all

# Chạy cả frontend và backend với một lệnh
npm run dev
```

Lệnh này sẽ chạy:

- **Backend**: http://localhost:4000 (hoặc port được cấu hình trong .env)
- **Frontend**: http://localhost:4001

### Option 2: Run riêng biệt

```bash
# Start only databases
docker-compose up -d postgres influxdb emqx

# Run backend và frontend riêng biệt
cd backend && npm run start:dev
cd frontend && npm run dev
```

### Các lệnh khác

```bash
# Chỉ chạy backend
npm run dev:backend

# Chỉ chạy frontend
npm run dev:frontend

# Build cả hai
npm run build

# Start production
npm run start
```

## 📚 Documentation

Xem chi tiết trong [`SystemDesign/iot-vehicle-tracking-report/04-server/part-08-docker-deployment.md`](../SystemDesign/iot-vehicle-tracking-report/04-server/part-08-docker-deployment.md)

## 🔐 Security

- Không commit `.env` vào git
- Sử dụng strong passwords
- Enable SSL/TLS trong production

## 📝 License

[Your License Here]
