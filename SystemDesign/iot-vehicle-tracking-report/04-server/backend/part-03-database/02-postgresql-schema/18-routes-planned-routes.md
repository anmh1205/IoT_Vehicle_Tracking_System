## IX.3.18 Routes & Planned Routes (Optional)

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
  customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
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

**Lưu Ý:** Bảng `route_assignments` đã được cập nhật để tham chiếu `customer_id` thay vì `driver_id` để phù hợp với ngữ cảnh cho thuê xe.

