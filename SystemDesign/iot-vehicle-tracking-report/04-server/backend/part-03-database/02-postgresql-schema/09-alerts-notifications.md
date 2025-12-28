## IX.3.9 Alerts & Notifications

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

