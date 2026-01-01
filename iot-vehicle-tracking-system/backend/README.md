# IoT Vehicle Tracking System - Backend

NestJS API Server cho hệ thống theo dõi xe tự lái.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

Copy `.env.example` to `.env` and configure:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=vehicle_tracking

# InfluxDB
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=your_token
INFLUXDB_ORG=vehicle_tracking
INFLUXDB_BUCKET=telemetry

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password

# Auth
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# App
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1
```

### 3. Run Migrations

```bash
# Run all pending migrations
npm run migration:run

# Show migration status
npm run migration:show
```

### 4. Seed Initial Data

```bash
# Create admin user
npm run seed
```

Default admin credentials:
- Username: `admin`
- Email: `admin@example.com`
- Password: `admin123` (⚠️ Change after first login!)

### 5. Run Development Server

```bash
npm run start:dev
```

## 📁 Project Structure

```
src/
├── config/              # Configuration files
├── common/              # Shared utilities
│   ├── decorators/      # Custom decorators
│   ├── filters/         # Exception filters
│   ├── guards/         # Auth guards
│   ├── interceptors/   # Interceptors
│   ├── pipes/          # Validation pipes
│   ├── utils/          # Utility functions
│   └── exceptions/     # Custom exceptions
├── infrastructure/      # Infrastructure layer
│   ├── influxdb/       # InfluxDB module
│   └── mqtt/           # MQTT service
├── modules/            # Feature modules
│   ├── health/         # Health check module
│   ├── auth/           # Authentication module
│   ├── vehicles/       # Vehicles module
│   ├── customers/      # Customers module
│   ├── devices/        # Devices module
│   ├── trips/          # Trips module
│   ├── alerts/         # Alerts module
│   ├── violations/     # Violations module
│   ├── telemetry/      # Telemetry module
│   ├── geofences/      # Geofences module
│   ├── maintenance/    # Maintenance module
│   ├── commands/       # Commands module
│   └── websocket/      # WebSocket gateway
├── migrations/         # Database migrations
└── seeds/             # Database seeds
```

## 🔧 Available Scripts

- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Start production server
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run E2E tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run migration:generate` - Generate migration from entities
- `npm run migration:run` - Run pending migrations
- `npm run migration:revert` - Revert last migration
- `npm run migration:show` - Show migration status
- `npm run seed` - Run database seeds

## 📚 API Documentation

Once the app is running, access Swagger documentation at:
- http://localhost:3000/api/docs

## 🔐 Environment Variables

See `.env.example` for all required environment variables.

## 🗄️ Database

### Migrations

Migrations are managed using TypeORM. See `src/migrations/README.md` for details.

### Seeds

Seed files populate the database with initial data. See `src/seeds/README.md` for details.

## 🏗️ Architecture

- **Framework**: NestJS
- **Database**: PostgreSQL (TypeORM)
- **Time-Series DB**: InfluxDB
- **Message Broker**: MQTT (EMQX)
- **Real-time**: WebSocket (Socket.io)
- **Authentication**: JWT (Passport)
- **Validation**: class-validator + Zod
- **Documentation**: Swagger/OpenAPI
