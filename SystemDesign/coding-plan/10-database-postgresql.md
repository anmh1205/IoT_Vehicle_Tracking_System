# Database Schema (PostgreSQL)

> Schema PostgreSQL cho IoT Vehicle Tracking System

---

## 1. Tổng Quan

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Core Tables (11)          Feature Tables (8)               │
│  ├── users                 ├── export_jobs                  │
│  ├── devices               ├── export_audit_log             │
│  ├── device_sessions       ├── fcm_tokens                   │
│  ├── error_code_defs       ├── user_online_status           │
│  ├── event_logs            ├── user_audit_logs              │
│  ├── validation_errors     ├── device_audit_logs            │
│  ├── firmware_logs         ├── firmware_audit_logs          │
│  ├── user_sessions         └── firmware                     │
│  ├── user_device_access                                      │
│  ├── firmware                                                │
│  └── firmware_update_log                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Tables

### 2.1 users

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) DEFAULT 'No name',
    role VARCHAR(20) DEFAULT 'user',  -- user, admin, root
    device_access_mode VARCHAR(20) DEFAULT 'all',  -- all, limited
    status VARCHAR(20) DEFAULT 'active',
    email VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

### 2.2 devices

```sql
CREATE TABLE devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) UNIQUE NOT NULL,
    device_name VARCHAR(100) NOT NULL,
    auth_token VARCHAR(64) UNIQUE NOT NULL,
    last_seen_at TIMESTAMPTZ,
    current_status device_status_enum DEFAULT 'stopped',
    total_runtime_seconds BIGINT DEFAULT 0,
    imei VARCHAR(20),
    vibration_threshold DECIMAL(8,3) DEFAULT 1.000,
    request_interval INT DEFAULT 2000,
    firmware_version VARCHAR(20),
    target_firmware_version VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    config JSONB,
    last_error_code INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_devices_device_id ON devices(device_id);
CREATE INDEX idx_devices_auth_token ON devices(auth_token);
CREATE INDEX idx_devices_status ON devices(current_status);
CREATE INDEX idx_devices_last_seen ON devices(last_seen_at);
```

### 2.3 device_sessions

```sql
CREATE TABLE device_sessions (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) REFERENCES devices(device_id) ON DELETE CASCADE,
    status session_status_enum DEFAULT 'running',
    server_session_start TIMESTAMPTZ,
    server_session_end TIMESTAMPTZ,
    session_start TIMESTAMPTZ,
    session_end TIMESTAMPTZ,
    uptime INT,
    avg_vibration DECIMAL(8,3),
    min_vibration DECIMAL(8,3),
    max_vibration DECIMAL(8,3),
    avg_battery_top DECIMAL(4,2),
    avg_battery_bot DECIMAL(4,2),
    data_points_count INT DEFAULT 0,
    last_update TIMESTAMPTZ,
    start_correlation_id VARCHAR(64),
    end_correlation_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_device_sessions_device_id ON device_sessions(device_id);
CREATE INDEX idx_device_sessions_status ON device_sessions(status);
CREATE INDEX idx_device_sessions_device_end_null ON device_sessions(device_id)
    WHERE session_end IS NULL;
```

### 2.4 error_code_definitions

```sql
CREATE TABLE error_code_definitions (
    code INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_vi VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) CHECK (category IN ('connection', 'battery', 'vibration', 'firmware', 'sensor', 'system')),
    severity VARCHAR(20) CHECK (severity IN ('critical', 'warning', 'info')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO error_code_definitions (code, name, name_vi, category, severity) VALUES
(0, 'Normal Operation', 'Hoạt động bình thường', 'system', 'info'),
(1, 'High Vibration Warning', 'Cảnh báo rung cao', 'vibration', 'warning'),
(2, 'Network Connection Error', 'Lỗi kết nối mạng', 'connection', 'warning'),
(3, 'Low Battery', 'Pin yếu', 'battery', 'warning'),
(4, 'Sensor Malfunction', 'Lỗi cảm biến', 'sensor', 'critical'),
(5, 'Firmware Update Required', 'Cần cập nhật firmware', 'firmware', 'info'),
(6, 'Critical Battery Low', 'Pin cực thấp', 'battery', 'critical'),
(7, 'Connection Lost', 'Mất kết nối', 'connection', 'critical'),
(8, 'Vibration Sensor Calibration Needed', 'Cần hiệu chuẩn cảm biến rung', 'sensor', 'warning'),
(9, 'Firmware Update Failed', 'Cập nhật firmware thất bại', 'firmware', 'critical');
```

### 2.5 event_logs

