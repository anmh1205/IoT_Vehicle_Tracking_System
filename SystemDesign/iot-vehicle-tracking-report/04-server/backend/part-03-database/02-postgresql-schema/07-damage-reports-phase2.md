## IX.3.7 Damage Reports [Phase 2]

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

