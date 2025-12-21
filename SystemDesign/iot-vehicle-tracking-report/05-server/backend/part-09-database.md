## PHẦN IX: KIẾN TRÚC CƠ SỞ DỮ LIỆU

### IX.1 Lựa Chọn Database

Hệ thống tracker cần lưu **hai loại dữ liệu**:

1. **Raw Data**: Location GPS, battery level
   - Tần suất: Cao (mỗi phút)
   - Thời gian lưu: Ngắn (7–30 ngày)
   - Dung lượng: Lớn

2. **Dữ Liệu Quan Trọng**: Vehicle info, alert history
   - Tần suất: Thấp (hiếm)
   - Thời gian lưu: Lâu (6–12 tháng+)
   - Dung lượng: Nhỏ

### IX.2 PostgreSQL + InfluxDB (RECOMMENDED)

```
┌──────────────────────────────────────┐
│       Tracker (Xe)                   │
│   ESP32 + 4G Modem                   │
└──────────────┬───────────────────────┘
               │ MQTT
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌──────────────┐    ┌─────────────────────┐
│ PostgreSQL   │    │   InfluxDB          │
│ (Quan Trọng) │    │   (Raw Data)        │
├──────────────┤    ├─────────────────────┤
│ Vehicles     │    │ Locations (30 days) │
│ Drivers      │    │ Battery metrics     │
│ Alerts       │    │ Speed analytics     │
│ Commands     │    │                     │
│ History      │    │ Auto-delete after   │
│ (aggregated) │    │ retention period    │
└──────────────┘    └─────────────────────┘
```

### IX.3 PostgreSQL Schema

**Table: vehicles**
```sql
CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  vehicle_id VARCHAR(20) UNIQUE,
  plate VARCHAR(20),
  owner_id INT,
  device_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Table: alerts**
```sql
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  vehicle_id INT REFERENCES vehicles(id),
  alert_type VARCHAR(50),
  message TEXT,
  severity VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE,
  INDEX(vehicle_id, created_at DESC)
);
```


