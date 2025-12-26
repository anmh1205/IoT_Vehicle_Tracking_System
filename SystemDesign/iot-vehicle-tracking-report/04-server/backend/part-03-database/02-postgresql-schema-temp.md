## PHẦN IX: KIẾN TRÚC CƠ SỞ DỮ LIỆU

**File này đã được tách thành các file chi tiết trong folder `part-03-database/`:**

- [`part-03-database/README.md`](./part-03-database/README.md) - Index và tổng quan
- [`part-03-database/01-overview.md`](./part-03-database/01-overview.md) - Tổng quan và lựa chọn database
- [`part-03-database/02-postgresql-schema.md`](./part-03-database/02-postgresql-schema.md) - PostgreSQL Schema chi tiết (tất cả tables)
- [`part-03-database/03-influxdb-schema.md`](./part-03-database/03-influxdb-schema.md) - InfluxDB Schema (time-series data)
- [`part-03-database/04-relationships.md`](./part-03-database/04-relationships.md) - Database Relationships và ER Diagram
- [`part-03-database/05-indexes-performance.md`](./part-03-database/05-indexes-performance.md) - Indexes và Performance Optimization
- [`part-03-database/06-backup-recovery.md`](./part-03-database/06-backup-recovery.md) - Backup & Recovery Strategy
- [`part-03-database/07-evaluation.md`](./part-03-database/07-evaluation.md) - Đánh giá cấu trúc database

---

### IX.1 Lựa Chọn Database

**Ngữ Cảnh:** Hệ thống cho thuê xe tự lái - Chủ dịch vụ quản lý xe và theo dõi khách hàng đang thuê xe.

**Phạm Vi Đồ Án (Phase 1):**

- ✅ Quản lý xe và thiết bị tracker
- ✅ Quản lý khách hàng (thông tin cơ bản)
- ✅ Theo dõi chuyến đi (trips) và vị trí xe
- ✅ Cảnh báo và vi phạm
- ⏸️ **Phase 2**: Bookings, Contracts, Payments, Damage Reports, Reviews

Hệ thống tracker cần lưu **hai loại dữ liệu**:

1. **Raw Data**: Location GPS, battery level, OBD2 data

   - Tần suất: Cao (mỗi phút khi đang lái)
   - Thời gian lưu: Ngắn (7–30 ngày)
   - Dung lượng: Lớn
   - **Mục đích**: Theo dõi vị trí xe, phát hiện vi phạm

2. **Dữ Liệu Quan Trọng**: Vehicle info, customers, trips, alerts, violations, bookings (phase 2), rental contracts (phase 2), payments (phase 2)
   - Tần suất: Thấp (hiếm)
   - Thời gian lưu: Lâu (6–12 tháng+)
   - Dung lượng: Nhỏ
   - **Mục đích**: Quản lý xe, khách hàng, theo dõi chuyến đi

### IX.2 PostgreSQL + InfluxDB (RECOMMENDED)

```
┌──────────────────────────────────────┐
│       Tracker (Xe)                   │
│   ESP32 + 4G Modem                   │
└──────────────┬───────────────────────┘
               │ MQTT
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌──────────────┐    ┌─────────────────────┐
│ PostgreSQL   │    │   InfluxDB          │
│ (Quan Trọng) │    │   (Raw Data)        │
├──────────────┤    ├─────────────────────┤
│ Vehicles     │    │ Locations (30 days) │
│ Customers    │    │ Battery metrics     │
│ Trips        │    │ Speed analytics     │
│ Alerts       │    │ OBD2 data           │
│ Violations   │    │                     │
│ Commands     │    │ Auto-delete after   │
│ History      │    │ retention period    │
│ (aggregated) │    │                     │
│              │    │                     │
│ [Phase 2]    │    │                     │
│ Bookings     │    │                     │
│ Contracts    │    │                     │
│ Payments     │    │                     │
└──────────────┘    └─────────────────────┘
```

### IX.3 PostgreSQL Schema (Chi Tiết)

**Lưu Ý:**

- **Phase 1**: Schema cơ bản cho đồ án - quản lý xe, khách hàng, trips, alerts
- **Phase 2**: Các bảng được đánh dấu `[Phase 2]` sẽ được tích hợp sau khi hoàn thành tính năng cơ bản
- Schema được thiết kế để dễ mở rộng - các foreign keys và indexes đã được chuẩn bị sẵn

#### IX.3.1 Users & Authentication

**Table: users**

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'staff', -- 'admin', 'manager', 'staff' (nhân viên dịch vụ cho thuê)
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**Table: user_sessions**

```sql
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  refresh_token VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token);
```

#### IX.3.2 Vehicles & Devices

**Table: vehicles**

