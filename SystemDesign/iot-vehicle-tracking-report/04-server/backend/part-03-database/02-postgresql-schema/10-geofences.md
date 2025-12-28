## IX.3.10 Geofences

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

