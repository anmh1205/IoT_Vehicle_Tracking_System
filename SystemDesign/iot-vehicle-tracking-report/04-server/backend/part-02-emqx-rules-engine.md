## PHẦN VIII: EMQX RULES ENGINE

### VIII.1 Rules Engine là gì?

**EMQX Rules Engine** là SQL-based data processing engine cho phép xử lý, lọc, và chuyển đổi MQTT messages tại broker.

### VIII.2 Ví Dụ Rule 1: Low Battery Alert

**SQL Rule:**
```sql
SELECT
  clientid as vehicle_id,
  payload.battery as battery,
  payload.accu_v as accu_voltage,
  now() as timestamp
FROM "vehicle/+/location"
WHERE payload.battery < 20
```

### VIII.3 Ví Dụ Rule 2: Detect Motion

**SQL Rule:**
```sql
SELECT
  clientid as vehicle_id,
  payload.lat as latitude,
  payload.lng as longitude,
  payload.speed as speed,
  now() as timestamp
FROM "vehicle/+/location"
WHERE payload.speed > 0.5
```

### VIII.4 Ví Dụ Rule 3: Motion Detected Alert

**SQL Rule:**
```sql
SELECT
  clientid as device_id,
  payload.vehicle_id as vehicle_id,
  payload.location.lat as latitude,
  payload.location.lon as longitude,
  now() as timestamp
FROM "vehicle/+/alerts"
WHERE payload.alert_type = 'motion_detected'
```

**Action:** Gửi alert đến PostgreSQL với `alert_type = 'motion_detected'`

**[Phase 2] Ví Dụ Rule 4: Unauthorized Movement Alert**

**SQL Rule:**
```sql
SELECT
  clientid as device_id,
  payload.vehicle_id as vehicle_id,
  payload.location.lat as latitude,
  payload.location.lon as longitude,
  payload.location.speed as speed,
  payload.status.mode as mode,
  now() as timestamp
FROM "vehicle/+/telemetry"
WHERE payload.status.mode = 'driving'
  AND payload.location.speed > 5
```

**Action:** Gửi alert đến PostgreSQL với `alert_type = 'unauthorized_movement'` nếu không có booking active cho vehicle này.

**[Phase 2] Ví Dụ Rule 5: Motion Detected When Not Rented**

**SQL Rule:**
```sql
SELECT
  clientid as device_id,
  payload.vehicle_id as vehicle_id,
  payload.location.lat as latitude,
  payload.location.lon as longitude,
  now() as timestamp
FROM "vehicle/+/alerts"
WHERE payload.alert_type = 'motion_detected'
```

**Action:** Kiểm tra booking status - nếu không có booking active → alert severity = 'critical'

### VIII.5 Ví Dụ Rule 4: Speeding Alert

**SQL Rule:**
```sql
SELECT
  clientid as device_id,
  payload.vehicle_id as vehicle_id,
  payload.location.speed as speed,
  payload.location.lat as latitude,
  payload.location.lon as longitude,
  now() as timestamp
FROM "vehicle/+/telemetry"
WHERE payload.location.speed > 100
```

**Action:** Tạo violation record và alert

**[Phase 2] Action:** Liên kết với booking hiện tại

### VIII.6 Ví Dụ Rule 5: Low Battery Alert

**SQL Rule:**
```sql
SELECT
  clientid as device_id,
  payload.vehicle_id as vehicle_id,
  payload.power.backup_battery as backup_battery,
  now() as timestamp
FROM "vehicle/+/telemetry"
WHERE payload.power.backup_battery < 3.5
```

**Action:** Gửi alert đến admin

**[Phase 2] Action:** Gửi alert đến admin và customer (nếu đang thuê)

### VIII.7 Chiến Lược Rules

**Rules Quan Trọng Phase 1:**

1. **Motion Detected**: Xe di chuyển khi đỗ
2. **Geofence Violation**: Xe ra khỏi vùng cho phép
3. **Speeding**: Vượt quá tốc độ cho phép
4. **Low Battery**: Pin backup thấp (cảnh báo trước khi hết pin)
5. **Device Offline**: Device không gửi dữ liệu quá lâu

**[Phase 2] Rules Bổ Sung:**

6. **Unauthorized Movement**: Xe di chuyển khi không có booking active
7. **Out of Rental Period**: Xe di chuyển ngoài thời gian thuê
8. **Speeding During Rental**: Vi phạm tốc độ trong thời gian thuê (liên kết với booking)

**Workflow:**

```
MQTT Message → Rules Engine → Create Alert/Violation → Save to PostgreSQL
                                    ↓
                            Send Notifications
                                    ├─ Telegram Bot
                                    └─ Email
```

**[Phase 2] Workflow:**

```
MQTT Message → Rules Engine → Check Booking Status → Create Alert/Violation → Save to PostgreSQL
                                    ↓
                            Send Notifications
                                    ├─ Telegram Bot
                                    └─ Email
```

**Integration với Notifications:**

- Rules Engine có thể gọi webhook đến API Server
- API Server sẽ gửi notifications qua Telegram và Email dựa trên user preferences
- Chi tiết: Xem [`part-06-notifications-integrations.md`](./part-06-notifications-integrations.md)