```sql
CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  vehicle_id VARCHAR(50) UNIQUE NOT NULL, -- Biển số hoặc mã xe
  plate_number VARCHAR(20) UNIQUE,
  owner_id INT REFERENCES users(id), -- Chủ dịch vụ cho thuê
  vehicle_type VARCHAR(50), -- 'sedan', 'suv', 'hatchback', 'coupe', etc.
  brand VARCHAR(50),
  model VARCHAR(50),
  year INT,
  color VARCHAR(30),
  vin VARCHAR(50), -- Vehicle Identification Number
  seats INT DEFAULT 5, -- Số chỗ ngồi
  transmission VARCHAR(20), -- 'manual', 'automatic'
  fuel_type VARCHAR(20), -- 'gasoline', 'diesel', 'hybrid', 'electric'
  mileage_km INT DEFAULT 0, -- Số km hiện tại
  -- Giấy tờ
  registration_number VARCHAR(50), -- Số đăng ký
  insurance_expiry DATE, -- Ngày hết hạn bảo hiểm
  -- Trạng thái
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'maintenance', 'retired'
  -- [Phase 2] Thông tin cho thuê
  rental_price_per_day DECIMAL(10, 2), -- [Phase 2] Giá thuê mỗi ngày
  rental_price_per_hour DECIMAL(10, 2), -- [Phase 2] Giá thuê mỗi giờ (nếu có)
  deposit_amount DECIMAL(10, 2), -- [Phase 2] Tiền cọc
  availability_status VARCHAR(20) DEFAULT 'available', -- [Phase 2] 'available', 'rented', 'maintenance', 'reserved', 'inactive'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vehicles_owner_id ON vehicles(owner_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_plate ON vehicles(plate_number);
CREATE INDEX idx_vehicles_availability_status ON vehicles(availability_status); -- [Phase 2]
CREATE INDEX idx_vehicles_vehicle_type ON vehicles(vehicle_type);
```

**Table: devices**

```sql
CREATE TABLE devices (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(50) UNIQUE NOT NULL, -- MAC address hoặc serial number
  vehicle_id INT REFERENCES vehicles(id) ON DELETE SET NULL,
  device_type VARCHAR(50) DEFAULT 'tracker', -- 'tracker', 'dashcam', etc.
  firmware_version VARCHAR(20),
  hardware_version VARCHAR(20),
  imei VARCHAR(20) UNIQUE, -- IMEI của modem 4G
  sim_card_number VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'offline', 'error'
  last_seen TIMESTAMP, -- Thời gian kết nối cuối cùng
  battery_level DECIMAL(5,2), -- Pin backup (%)
  signal_strength INT, -- RSSI
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_devices_vehicle_id ON devices(vehicle_id);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_last_seen ON devices(last_seen);
```

**Table: device_configurations**

```sql
CREATE TABLE device_configurations (
  id SERIAL PRIMARY KEY,
  device_id INT REFERENCES devices(id) ON DELETE CASCADE,
  config_key VARCHAR(100) NOT NULL, -- 'heartbeat_interval', 'tracking_interval', etc.
  config_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by INT REFERENCES users(id),
  UNIQUE(device_id, config_key)
);

CREATE INDEX idx_device_config_device_id ON device_configurations(device_id);
```

#### IX.3.3 Customers (Khách Hàng Thuê Xe)

**Table: customers**

```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL, -- Link với user account nếu có
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20) NOT NULL,
  date_of_birth DATE,
  id_card_number VARCHAR(20) UNIQUE, -- CMND/CCCD
  id_card_issue_date DATE,
  id_card_issue_place VARCHAR(200),
  address TEXT,
  -- Bằng lái xe
  license_number VARCHAR(50),
  license_type VARCHAR(20), -- 'B1', 'B2', 'C', etc.
  license_issue_date DATE,
  license_expiry_date DATE,
  license_issue_place VARCHAR(200),
  -- Trạng thái
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'blacklisted'
  verification_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  verified_by INT REFERENCES users(id), -- Admin xác minh
  verified_at TIMESTAMP,
  -- Đánh giá
  total_rentals INT DEFAULT 0, -- Tổng số lần thuê
  total_spent DECIMAL(12, 2) DEFAULT 0, -- Tổng chi tiêu
  rating_average DECIMAL(3, 2) DEFAULT 0, -- Điểm đánh giá trung bình
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_id_card ON customers(id_card_number);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_verification_status ON customers(verification_status);
```

**Lưu Ý:**

- `customers` khác với `users`: `users` là admin/staff của dịch vụ, `customers` là khách hàng thuê xe
- Một `customer` có thể có `user_id` nếu họ đăng ký tài khoản trên hệ thống

#### IX.3.4 Bookings & Reservations [Phase 2]

**Table: bookings** -- [Phase 2] Quản lý đặt xe và hợp đồng thuê

```sql
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  booking_number VARCHAR(50) UNIQUE NOT NULL, -- Mã đặt xe (VD: BK-20240115-001)
  customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE RESTRICT,
  -- Thời gian
  pickup_time TIMESTAMP NOT NULL, -- Thời gian nhận xe
  return_time TIMESTAMP NOT NULL, -- Thời gian trả xe dự kiến
  actual_pickup_time TIMESTAMP, -- Thời gian nhận xe thực tế
  actual_return_time TIMESTAMP, -- Thời gian trả xe thực tế
  -- Địa điểm
  pickup_location VARCHAR(200), -- Địa điểm nhận xe
  pickup_lat DECIMAL(10, 8),
  pickup_lon DECIMAL(11, 8),
  return_location VARCHAR(200), -- Địa điểm trả xe
  return_lat DECIMAL(10, 8),
  return_lon DECIMAL(11, 8),
  -- Giá cả
  rental_days INT, -- Số ngày thuê
  rental_hours INT, -- Số giờ thuê (nếu < 1 ngày)
  daily_rate DECIMAL(10, 2), -- Giá mỗi ngày tại thời điểm đặt
  hourly_rate DECIMAL(10, 2), -- Giá mỗi giờ (nếu có)
  subtotal DECIMAL(10, 2), -- Tổng tiền thuê
  discount_amount DECIMAL(10, 2) DEFAULT 0, -- Giảm giá
  deposit_amount DECIMAL(10, 2), -- Tiền cọc
  total_amount DECIMAL(10, 2), -- Tổng cộng
  -- Trạng thái
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
  cancellation_reason TEXT, -- Lý do hủy
  cancelled_by INT REFERENCES users(id), -- Ai hủy (customer hoặc admin)
  cancelled_at TIMESTAMP,
  -- Ghi chú
  special_requests TEXT, -- Yêu cầu đặc biệt từ khách hàng
  admin_notes TEXT, -- Ghi chú của admin
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_vehicle_id ON bookings(vehicle_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_pickup_time ON bookings(pickup_time);
CREATE INDEX idx_bookings_booking_number ON bookings(booking_number);
CREATE INDEX idx_bookings_vehicle_pickup ON bookings(vehicle_id, pickup_time, return_time) WHERE status IN ('confirmed', 'in_progress');
```

