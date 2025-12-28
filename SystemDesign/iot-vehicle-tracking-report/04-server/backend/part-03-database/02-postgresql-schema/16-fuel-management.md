## IX.3.16 Fuel Management

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

