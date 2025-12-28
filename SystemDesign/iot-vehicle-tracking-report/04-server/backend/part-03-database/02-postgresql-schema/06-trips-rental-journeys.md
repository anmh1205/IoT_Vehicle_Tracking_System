## IX.3.6 Trips & Rental Journeys

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