**Table: rental_contracts** -- [Phase 2] Hợp đồng thuê xe

```sql
CREATE TABLE rental_contracts (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
  contract_number VARCHAR(50) UNIQUE NOT NULL, -- Số hợp đồng
  -- Thông tin hợp đồng
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  terms_and_conditions TEXT, -- Điều khoản và điều kiện
  -- Giấy tờ
  customer_id_card_image_url VARCHAR(500), -- Ảnh CMND/CCCD
  customer_license_image_url VARCHAR(500), -- Ảnh bằng lái
  contract_document_url VARCHAR(500), -- File hợp đồng đã ký
  -- Trạng thái
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'signed', 'active', 'completed', 'terminated'
  signed_at TIMESTAMP, -- Thời gian ký hợp đồng
  signed_by_customer BOOLEAN DEFAULT FALSE,
  signed_by_admin INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rental_contracts_booking_id ON rental_contracts(booking_id);
CREATE INDEX idx_rental_contracts_status ON rental_contracts(status);
CREATE INDEX idx_rental_contracts_contract_number ON rental_contracts(contract_number);
```

#### IX.3.5 Payments [Phase 2]

**Table: payments** -- [Phase 2] Quản lý thanh toán

```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
  payment_number VARCHAR(50) UNIQUE NOT NULL, -- Mã thanh toán
  payment_type VARCHAR(20) NOT NULL, -- 'deposit', 'rental_fee', 'additional_fee', 'refund', 'penalty'
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50), -- 'cash', 'bank_transfer', 'credit_card', 'debit_card', 'e_wallet'
  payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  transaction_id VARCHAR(100), -- Mã giao dịch từ payment gateway
  payment_date TIMESTAMP,
  notes TEXT,
  processed_by INT REFERENCES users(id), -- Nhân viên xử lý
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_payment_number ON payments(payment_number);
CREATE INDEX idx_payments_payment_date ON payments(payment_date DESC);
```

#### IX.3.6 Trips & Rental Journeys

**Table: trips** -- Chuyến đi (Phase 1: không liên kết booking, Phase 2: liên kết booking)

```sql
CREATE TABLE trips (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id) ON DELETE CASCADE, -- [Phase 2] Liên kết với booking
  vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
  customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
  trip_id VARCHAR(50) UNIQUE NOT NULL, -- UUID hoặc mã chuyến đi
  start_time TIMESTAMP NOT NULL, -- Bắt đầu từ khi nhận xe
  end_time TIMESTAMP, -- Kết thúc khi trả xe
  start_location_lat DECIMAL(10, 8),
  start_location_lon DECIMAL(11, 8),
  end_location_lat DECIMAL(10, 8),
  end_location_lon DECIMAL(11, 8),
  distance_km DECIMAL(10, 2), -- Tổng quãng đường (km) trong thời gian thuê
  duration_minutes INT, -- Thời gian di chuyển (phút)
  max_speed DECIMAL(5, 2), -- Tốc độ tối đa (km/h)
  avg_speed DECIMAL(5, 2), -- Tốc độ trung bình (km/h)
  mileage_at_start INT, -- Số km khi nhận xe
  mileage_at_end INT, -- Số km khi trả xe
  status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'cancelled'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trips_booking_id ON trips(booking_id); -- [Phase 2]
CREATE INDEX idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX idx_trips_customer_id ON trips(customer_id);
CREATE INDEX idx_trips_start_time ON trips(start_time DESC);
CREATE INDEX idx_trips_status ON trips(status);
```

**Table: trip_events**

```sql
CREATE TABLE trip_events (
  id SERIAL PRIMARY KEY,
  trip_id INT REFERENCES trips(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'ignition_on', 'ignition_off', 'speeding', 'idle', 'stop'
  event_time TIMESTAMP NOT NULL,
  location_lat DECIMAL(10, 8),
  location_lon DECIMAL(11, 8),
  speed DECIMAL(5, 2),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trip_events_trip_id ON trip_events(trip_id);
CREATE INDEX idx_trip_events_event_time ON trip_events(event_time DESC);
```

#### IX.3.7 Damage Reports [Phase 2]

**Table: damage_reports** -- [Phase 2] Báo cáo hư hỏng khi nhận/trả xe

