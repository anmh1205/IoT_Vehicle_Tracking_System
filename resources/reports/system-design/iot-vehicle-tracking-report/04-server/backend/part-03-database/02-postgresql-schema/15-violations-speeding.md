## IX.3.15 Violations & Speeding Events

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

