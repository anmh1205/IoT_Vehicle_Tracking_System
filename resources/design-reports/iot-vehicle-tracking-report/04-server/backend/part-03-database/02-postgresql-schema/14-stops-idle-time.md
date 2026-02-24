## IX.3.14 Stops & Idle Time

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