```sql
CREATE TABLE damage_reports (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL, -- 'pickup', 'return', 'during_rental'
  damage_description TEXT NOT NULL,
  damage_location VARCHAR(200), -- Vị trí hư hỏng trên xe
  damage_images JSONB, -- URLs của ảnh hư hỏng
  estimated_repair_cost DECIMAL(10, 2),
  actual_repair_cost DECIMAL(10, 2),
  reported_by INT REFERENCES users(id), -- Nhân viên hoặc customer
  reported_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'inspected', 'repaired', 'waived'
  inspected_by INT REFERENCES users(id),
  inspected_at TIMESTAMP,
  repair_completed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_damage_reports_booking_id ON damage_reports(booking_id);
CREATE INDEX idx_damage_reports_vehicle_id ON damage_reports(vehicle_id);
CREATE INDEX idx_damage_reports_status ON damage_reports(status);
```

#### IX.3.8 Reviews & Ratings [Phase 2]

**Table: reviews** -- [Phase 2] Đánh giá từ khách hàng

```sql
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
  customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
  -- Đánh giá xe
  vehicle_rating INT CHECK (vehicle_rating >= 1 AND vehicle_rating <= 5),
  vehicle_comment TEXT,
  -- Đánh giá dịch vụ
  service_rating INT CHECK (service_rating >= 1 AND service_rating <= 5),
  service_comment TEXT,
  -- Tổng đánh giá
  overall_rating DECIMAL(3, 2), -- Trung bình của vehicle_rating và service_rating
  is_public BOOLEAN DEFAULT TRUE, -- Có hiển thị công khai không
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  moderated_by INT REFERENCES users(id),
  moderated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_vehicle_id ON reviews(vehicle_id);
CREATE INDEX idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX idx_reviews_overall_rating ON reviews(overall_rating DESC);
CREATE INDEX idx_reviews_is_public ON reviews(is_public) WHERE is_public = TRUE;
```

#### IX.3.9 Alerts & Notifications

**Table: alerts**

```sql
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
  booking_id INT REFERENCES bookings(id) ON DELETE SET NULL, -- [Phase 2] Liên kết với booking nếu đang thuê
  device_id INT REFERENCES devices(id) ON DELETE SET NULL,
  alert_type VARCHAR(50) NOT NULL, -- 'motion_detected', 'low_battery', 'geofence_exit', 'speeding', 'ignition_on', 'unauthorized_movement', etc.
  severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  title VARCHAR(200),
  message TEXT,
  location_lat DECIMAL(10, 8),
  location_lon DECIMAL(11, 8),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP,
  acknowledged_by INT REFERENCES users(id),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alerts_vehicle_id ON alerts(vehicle_id);
CREATE INDEX idx_alerts_booking_id ON alerts(booking_id); -- [Phase 2]
CREATE INDEX idx_alerts_device_id ON alerts(device_id);
CREATE INDEX idx_alerts_type ON alerts(alert_type);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
```

**Table: alert_rules**

```sql
CREATE TABLE alert_rules (
  id SERIAL PRIMARY KEY,
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL, -- 'speed_limit', 'geofence', 'battery_level', etc.
  conditions JSONB NOT NULL, -- Điều kiện kích hoạt alert
  severity VARCHAR(20) DEFAULT 'medium',
  enabled BOOLEAN DEFAULT TRUE,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE, -- NULL = áp dụng cho tất cả
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alert_rules_vehicle_id ON alert_rules(vehicle_id);
CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled);
```

#### IX.3.10 Geofences

**Table: geofences**

```sql
CREATE TABLE geofences (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  geofence_type VARCHAR(20) DEFAULT 'circle', -- 'circle', 'polygon', 'rectangle'
  center_lat DECIMAL(10, 8),
  center_lon DECIMAL(11, 8),
  radius_meters INT, -- Cho circle
  coordinates JSONB, -- Cho polygon: [[lat, lon], [lat, lon], ...]
  alert_on_entry BOOLEAN DEFAULT FALSE,
  alert_on_exit BOOLEAN DEFAULT TRUE,
  enabled BOOLEAN DEFAULT TRUE,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_geofences_enabled ON geofences(enabled);
```

**Table: vehicle_geofences** -- Many-to-many relationship

```sql
CREATE TABLE vehicle_geofences (
  id SERIAL PRIMARY KEY,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
  geofence_id INT REFERENCES geofences(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(vehicle_id, geofence_id, is_active) WHERE is_active = TRUE
);

CREATE INDEX idx_vehicle_geofences_vehicle ON vehicle_geofences(vehicle_id);
CREATE INDEX idx_vehicle_geofences_geofence ON vehicle_geofences(geofence_id);
```

#### IX.3.11 Commands & Device Control

**Table: commands**

```sql
CREATE TABLE commands (
  id SERIAL PRIMARY KEY,
  device_id INT REFERENCES devices(id) ON DELETE CASCADE,
  command_type VARCHAR(50) NOT NULL, -- 'update_config', 'request_location', 'enable_tracking', etc.
  command_data JSONB, -- Parameters của command
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'acknowledged', 'failed'
  sent_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  response_data JSONB, -- Response từ device
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_commands_device_id ON commands(device_id);
CREATE INDEX idx_commands_status ON commands(status);
CREATE INDEX idx_commands_created_at ON commands(created_at DESC);
```

#### IX.3.12 Maintenance

**Table: maintenance_records**

