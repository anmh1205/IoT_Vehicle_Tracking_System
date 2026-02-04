# Database Design

> Thiết kế database cho hệ thống IoT

---

## 1. Database Strategy

### Dual Database Approach

| Database | Purpose | Data Type |
|----------|---------|-----------|
| **PostgreSQL** | Metadata, relationships | Users, Devices, Config, Alerts |
| **VictoriaMetrics** | Time-series data | Sensor readings, Metrics |

### Why This Approach?

| Concern | PostgreSQL | VictoriaMetrics |
|---------|------------|-----------------|
| ACID transactions | ✅ Full support | ❌ Not applicable |
| Relationships | ✅ Foreign keys | ❌ No relations |
| Time-series queries | ❌ Slow at scale | ✅ Optimized |
| Data retention | Manual | ✅ Auto-expiry |
| Aggregations | ❌ Heavy | ✅ Built-in |

---

## 2. PostgreSQL Schema

### 2.1 Core Tables

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user',  -- 'root', 'admin', 'user'
    status VARCHAR(20) DEFAULT 'active',
    device_access_mode VARCHAR(20) DEFAULT 'all',  -- 'all', 'limited'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Devices table
CREATE TABLE devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) UNIQUE NOT NULL,
    device_name VARCHAR(100),
    auth_token VARCHAR(255) NOT NULL,

    -- Status
    current_status VARCHAR(20) DEFAULT 'disconnected',
    last_seen_at TIMESTAMP,

    -- Configuration (domain-specific)
    config JSONB DEFAULT '{}',

    -- Location (optional)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Firmware
    firmware_version VARCHAR(20),
    target_firmware_version VARCHAR(20),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Device sessions (optional - for tracking activity periods)
CREATE TABLE device_sessions (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) REFERENCES devices(device_id),
    status VARCHAR(20) DEFAULT 'running',

    -- Timing
    session_start TIMESTAMP,
    session_end TIMESTAMP,
    duration_seconds INTEGER,

    -- Statistics (domain-specific)
    stats JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 User-Device Access

```sql
-- User device access (for limited access mode)
CREATE TABLE user_device_access (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(50) REFERENCES devices(device_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, device_id)
);
```

### 2.3 Alerts & Notifications

```sql
-- Alerts
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) REFERENCES devices(device_id),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'warning',  -- 'info', 'warning', 'critical'
    status VARCHAR(20) DEFAULT 'active',     -- 'active', 'acknowledged', 'resolved'

    -- Alert data
    message TEXT,
    data JSONB DEFAULT '{}',

    -- Timing
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.4 Firmware Management

```sql
-- Firmware versions
CREATE TABLE firmware (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) UNIQUE NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    sha256_hash VARCHAR(64),
    description TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Firmware assignments
CREATE TABLE firmware_assignments (
    id SERIAL PRIMARY KEY,
    firmware_id INTEGER REFERENCES firmware(id),
    device_id VARCHAR(50) REFERENCES devices(device_id),
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'downloading', 'completed', 'failed'
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE(device_id)
);
```

### 2.5 Error Codes (Domain-specific)

```sql
-- Error code definitions
CREATE TABLE error_code_definitions (
    code INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_vi VARCHAR(100),
    description TEXT,
    category VARCHAR(50),
    severity VARCHAR(20) DEFAULT 'warning',
    suggested_action TEXT
);

-- Device error history
CREATE TABLE device_errors (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) REFERENCES devices(device_id),
    error_code INTEGER REFERENCES error_code_definitions(code),
    status VARCHAR(20) DEFAULT 'active',
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    notes TEXT
);
```

### 2.6 Activity Logs

```sql
-- Activity logs
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    actor_type VARCHAR(20) NOT NULL,  -- 'user', 'device', 'system'
    actor_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(50),
    details JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for time-based queries
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
```

---

## 3. Indexes

```sql
-- Users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Devices
CREATE INDEX idx_devices_device_id ON devices(device_id);
CREATE INDEX idx_devices_status ON devices(current_status);
CREATE INDEX idx_devices_last_seen ON devices(last_seen_at DESC);

-- Sessions
CREATE INDEX idx_sessions_device_id ON device_sessions(device_id);
CREATE INDEX idx_sessions_status ON device_sessions(status);
CREATE INDEX idx_sessions_start ON device_sessions(session_start DESC);

-- Alerts
CREATE INDEX idx_alerts_device_id ON alerts(device_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_triggered ON alerts(triggered_at DESC);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
```

---

## 4. VictoriaMetrics Schema

### 4.1 Metric Naming Convention

```
{prefix}_{sensor_type}{device_id="...", session_id="...", ...}

# Examples:
device_temperature{device_id="SENSOR_001"} 25.5
device_humidity{device_id="SENSOR_001"} 65.0
device_battery{device_id="SENSOR_001"} 4.15
device_latitude{device_id="TRACKER_001"} 21.0285
device_longitude{device_id="TRACKER_001"} 105.8542
```

### 4.2 Labels

| Label | Description | Required |
|-------|-------------|----------|
| `device_id` | Unique device identifier | Yes |
| `session_id` | Current session ID | No |
| `firmware_version` | Firmware version | No |
| `location` | Location/zone | No |

### 4.3 Write Format (Prometheus)

```
# Single metric
device_temperature{device_id="SENSOR_001"} 25.5 1704067200000

# Multiple metrics
device_temperature{device_id="SENSOR_001"} 25.5 1704067200000
device_humidity{device_id="SENSOR_001"} 65.0 1704067200000
device_battery{device_id="SENSOR_001"} 4.15 1704067200000
```

### 4.4 Common Queries (PromQL)

```promql
# Current value
device_temperature{device_id="SENSOR_001"}

# Last 1 hour
device_temperature{device_id="SENSOR_001"}[1h]

# Average over 24 hours
avg_over_time(device_temperature{device_id="SENSOR_001"}[24h])

# Max value
max_over_time(device_temperature[24h])

# Active devices (data in last 5 minutes)
count(device_temperature offset 0s)

# Threshold alerts
device_temperature > 30
```

---

## 5. Data Retention

### PostgreSQL

| Table | Retention | Strategy |
|-------|-----------|----------|
| users | Forever | - |
| devices | Forever | - |
| device_sessions | 1 year | Archive old |
| alerts | 90 days | Delete old |
| notifications | 30 days | Delete old |
| activity_logs | 90 days | Delete old |

### VictoriaMetrics

```bash
# Raw data retention
-retentionPeriod=30d

# Downsampled data (optional)
# 1h aggregates: 90d
# 1d aggregates: 1y
```

---

## 6. Migrations

### Migration File Naming

```
migrations/
├── 001_create_users.sql
├── 002_create_devices.sql
├── 003_create_sessions.sql
├── 004_create_alerts.sql
├── 005_create_firmware.sql
├── 006_create_error_codes.sql
└── 007_create_activity_logs.sql
```

### Migration Template

```sql
-- migrations/001_create_users.sql

-- Up
CREATE TABLE users (
    -- ... columns
);

CREATE INDEX idx_users_username ON users(username);

-- Down
DROP TABLE IF EXISTS users;
```

---

## 7. Backup Strategy

### PostgreSQL

```bash
# Daily backup
pg_dump -U postgres iot_database > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres iot_database < backup_20240101.sql
```

### VictoriaMetrics

```bash
# Backup
vmbackup -dst=s3://bucket/path -storageDataPath=/victoria-data

# Restore
vmrestore -src=s3://bucket/path -storageDataPath=/victoria-data
```
