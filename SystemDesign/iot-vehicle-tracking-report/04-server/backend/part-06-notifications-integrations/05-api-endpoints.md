## PHẦN XII.5: API ENDPOINTS CHO NOTIFICATIONS

### XII.5 API Endpoints cho Notifications

#### XII.5.1 Telegram Bot APIs

#### POST /api/telegram/webhook

**Mô tả:** Webhook endpoint để nhận messages từ Telegram

**Request (từ Telegram):**

```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 1,
    "from": {
      "id": 123456789,
      "is_bot": false,
      "first_name": "John",
      "username": "john_doe"
    },
    "chat": {
      "id": 123456789,
      "type": "private"
    },
    "date": 1705315200,
    "text": "/start"
  }
}
```

**Response:**

```json
{
  "ok": true
}
```

---

#### GET /api/telegram/connect

**Mô tả:** Lấy link để kết nối Telegram bot với user

**Response (200 OK):**

```json
{
  "bot_username": "@your_vehicle_tracking_bot",
  "connect_url": "https://t.me/your_vehicle_tracking_bot?start=USER_TOKEN_123",
  "instructions": "Click vào link và gửi /start để kết nối"
}
```

---

#### POST /api/telegram/verify

**Mô tả:** Xác minh Telegram chat ID sau khi user gửi /start

**Request:**

```json
{
  "token": "USER_TOKEN_123",
  "chat_id": "123456789"
}
```

**Response (200 OK):**

```json
{
  "verified": true,
  "telegram_chat_id": "123456789",
  "message": "Đã kết nối Telegram thành công!"
}
```

---

#### POST /api/telegram/disconnect

**Mô tả:** Ngắt kết nối Telegram

**Headers:** `Authorization: Bearer {access_token}`

**Response (200 OK):**

```json
{
  "message": "Đã ngắt kết nối Telegram"
}
```

---

#### POST /api/telegram/test

**Mô tả:** Test gửi message Telegram

**Headers:** `Authorization: Bearer {access_token}`

**Request:**

```json
{
  "message": "Test message từ hệ thống"
}
```

**Response (200 OK):**

```json
{
  "sent": true,
  "message": "Đã gửi test message thành công"
}
```

---

#### XII.5.2 Notification Preferences APIs

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
  "vehicle_ids": null,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

---

#### PUT /api/notifications/preferences

**Mô tả:** Cập nhật notification preferences

**Headers:** `Authorization: Bearer {access_token}`

**Request:**

```json
{
  "telegram_enabled": true,
  "email_enabled": true,
  "alert_types": [
    "motion_detected",
    "speeding",
    "low_battery"
  ],
  "min_severity": "high",
  "vehicle_ids": [1, 2, 3]
}
```

**Response (200 OK):**

```json
{
  "user_id": 1,
  "telegram_enabled": true,
  "email_enabled": true,
  "alert_types": ["motion_detected", "speeding", "low_battery"],
  "min_severity": "high",
  "vehicle_ids": [1, 2, 3],
  "updated_at": "2024-01-15T11:00:00Z"
}
```

---

#### POST /api/notifications/test

**Mô tả:** Test gửi notification qua các kênh đã bật

**Headers:** `Authorization: Bearer {access_token}`

**Request:**

```json
{
  "channels": ["telegram", "email"],
  "message": "Test notification"
}
```

**Response (200 OK):**

```json
{
  "telegram": {
    "sent": true,
    "message": "Đã gửi qua Telegram"
  },
  "email": {
    "sent": true,
    "message": "Đã gửi qua Email"
  }
}
```

---