```sql
CREATE TABLE event_logs (
    id BIGSERIAL PRIMARY KEY,
    correlation_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(50) NOT NULL,
    session_id BIGINT REFERENCES device_sessions(id),
    event_type event_type_enum,
    event_code VARCHAR(32),
    severity severity_enum,
    context JSONB,
    metadata JSONB,
    message TEXT,
    device_timestamp TIMESTAMPTZ,
    server_timestamp TIMESTAMPTZ DEFAULT NOW(),
    error_code INTEGER REFERENCES error_code_definitions(code),
    resolved_at TIMESTAMPTZ,
    resolved_by INTEGER REFERENCES users(id),
    resolution_notes TEXT,
    error_status VARCHAR(20) CHECK (error_status IN ('active', 'resolved', 'acknowledged')),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_event_device_time ON event_logs(device_id, server_timestamp);
CREATE INDEX idx_event_correlation ON event_logs(correlation_id);
CREATE INDEX idx_event_type_time ON event_logs(event_type, server_timestamp);
CREATE INDEX idx_event_logs_error_status ON event_logs(error_status);
```

---

## 3. ENUM Types

```sql
CREATE TYPE event_type_enum AS ENUM ('error', 'warning', 'status_change', 'validation', 'connection', 'firmware');
CREATE TYPE severity_enum AS ENUM ('debug', 'info', 'warning', 'error', 'critical');
CREATE TYPE device_status_enum AS ENUM ('running', 'stopped', 'disconnected');
CREATE TYPE session_status_enum AS ENUM ('running', 'completed', 'disconnected');
CREATE TYPE firmware_status_enum AS ENUM ('started', 'in_progress', 'success', 'failed', 'timeout');
```

---

## 4. Firmware Tables

```sql
CREATE TABLE firmware (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) UNIQUE NOT NULL,
    filename VARCHAR(255) UNIQUE NOT NULL,
    size BIGINT NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE firmware_update_log (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) REFERENCES devices(device_id) ON DELETE CASCADE,
    firmware_id INTEGER REFERENCES firmware(id) ON DELETE CASCADE,
    status firmware_status_enum,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. User Session & Access

```sql
CREATE TABLE user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(128) UNIQUE NOT NULL,
    login_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_device_access (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(50) REFERENCES devices(device_id) ON DELETE CASCADE,
    granted_by INT REFERENCES users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);
```

---

## 6. Audit Tables

```sql
CREATE TABLE user_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    actor_user_id INT REFERENCES users(id),
    actor_username VARCHAR(50),
    actor_ip VARCHAR(45),
    actor_user_agent TEXT,
    action user_audit_action_enum,
    resource_type VARCHAR(30),
    resource_id VARCHAR(100),
    target_user_id INT REFERENCES users(id),
    details JSONB,
    correlation_id VARCHAR(64),
    success BOOLEAN,
    error_message TEXT
);

CREATE TABLE device_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    actor_user_id INT REFERENCES users(id),
    action device_audit_action_enum,
    device_id VARCHAR(50),
    changes JSONB,
    correlation_id VARCHAR(64)
);

CREATE TABLE firmware_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    actor_user_id INT REFERENCES users(id),
    action firmware_audit_action_enum,
    firmware_id INT,
    device_ids TEXT[],
    details JSONB,
    correlation_id VARCHAR(64)
);
```

---

## 7. Trigger Functions

```sql
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ... repeat for other tables
```

---

## 8. Vehicle Tracking Domain Tables

> Các tables bổ sung cho Vehicle Tracking System (ngoài Device Monitoring core)

### 8.1 vehicles

```sql
CREATE TYPE vehicle_status AS ENUM ('active', 'inactive', 'maintenance', 'retired');
CREATE TYPE vehicle_type AS ENUM ('sedan', 'suv', 'hatchback', 'coupe', 'pickup', 'van', 'truck', 'motorcycle');
CREATE TYPE fuel_type AS ENUM ('gasoline', 'diesel', 'hybrid', 'electric');
CREATE TYPE transmission_type AS ENUM ('manual', 'automatic');

CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) UNIQUE NOT NULL,
    plate_number VARCHAR(20) UNIQUE,
    device_id VARCHAR(50) REFERENCES devices(device_id),
    customer_id INT REFERENCES customers(id),
    vehicle_type vehicle_type,
    brand VARCHAR(50),
    model VARCHAR(50),
    year INTEGER,
    color VARCHAR(30),
    vin VARCHAR(50),
    seats INTEGER DEFAULT 5,
    transmission transmission_type,
    fuel_type fuel_type,
    mileage_km INTEGER DEFAULT 0,
    registration_number VARCHAR(50),
    insurance_expiry DATE,
    status vehicle_status DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicles_vehicle_id ON vehicles(vehicle_id);
CREATE INDEX idx_vehicles_plate_number ON vehicles(plate_number);
CREATE INDEX idx_vehicles_device_id ON vehicles(device_id);
CREATE INDEX idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
```

### 8.2 customers

```sql
CREATE TYPE customer_type AS ENUM ('individual', 'company');
CREATE TYPE customer_status AS ENUM ('active', 'inactive', 'suspended');

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    customer_type customer_type DEFAULT 'individual',
    name VARCHAR(200) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    tax_code VARCHAR(20),
    contact_person VARCHAR(100),
    status customer_status DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_code ON customers(customer_code);
