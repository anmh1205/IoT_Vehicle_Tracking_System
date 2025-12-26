## PHẦN IX.5-6: INDEXES & PERFORMANCE OPTIMIZATION

### IX.5 Indexes & Performance Optimization

**PostgreSQL Indexes:**

- ✅ Tất cả foreign keys đã có indexes
- ✅ Timestamp columns có indexes cho queries theo thời gian
- ✅ Status columns có indexes cho filtering
- ✅ Composite indexes cho queries phức tạp

**Composite Indexes Đề Xuất:**

```sql
-- Cho queries: Lấy alerts chưa acknowledge của một vehicle
CREATE INDEX idx_alerts_vehicle_unacknowledged ON alerts(vehicle_id, acknowledged, created_at DESC)
  WHERE acknowledged = FALSE;

-- Cho queries: Lấy trips đang diễn ra của một vehicle
CREATE INDEX idx_trips_vehicle_active ON trips(vehicle_id, status, start_time DESC)
  WHERE status = 'in_progress';

-- Cho queries: Lấy violations của một vehicle trong khoảng thời gian
CREATE INDEX idx_violations_vehicle_time ON violations(vehicle_id, violation_time DESC);

-- Cho queries: Lấy notifications chưa đọc của user
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read, created_at DESC)
  WHERE read = FALSE;
```

**Triggers cho Auto-Update:**

```sql
-- Function để tự động update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply cho các bảng có updated_at
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### IX.6 InfluxDB Optimization

**InfluxDB Optimization:**

- **Retention Policies**: Tự động xóa dữ liệu cũ

  - Raw data: 30 days
  - Hourly aggregates: 1 year
  - Daily aggregates: 5 years

- **Continuous Queries**: Tự động aggregate data

  ```flux
  CREATE CONTINUOUS QUERY "cq_location_hourly" ON "vehicle_telemetry"
  BEGIN
    SELECT mean("lat") as lat, mean("lon") as lon,
           mean("speed") as speed, max("speed") as max_speed
    INTO "vehicle_telemetry"."autogen"."location_hourly"
    FROM "location"
    GROUP BY time(1h), "device_id", "vehicle_id"
  END
  ```

- **Downsampling**: Giảm độ chi tiết cho historical data
- **Tag Indexing**: Tối ưu queries với tags (device_id, vehicle_id)

### IX.6 Data Retention Strategy

**PostgreSQL:**

- **Alerts**: Giữ 6-12 tháng, sau đó archive
- **Trips**: Giữ vĩnh viễn (aggregated data)
- **Commands**: Giữ 3-6 tháng
- **Logs**: Giữ 30-90 ngày

**InfluxDB:**

- **Raw location data**: 30 ngày
- **Aggregated location (hourly)**: 1 năm
- **Aggregated location (daily)**: 5 năm
- **Power/OBD2 data**: 90 ngày