```sql
CREATE TABLE maintenance_records (
  id SERIAL PRIMARY KEY,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(50), -- 'oil_change', 'tire_replacement', 'battery_check', etc.
  description TEXT,
  cost DECIMAL(10, 2),
  mileage_km INT, -- Số km khi bảo trì
  performed_by VARCHAR(100), -- Tên người/kỹ thuật viên
  next_maintenance_date DATE,
  next_maintenance_mileage INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_maintenance_vehicle_id ON maintenance_records(vehicle_id);
CREATE INDEX idx_maintenance_next_date ON maintenance_records(next_maintenance_date);
```

#### IX.3.13 Logs & Audit

**Table: connection_logs**

```sql
CREATE TABLE connection_logs (
  id SERIAL PRIMARY KEY,
  device_id INT REFERENCES devices(id) ON DELETE CASCADE,
  connection_type VARCHAR(20), -- 'mqtt', 'http', 'websocket'
  status VARCHAR(20), -- 'connected', 'disconnected', 'failed'
  ip_address VARCHAR(45),
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_connection_logs_device_id ON connection_logs(device_id);
CREATE INDEX idx_connection_logs_created_at ON connection_logs(created_at DESC);
```

**Table: user_actions** -- Audit log

```sql
CREATE TABLE user_actions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'create_vehicle', 'update_config', etc.
  resource_type VARCHAR(50), -- 'vehicle', 'device', 'alert', etc.
  resource_id INT,
  details JSONB, -- Chi tiết hành động
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_actions_user_id ON user_actions(user_id);
CREATE INDEX idx_user_actions_action_type ON user_actions(action_type);
CREATE INDEX idx_user_actions_created_at ON user_actions(created_at DESC);
```

**Giải Thích Audit Log:**

**Audit Log (Nhật Ký Kiểm Tra)** là bản ghi theo thứ tự thời gian về các hoạt động và sự kiện diễn ra trong hệ thống, đặc biệt là các hành động của người dùng.

**Mục Đích:**

1. **Bảo Mật**: Theo dõi ai đã làm gì, khi nào, từ đâu
2. **Điều Tra**: Khi có sự cố, có thể truy vết lại lịch sử hành động
3. **Tuân Thủ**: Đáp ứng yêu cầu pháp lý về ghi nhận hoạt động
4. **Phân Tích**: Hiểu cách người dùng sử dụng hệ thống
5. **Trách Nhiệm**: Xác định người chịu trách nhiệm cho các thay đổi

**Ví Dụ Hành Động Cần Ghi Log:**

- **Authentication**: `login`, `logout`, `password_change`, `token_refresh`
- **Vehicle Management**: `create_vehicle`, `update_vehicle`, `delete_vehicle`, `assign_driver`
- **Device Management**: `register_device`, `update_config`, `send_command`
- **Alert Management**: `acknowledge_alert`, `resolve_alert`, `create_alert_rule`
- **User Management**: `create_user`, `update_role`, `suspend_user`
- **Geofence**: `create_geofence`, `assign_geofence`, `delete_geofence`

**Ví Dụ Dữ Liệu Trong `user_actions`:**

```json
{
  "id": 1,
  "user_id": 5,
  "action_type": "update_config",
  "resource_type": "device",
  "resource_id": 123,
  "details": {
    "old_value": { "heartbeat_interval": 600 },
    "new_value": { "heartbeat_interval": 900 },
    "reason": "User requested change"
  },
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Lợi Ích Trong Hệ Thống Vehicle Tracking:**

- ✅ **Bảo Mật**: Phát hiện truy cập bất thường hoặc thay đổi cấu hình trái phép
- ✅ **Điều Tra**: Khi có sự cố với xe/device, có thể xem ai đã thay đổi gì
- ✅ **Tuân Thủ**: Đáp ứng yêu cầu pháp lý về quản lý phương tiện
- ✅ **Phân Tích**: Hiểu cách quản trị viên sử dụng hệ thống

### IX.4 InfluxDB Schema (Time-Series Data)

**Measurement: location**

```flux
location
  tags:
    - device_id (string)
    - vehicle_id (string)
  fields:
    - lat (float)
    - lon (float)
    - alt (float) -- altitude
    - speed (float) -- km/h
    - course (float) -- heading degree
    - satellites (int)
  timestamp: auto
```

**Measurement: obd2_data**

```flux
obd2_data
  tags:
    - device_id (string)
    - vehicle_id (string)
  fields:
    - ign (boolean)
    - rpm (int)
    - speed (int) -- km/h
    - fuel (int) -- %
    - temp (int) -- engine temperature
  timestamp: auto
```

**Measurement: power**

```flux
power
  tags:
    - device_id (string)
    - vehicle_id (string)
  fields:
    - battery_voltage (float) -- V
    - backup_battery (float) -- V
    - power_source (string) -- 'battery' or 'backup'
    - charger_enabled (boolean)
  timestamp: auto
```

**Measurement: imu_data**

```flux
imu_data
  tags:
    - device_id (string)
    - vehicle_id (string)
  fields:
    - accel_x (float)
    - accel_y (float)
    - accel_z (float)
    - motion_detected (boolean)
  timestamp: auto
