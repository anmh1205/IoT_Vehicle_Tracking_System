## PHẦN XI.23: NOTIFICATIONS APIs

### XI.23 Notifications APIs

#### GET /api/notifications/preferences

**Mô tả:** Lấy notification preferences của user hiện tại

**Headers:** `Authorization: Bearer {access_token}`

**Response (200 OK):**

```json
{
  "user_id": 1,
  "telegram": {
    "enabled": true,
    "chat_id": "123456789",
    "verified": true
  },
  "email": {
    "enabled": true,
    "email_address": "user@example.com"
  },
  "alert_types": [
    "motion_detected",
    "speeding",
    "low_battery",
    "geofence_exit"
  ],
  "min_severity": "medium",
  "vehicle_ids": null
}
```

---

#### PUT /api/notifications/preferences

**Mô tả:** Cập nhật notification preferences

**Request:**

```json
{
  "telegram_enabled": true,
  "email_enabled": true,
  "alert_types": ["motion_detected", "speeding", "low_battery"],
  "min_severity": "high",
  "vehicle_ids": [1, 2, 3]
}
```

---

#### POST /api/telegram/connect

**Mô tả:** Lấy link để kết nối Telegram bot

**Response (200 OK):**

```json
{
  "bot_username": "@your_vehicle_tracking_bot",
  "connect_url": "https://t.me/your_vehicle_tracking_bot?start=USER_TOKEN_123"
}
```

---

#### POST /api/telegram/verify

**Mô tả:** Xác minh Telegram chat ID

**Request:**

```json
{
  "token": "USER_TOKEN_123",
  "chat_id": "123456789"
}
```

---

#### POST /api/telegram/disconnect

**Mô tả:** Ngắt kết nối Telegram

**Response (200 OK):**

```json
{
  "message": "Đã ngắt kết nối Telegram"
}
```

---

#### POST /api/notifications/test

**Mô tả:** Test gửi notification

**Request:**

```json
{
  "channels": ["telegram", "email"],
  "message": "Test notification"
}
```

**Chi tiết thiết kế:** Xem [`../part-06-notifications-integrations/README.md`](../part-06-notifications-integrations/README.md)

---

