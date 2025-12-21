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

### VIII.4 Ví Dụ Rule 3: Webhook Alert

**SQL Rule:**
```sql
SELECT
  clientid as vehicle_id,
  payload.battery as battery,
  now() as timestamp
FROM "vehicle/+/location"
WHERE payload.battery < 10
```