CREATE INDEX idx_customers_status ON customers(status);
```

### 8.3 trips

```sql
CREATE TYPE trip_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');

CREATE TABLE trips (
    id BIGSERIAL PRIMARY KEY,
    trip_code VARCHAR(50) UNIQUE NOT NULL,
    vehicle_id VARCHAR(50) REFERENCES vehicles(vehicle_id),
    device_id VARCHAR(50) REFERENCES devices(device_id),
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),
    start_location TEXT,
    start_latitude DECIMAL(10, 8),
    start_longitude DECIMAL(11, 8),
    end_location TEXT,
    end_latitude DECIMAL(10, 8),
    end_longitude DECIMAL(11, 8),
    planned_start TIMESTAMPTZ,
    planned_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    distance_km DECIMAL(10, 2),
    fuel_used_liters DECIMAL(10, 2),
    status trip_status DEFAULT 'planned',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX idx_trips_device_id ON trips(device_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_dates ON trips(planned_start, planned_end);
```

### 8.4 geofences

```sql
CREATE TYPE geofence_type AS ENUM ('circle', 'polygon', 'rectangle');
CREATE TYPE geofence_trigger AS ENUM ('enter', 'exit', 'both');

CREATE TABLE geofences (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    geofence_type geofence_type DEFAULT 'circle',
    -- For circle: center point + radius
    center_latitude DECIMAL(10, 8),
    center_longitude DECIMAL(11, 8),
    radius_meters INTEGER,
    -- For polygon/rectangle: GeoJSON
    coordinates JSONB,
    trigger_on geofence_trigger DEFAULT 'both',
    is_active BOOLEAN DEFAULT true,
    notify_email BOOLEAN DEFAULT false,
    notify_push BOOLEAN DEFAULT true,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE geofence_vehicles (
    id SERIAL PRIMARY KEY,
    geofence_id INT REFERENCES geofences(id) ON DELETE CASCADE,
    vehicle_id VARCHAR(50) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(geofence_id, vehicle_id)
);

CREATE INDEX idx_geofences_active ON geofences(is_active);
```

### 8.5 alerts

```sql
CREATE TYPE alert_type AS ENUM (
    'speeding', 'geofence_enter', 'geofence_exit',
    'harsh_braking', 'harsh_acceleration', 'idle_too_long',
    'low_battery', 'device_offline', 'sos', 'maintenance_due'
);
CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed');
CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE alerts (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) REFERENCES vehicles(vehicle_id),
    device_id VARCHAR(50) REFERENCES devices(device_id),
    trip_id BIGINT REFERENCES trips(id),
    geofence_id INT REFERENCES geofences(id),
    alert_type alert_type NOT NULL,
    severity alert_severity DEFAULT 'medium',
    status alert_status DEFAULT 'active',
    title VARCHAR(200) NOT NULL,
    message TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    speed DECIMAL(6, 2),
    threshold_value DECIMAL(10, 2),
    actual_value DECIMAL(10, 2),
    acknowledged_by INT REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_by INT REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_vehicle_id ON alerts(vehicle_id);
CREATE INDEX idx_alerts_device_id ON alerts(device_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_type ON alerts(alert_type);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
```

### 8.6 maintenance

```sql
CREATE TYPE maintenance_type AS ENUM (
    'oil_change', 'tire_rotation', 'brake_service',
    'engine_service', 'transmission', 'battery',
    'inspection', 'other'
);
CREATE TYPE maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

CREATE TABLE maintenance (
    id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) REFERENCES vehicles(vehicle_id),
    maintenance_type maintenance_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    scheduled_date DATE,
    completed_date DATE,
    mileage_at_service INTEGER,
    next_service_mileage INTEGER,
    next_service_date DATE,
    cost DECIMAL(12, 2),
    service_provider VARCHAR(200),
    status maintenance_status DEFAULT 'scheduled',
    notes TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_maintenance_vehicle_id ON maintenance(vehicle_id);
CREATE INDEX idx_maintenance_status ON maintenance(status);
CREATE INDEX idx_maintenance_scheduled ON maintenance(scheduled_date);
```

---

## 9. Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   users     │     │  customers  │     │  geofences  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │    ┌──────────────┼───────────────────┤
       │    │              │                   │
       ▼    ▼              ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   devices   │◄────│  vehicles   │────▶│geofence_veh │
└──────┬──────┘     └──────┬──────┘     └─────────────┘
       │                   │
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│device_sess  │     │    trips    │     │   alerts    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   │
┌─────────────┐     ┌─────────────┐            │
│ event_logs  │     │ maintenance │◄───────────┘
└─────────────┘     └─────────────┘
```

---

## 10. So Sánh Schema

| Core (Device Monitoring) | Vehicle Tracking Extension |
|--------------------------|---------------------------|
| users | customers |
| devices | vehicles |
| device_sessions | trips |
| event_logs | alerts |
| firmware | maintenance |
| error_code_definitions | geofences |