```

**Retention Policies:**

- **Default**: 30 days (raw data)
- **Aggregated**: 1 year (hourly/daily aggregates)

#### IX.3.14 Stops & Idle Time

**Table: stops**

```sql
CREATE TABLE stops (
  id SERIAL PRIMARY KEY,
  trip_id INT REFERENCES trips(id) ON DELETE CASCADE,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
  stop_type VARCHAR(20) DEFAULT 'unknown', -- 'parking', 'fuel', 'rest', 'delivery', 'unknown'
  arrival_time TIMESTAMP NOT NULL,
  departure_time TIMESTAMP,
  location_lat DECIMAL(10, 8),
  location_lon DECIMAL(11, 8),
  address TEXT, -- Địa chỉ từ reverse geocoding
  duration_minutes INT, -- Thời gian dừng (phút)
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stops_trip_id ON stops(trip_id);
CREATE INDEX idx_stops_vehicle_id ON stops(vehicle_id);
CREATE INDEX idx_stops_arrival_time ON stops(arrival_time DESC);
```

#### IX.3.15 Violations & Speeding Events

**Table: violations**

```sql
CREATE TABLE violations (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id) ON DELETE SET NULL, -- [Phase 2] Liên kết với booking
  vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
  trip_id INT REFERENCES trips(id) ON DELETE SET NULL,
  customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
  violation_type VARCHAR(50) NOT NULL, -- 'speeding', 'hard_braking', 'hard_acceleration', 'idle_too_long', 'geofence_violation', 'unauthorized_area'
  severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  speed_limit DECIMAL(5, 2), -- Giới hạn tốc độ (nếu speeding)
  actual_speed DECIMAL(5, 2), -- Tốc độ thực tế
  location_lat DECIMAL(10, 8),
  location_lon DECIMAL(11, 8),
  violation_time TIMESTAMP NOT NULL,
  description TEXT,
  fine_amount DECIMAL(10, 2) DEFAULT 0, -- Tiền phạt (nếu có)
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by INT REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_violations_booking_id ON violations(booking_id); -- [Phase 2]
CREATE INDEX idx_violations_vehicle_id ON violations(vehicle_id);
CREATE INDEX idx_violations_trip_id ON violations(trip_id);
CREATE INDEX idx_violations_customer_id ON violations(customer_id);
CREATE INDEX idx_violations_type ON violations(violation_type);
CREATE INDEX idx_violations_violation_time ON violations(violation_time DESC);
```

#### IX.3.16 Fuel Management

**Table: fuel_records**

```sql
CREATE TABLE fuel_records (
  id SERIAL PRIMARY KEY,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
  fuel_type VARCHAR(20) DEFAULT 'gasoline', -- 'gasoline', 'diesel', 'electric', etc.
  quantity_liters DECIMAL(10, 2), -- Số lít
  cost DECIMAL(10, 2), -- Chi phí
  price_per_liter DECIMAL(8, 2), -- Giá mỗi lít
  odometer_km INT, -- Số km khi đổ nhiên liệu
  location_lat DECIMAL(10, 8),
  location_lon DECIMAL(11, 8),
  station_name VARCHAR(200), -- Tên trạm xăng
  recorded_by INT REFERENCES users(id),
  recorded_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fuel_records_vehicle_id ON fuel_records(vehicle_id);
CREATE INDEX idx_fuel_records_recorded_at ON fuel_records(recorded_at DESC);
```

#### IX.3.17 Notifications (System Notifications)

**Table: notifications**

```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- 'alert', 'system', 'maintenance', 'violation'
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  related_resource_type VARCHAR(50), -- 'vehicle', 'alert', 'trip', etc.
  related_resource_id INT,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;
```

#### IX.3.18 Routes & Planned Routes (Optional)

**Table: routes**

```sql
CREATE TABLE routes (
  id SERIAL PRIMARY KEY,
  route_name VARCHAR(100) NOT NULL,
  description TEXT,
  start_location_lat DECIMAL(10, 8),
  start_location_lon DECIMAL(11, 8),
  end_location_lat DECIMAL(10, 8),
  end_location_lon DECIMAL(11, 8),
  waypoints JSONB, -- [[lat, lon], [lat, lon], ...]
  estimated_distance_km DECIMAL(10, 2),
  estimated_duration_minutes INT,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_routes_created_by ON routes(created_by);
```

**Table: route_assignments**

```sql
CREATE TABLE route_assignments (
  id SERIAL PRIMARY KEY,
  route_id INT REFERENCES routes(id) ON DELETE CASCADE,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id INT REFERENCES drivers(id) ON DELETE SET NULL,
  scheduled_start_time TIMESTAMP,
  scheduled_end_time TIMESTAMP,
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  assigned_by INT REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_route_assignments_route_id ON route_assignments(route_id);
CREATE INDEX idx_route_assignments_vehicle_id ON route_assignments(vehicle_id);
CREATE INDEX idx_route_assignments_status ON route_assignments(status);
```

#### IX.3.19 Device Status History

**Table: device_status_history**

```sql
CREATE TABLE device_status_history (
  id SERIAL PRIMARY KEY,
  device_id INT REFERENCES devices(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  reason TEXT, -- Lý do thay đổi trạng thái
  changed_by INT REFERENCES users(id), -- NULL nếu tự động
  changed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_device_status_history_device_id ON device_status_history(device_id);
CREATE INDEX idx_device_status_history_changed_at ON device_status_history(changed_at DESC);
```

#### IX.3.20 Soft Delete Support

**Các bảng quan trọng nên có soft delete:**

- `vehicles`: Thêm `deleted_at TIMESTAMP NULL`
- `customers`: Thêm `deleted_at TIMESTAMP NULL`
- `bookings`: Thêm `deleted_at TIMESTAMP NULL`
- `devices`: Thêm `deleted_at TIMESTAMP NULL`
- `users`: Thêm `deleted_at TIMESTAMP NULL`

**Ví dụ cho vehicles:**

```sql
ALTER TABLE vehicles ADD COLUMN deleted_at TIMESTAMP NULL;
CREATE INDEX idx_vehicles_deleted_at ON vehicles(deleted_at) WHERE deleted_at IS NULL;
```

### IX.4 Database Relationships

**ER Diagram (Tóm Tắt) - Car Rental System:**

```
users (1) ──< (many) vehicles (owner)
users (1) ──< (many) customers (verified_by)
users (1) ──< (many) notifications
customers (1) ──< (many) trips
customers (1) ──< (many) bookings [Phase 2]
customers (1) ──< (many) reviews [Phase 2]
vehicles (1) ──< (1) devices
vehicles (1) ──< (many) trips
vehicles (1) ──< (many) alerts
vehicles (1) ──< (many) maintenance_records
vehicles (1) ──< (many) bookings [Phase 2]
vehicles (1) ──< (many) damage_reports [Phase 2]
vehicles (1) ──< (many) reviews [Phase 2]
vehicles (many) ──< (many) geofences (via vehicle_geofences)
bookings (1) ──< (1) rental_contracts [Phase 2]
bookings (1) ──< (many) payments [Phase 2]
bookings (1) ──< (1) trips [Phase 2]
bookings (1) ──< (many) alerts [Phase 2]
bookings (1) ──< (many) damage_reports [Phase 2]
bookings (1) ──< (1) reviews [Phase 2]
trips (1) ──< (many) trip_events
trips (1) ──< (many) stops
trips (1) ──< (many) violations
devices (1) ──< (many) commands
devices (1) ──< (many) device_configurations
devices (1) ──< (many) device_status_history
devices (1) ──< (many) connection_logs
```

### IX.5 Indexes & Performance Optimization

**PostgreSQL Indexes:**

- ✅ Tất cả foreign keys đã có indexes
- ✅ Timestamp columns có indexes cho queries theo thời gian
- ✅ Status columns có indexes cho filtering
- ✅ Composite indexes cho queries phức tạp

**Composite Indexes Đề Xuất:**

```sql
-- Cho queries: Lấy alerts chưa acknowledge của một vehicle
CREATE INDEX idx_alerts_vehicle_unacknowledged ON alerts(vehicle_id, acknowledged, created_at DESC)
  WHERE acknowledged = FALSE;

-- Cho queries: Lấy trips đang diễn ra của một vehicle
CREATE INDEX idx_trips_vehicle_active ON trips(vehicle_id, status, start_time DESC)
  WHERE status = 'in_progress';

-- Cho queries: Lấy violations của một vehicle trong khoảng thời gian
CREATE INDEX idx_violations_vehicle_time ON violations(vehicle_id, violation_time DESC);

-- Cho queries: Lấy notifications chưa đọc của user
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read, created_at DESC)
  WHERE read = FALSE;
```

**Triggers cho Auto-Update:**

```sql
-- Function để tự động update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply cho các bảng có updated_at
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### IX.6 Indexes & Performance Optimization

**PostgreSQL Indexes:**

- Tất cả foreign keys đã có indexes
- Timestamp columns có indexes cho queries theo thời gian
- Status columns có indexes cho filtering

**InfluxDB Optimization:**

- **Retention Policies**: Tự động xóa dữ liệu cũ

  - Raw data: 30 days
  - Hourly aggregates: 1 year
  - Daily aggregates: 5 years

- **Continuous Queries**: Tự động aggregate data

  ```flux
  CREATE CONTINUOUS QUERY "cq_location_hourly" ON "vehicle_telemetry"
  BEGIN
    SELECT mean("lat") as lat, mean("lon") as lon,
           mean("speed") as speed, max("speed") as max_speed
    INTO "vehicle_telemetry"."autogen"."location_hourly"
    FROM "location"
    GROUP BY time(1h), "device_id", "vehicle_id"
  END
  ```

- **Downsampling**: Giảm độ chi tiết cho historical data
- **Tag Indexing**: Tối ưu queries với tags (device_id, vehicle_id)

### IX.6 Data Retention Strategy

**PostgreSQL:**

- **Alerts**: Giữ 6-12 tháng, sau đó archive
- **Trips**: Giữ vĩnh viễn (aggregated data)
- **Commands**: Giữ 3-6 tháng
- **Logs**: Giữ 30-90 ngày

**InfluxDB:**

- **Raw location data**: 30 ngày
- **Aggregated location (hourly)**: 1 năm
- **Aggregated location (daily)**: 5 năm
- **Power/OBD2 data**: 90 ngày

### IX.7 Backup & Recovery

**PostgreSQL:**

- Daily full backup
- Continuous WAL archiving
- Point-in-time recovery

**InfluxDB:**

- Daily snapshot backup
- Retention policy backup

### IX.8 Đánh Giá Cấu Trúc Database

#### IX.8.1 Điểm Mạnh

✅ **Đầy Đủ Các Thành Phần Cho Car Rental:**

- **Users & Authentication**: Admin/staff của dịch vụ cho thuê
- **Customers**: Khách hàng thuê xe với đầy đủ thông tin (CMND, bằng lái, verification)
- **Vehicles**: Thông tin xe với mileage (Phase 1), pricing và availability (Phase 2)
- **Trips**: Chuyến đi theo dõi xe (Phase 1: không liên kết booking, Phase 2: liên kết booking)
- **Alerts**: Cảnh báo (motion, speeding, geofence) - Phase 1: không liên kết booking, Phase 2: liên kết booking
- **Violations**: Vi phạm - Phase 1: không liên kết booking, Phase 2: liên kết booking
- **Devices & Tracking**: GPS tracking
- **Maintenance**: Lịch sử bảo trì xe
- **Audit Logs**: Ghi lại hành động của admin/staff
- **[Phase 2] Bookings**: Đặt xe trước với pickup/return locations, pricing
- **[Phase 2] Rental Contracts**: Hợp đồng thuê với giấy tờ, signatures
- **[Phase 2] Payments**: Thanh toán (deposit, rental fee, penalties, refunds)
- **[Phase 2] Damage Reports**: Báo cáo hư hỏng khi nhận/trả xe
- **[Phase 2] Reviews & Ratings**: Đánh giá từ khách hàng

✅ **Tối Ưu Hóa Performance:**

- Indexes đầy đủ cho foreign keys
- Composite indexes cho queries phức tạp
- Partial indexes với WHERE clause
- Triggers cho auto-update timestamps

✅ **Data Retention Strategy:**

- Rõ ràng cho từng loại dữ liệu
- Phân biệt PostgreSQL (structured) và InfluxDB (time-series)

✅ **Backup & Recovery:**

- Strategy cho cả PostgreSQL và InfluxDB

#### IX.8.2 Các Điểm Cần Lưu Ý

⚠️ **Soft Delete:**

- Nên thêm `deleted_at` cho các bảng quan trọng (vehicles, customers, bookings [Phase 2])
- Đã có đề xuất trong phần IX.3.20

⚠️ **Multi-Tenancy (Nếu Cần):**

- Nếu một hệ thống phục vụ nhiều dịch vụ cho thuê:
  - Thêm `rental_companies` hoặc `organizations` table
  - Thêm `company_id` vào các bảng chính (vehicles, customers, bookings [Phase 2])

⚠️ **Vehicle Categories:**

- Có thể thêm `vehicle_categories` table để phân loại xe (economy, luxury, SUV, etc.)
- Giúp quản lý pricing và availability theo category

⚠️ **Promotions & Discounts:**

- Có thể thêm `promotions` table cho các chương trình khuyến mãi
- Liên kết với bookings qua discount_amount

⚠️ **Insurance:**

- Có thể thêm `insurance_policies` table cho bảo hiểm xe
- Liên kết với vehicles và bookings

#### IX.8.3 So Sánh Với Các Hệ Thống Tương Tự

**Tương Đồng Với Car Rental Systems:**

- ✅ Customers management với verification
- ✅ Bookings & Reservations với pickup/return
- ✅ Rental Contracts với giấy tờ
- ✅ Payments với multiple payment types
- ✅ Damage Reports khi nhận/trả xe
- ✅ Reviews & Ratings từ khách hàng

**Tương Đồng Với GPS Tracking:**

- ✅ Real-time location tracking
- ✅ Trips & Events trong thời gian thuê
- ✅ Violations (speeding, geofence)
- ✅ Alerts (motion detected, unauthorized movement)

**Điểm Khác Biệt:**

- ✅ **Car Rental Focus**: Tập trung vào quản lý dịch vụ cho thuê, không phải fleet management
- ✅ **Booking-Centric**: Mọi thứ xoay quanh bookings (trips, alerts, violations đều liên kết với booking)
- ✅ **Customer Verification**: Xác minh khách hàng với CMND và bằng lái
- ✅ **Damage Tracking**: Theo dõi hư hỏng khi nhận/trả xe
- ✅ **Rental-Specific Alerts**: Cảnh báo khi xe di chuyển không đúng thời gian thuê

#### IX.8.4 Kết Luận

**Cấu Trúc Database Hiện Tại:**

✅ **Hợp Lý và Đầy Đủ** cho hệ thống **cho thuê xe tự lái**:

- ✅ Bao phủ đầy đủ các chức năng cần thiết cho car rental business
- ✅ Customers, Bookings, Contracts, Payments - đầy đủ workflow cho thuê
- ✅ GPS Tracking tích hợp để theo dõi xe trong thời gian thuê
- ✅ Damage Reports và Reviews để quản lý chất lượng dịch vụ
- ✅ Tối ưu hóa performance với indexes và composite indexes
- ✅ Có strategy cho data retention và backup
- ✅ Hỗ trợ audit và security

✅ **Sẵn Sàng Triển Khai:**

- Schema đã đầy đủ và chi tiết cho car rental
- Có thể bắt đầu implement ngay
- Có thể mở rộng thêm khi cần (multi-tenancy, promotions, insurance)

**Khuyến Nghị Triển Khai:**

- **Phase 1**: Core car rental (users, customers, vehicles, bookings, contracts, payments)
- **Phase 2**: GPS Tracking (devices, trips, alerts, violations)
- **Phase 3**: Advanced features (damage reports, reviews, geofences)
- **Phase 4**: Analytics & Reporting (stops, fuel, maintenance, reports)
- **Phase 5**: Multi-tenancy (nếu cần phục vụ nhiều dịch vụ)
