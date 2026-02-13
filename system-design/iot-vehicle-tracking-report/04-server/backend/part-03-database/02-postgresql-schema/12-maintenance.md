## IX.3.12 Maintenance

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

