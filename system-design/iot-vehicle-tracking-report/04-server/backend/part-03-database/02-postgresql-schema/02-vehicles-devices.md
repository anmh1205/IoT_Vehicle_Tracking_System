## IX.3.2 Vehicles & Devices

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

