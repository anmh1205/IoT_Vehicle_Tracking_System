## PHẦN XII.6: INTEGRATION VỚI EMQX RULES ENGINE

### XII.6 Integration với EMQX Rules Engine

#### XII.6.1 Webhook Action cho Telegram

**EMQX Rule:**

```sql
SELECT
  clientid as device_id,
  payload.vehicle_id as vehicle_id,
  payload.alert_type as alert_type,
  payload.severity as severity,
  payload.location.lat as latitude,
  payload.location.lon as longitude,
  now() as timestamp
FROM "vehicle/+/alerts"
WHERE payload.severity IN ('high', 'critical')
```

**Action: Webhook → API Server**

```
POST http://api-server:3000/api/notifications/process-alert
Content-Type: application/json

{
  "device_id": "${device_id}",
  "vehicle_id": "${vehicle_id}",
  "alert_type": "${alert_type}",
  "severity": "${severity}",
  "location": {
    "lat": "${latitude}",
    "lon": "${longitude}"
  },
  "timestamp": "${timestamp}"
}
```

**API Server sẽ:**

1. Lấy thông tin alert từ database
2. Check notification preferences
3. Gửi qua Telegram và Email

---

