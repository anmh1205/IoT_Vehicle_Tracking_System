## PHẦN XI.23: NOTIFICATIONS APIs

### XI.23 Notifications APIs

#### GET /api/notifications/preferences

**Mô tả:** Lấy notification preferences của user hiện tại

**Headers:** `Authorization: Bearer {access_token}`

**Response (200 OK):**

```json
{
  "userId": 1,
  "telegram": {
    "enabled": true,
    "chatId": "123456789",
    "verified": true
  },
  "email": {
    "enabled": true,
    "emailAddress": "user@example.com"
  },
  "alertTypes": [
    "motion_detected",
    "speeding",
    "low_battery",
    "geofence_exit"
  ],
  "minSeverity": "medium",
  "vehicleIds": null
}
```

---

#### PUT /api/notifications/preferences

**Mô tả:** Cập nhật notification preferences

**Request:**

```json
{
  "telegramEnabled": true,
  "emailEnabled": true,
  "alertTypes": ["motion_detected", "speeding", "low_battery"],
  "minSeverity": "high",
  "vehicleIds": [1, 2, 3]
}
```

---

#### POST /api/telegram/connect

**Mô tả:** Lấy link để kết nối Telegram bot

**Response (200 OK):**

```json
{
  "botUsername": "@your_vehicle_tracking_bot",
  "connectUrl": "https://t.me/your_vehicle_tracking_bot?start=USER_TOKEN_123"
}
```

---

#### POST /api/telegram/verify

**Mô tả:** Xác minh Telegram chat ID

**Request:**

```json
{
  "token": "USER_TOKEN_123",
  "chatId": "123456789"
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

