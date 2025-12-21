## PHẦN XII: NOTIFICATIONS & INTEGRATIONS (Telegram Bot + Email)

### XII.1 Tổng Quan

Hệ thống hỗ trợ gửi thông báo và cảnh báo qua **2 kênh chính**:

1. **Telegram Bot**: Thông báo real-time, nhanh chóng
2. **Email**: Thông báo chi tiết, có thể lưu trữ

**Use Cases:**

- ✅ Cảnh báo khi xe di chuyển bất thường
- ✅ Cảnh báo vi phạm tốc độ
- ✅ Cảnh báo pin thấp
- ✅ Thông báo device offline
- ✅ Thông báo maintenance sắp đến hạn
- ✅ [Phase 2] Thông báo booking mới, pickup/return
- ✅ [Phase 2] Thông báo thanh toán

---

### XII.2 Telegram Bot Integration

#### XII.2.1 Tạo Telegram Bot

**Bước 1: Tạo Bot với BotFather**

1. Mở Telegram, tìm `@BotFather`
2. Gửi lệnh `/newbot`
3. Đặt tên bot: `Vehicle Tracking Bot`
4. Đặt username: `@your_vehicle_tracking_bot`
5. Nhận **Bot Token**: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

**Bước 2: Lấy Chat ID**

- **Cho user cá nhân**: Tìm `@userinfobot`, gửi `/start` → nhận Chat ID
- **Cho group**: Thêm bot vào group, gửi `/start`, bot sẽ log Chat ID

#### XII.2.2 Tech Stack

**NestJS Integration:**

```typescript
// package.json
{
  "dependencies": {
    "node-telegram-bot-api": "^0.64.0",
    "@nestjs/telegram": "^2.0.0" // Optional: NestJS wrapper
  }
}
```

**Hoặc sử dụng HTTP API trực tiếp:**

```typescript
import axios from 'axios';

const TELEGRAM_API = 'https://api.telegram.org/bot{token}';

async function sendTelegramMessage(chatId: string, message: string) {
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML'
  });
}
```

#### XII.2.3 Database Schema

**Cập nhật bảng `users`:**

```sql
ALTER TABLE users ADD COLUMN telegram_chat_id VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN telegram_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN telegram_verified BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_users_telegram_chat_id ON users(telegram_chat_id);
CREATE INDEX idx_users_telegram_enabled ON users(telegram_enabled) WHERE telegram_enabled = TRUE;
```

**Bảng notification preferences:**

```sql
CREATE TABLE notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  -- Telegram
  telegram_enabled BOOLEAN DEFAULT FALSE,
  telegram_chat_id VARCHAR(50),
  -- Email
  email_enabled BOOLEAN DEFAULT TRUE,
  email_address VARCHAR(100),
  -- Loại cảnh báo muốn nhận
  alert_types JSONB DEFAULT '["motion_detected", "speeding", "low_battery", "geofence_exit"]'::jsonb,
  -- Severity filter
  min_severity VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  -- Vehicle filter (NULL = tất cả xe)
  vehicle_ids INT[], -- Array of vehicle IDs
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_telegram_enabled ON notification_preferences(telegram_enabled) WHERE telegram_enabled = TRUE;
```

#### XII.2.4 Telegram Bot Commands

**Commands hỗ trợ:**

```
/start - Bắt đầu sử dụng bot, đăng ký Chat ID
/help - Hiển thị danh sách commands
/status - Xem trạng thái các xe
/alerts - Xem cảnh báo chưa xử lý
/vehicle <vehicle_id> - Xem thông tin xe cụ thể
/settings - Cấu hình notification preferences
```

**Ví dụ Response:**

```
/status

🚗 Trạng thái xe:
━━━━━━━━━━━━━━━━━━━━
📌 30A-12345 (Toyota Camry)
   🟢 Đang hoạt động
   📍 Vị trí: 21.028511, 105.804817
   ⚡ Pin: 85%
   📶 Tín hiệu: 20 dBm
   🚦 Tốc độ: 60 km/h

📌 30A-12346 (Honda Civic)
   🟡 Bảo trì
   ⚠️ Pin: 15% (Cảnh báo!)
```

#### XII.2.5 Message Templates

**Alert Template:**

```typescript
function formatAlertMessage(alert: Alert): string {
  const severityEmoji = {
    low: 'ℹ️',
    medium: '⚠️',
    high: '🔴',
    critical: '🚨'
  };

  return `
${severityEmoji[alert.severity]} <b>Cảnh báo: ${alert.title}</b>

🚗 Xe: ${alert.vehicle.plate_number}
📍 Vị trí: ${alert.location.lat}, ${alert.location.lon}
⏰ Thời gian: ${formatTime(alert.created_at)}

${alert.message}

<a href="https://app.example.com/alerts/${alert.id}">Xem chi tiết</a>
  `.trim();
}
```

**Violation Template:**

```typescript
function formatViolationMessage(violation: Violation): string {
  return `
🚨 <b>Vi phạm tốc độ</b>

🚗 Xe: ${violation.vehicle.plate_number}
👤 Khách hàng: ${violation.customer.full_name}
📍 Vị trí: ${violation.location.lat}, ${violation.location.lon}
⏰ Thời gian: ${formatTime(violation.violation_time)}

📊 Tốc độ:
   • Giới hạn: ${violation.speed_limit} km/h
   • Thực tế: ${violation.actual_speed} km/h
   • Vượt: ${violation.actual_speed - violation.speed_limit} km/h

<a href="https://app.example.com/violations/${violation.id}">Xem chi tiết</a>
  `.trim();
}
```

---

### XII.3 Email Integration

#### XII.3.1 SMTP Configuration

**Tech Stack:**

```typescript
// package.json
{
  "dependencies": {
    "nodemailer": "^6.9.7",
    "@nestjs-modules/mailer": "^1.9.1",
    "handlebars": "^4.7.8" // For email templates
  }
}
```

**Environment Variables:**

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false # true for 465, false for 587
SMTP_USER=noreply@example.com
SMTP_PASS=your_app_password
SMTP_FROM_NAME=Vehicle Tracking System
SMTP_FROM_EMAIL=noreply@example.com

# Email Templates Path
EMAIL_TEMPLATES_PATH=./templates/emails
```

#### XII.3.2 Email Templates

**Template Structure:**

```
templates/emails/
├── alerts/
│   ├── motion-detected.hbs
│   ├── speeding.hbs
│   ├── low-battery.hbs
│   └── geofence-exit.hbs
├── violations/
│   └── speeding.hbs
├── [Phase 2] bookings/
│   ├── booking-confirmed.hbs
│   ├── pickup-reminder.hbs
│   └── return-reminder.hbs
└── layout.hbs
```

**Ví dụ Template: Alert Motion Detected**

```handlebars
<!-- templates/emails/alerts/motion-detected.hbs -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    .alert-box { background: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 5px; }
    .vehicle-info { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .button { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="alert-box">
    <h2>⚠️ Cảnh báo: Xe di chuyển khi đỗ</h2>
    <p>Hệ thống phát hiện xe của bạn đang di chuyển khi đang ở chế độ đỗ.</p>
  </div>

  <div class="vehicle-info">
    <h3>Thông tin xe</h3>
    <p><strong>Biển số:</strong> {{vehicle.plate_number}}</p>
    <p><strong>Loại xe:</strong> {{vehicle.brand}} {{vehicle.model}}</p>
    <p><strong>Vị trí:</strong> {{location.lat}}, {{location.lon}}</p>
    <p><strong>Thời gian:</strong> {{formatTime created_at}}</p>
  </div>

  <p>
    <a href="{{alertUrl}}" class="button">Xem chi tiết cảnh báo</a>
  </p>

  <hr>
  <p style="color: #6c757d; font-size: 12px;">
    Đây là email tự động từ hệ thống Vehicle Tracking.
    Vui lòng không trả lời email này.
  </p>
</body>
</html>
```

#### XII.3.3 Email Service Implementation

**NestJS Service:**

```typescript
// notifications/email.service.ts
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {}

  async sendAlertEmail(userEmail: string, alert: Alert) {
    await this.mailerService.sendMail({
      to: userEmail,
      subject: `⚠️ Cảnh báo: ${alert.title}`,
      template: `alerts/${alert.alert_type}`,
      context: {
        alert,
        vehicle: alert.vehicle,
        location: alert.location,
        alertUrl: `https://app.example.com/alerts/${alert.id}`,
      },
    });
  }

  async sendViolationEmail(userEmail: string, violation: Violation) {
    await this.mailerService.sendMail({
      to: userEmail,
      subject: `🚨 Vi phạm: ${violation.violation_type}`,
      template: 'violations/speeding',
      context: {
        violation,
        vehicle: violation.vehicle,
        customer: violation.customer,
        violationUrl: `https://app.example.com/violations/${violation.id}`,
      },
    });
  }

  // [Phase 2]
  async sendBookingConfirmationEmail(customerEmail: string, booking: Booking) {
    await this.mailerService.sendMail({
      to: customerEmail,
      subject: `✅ Xác nhận đặt xe: ${booking.booking_number}`,
      template: 'bookings/booking-confirmed',
      context: {
        booking,
        vehicle: booking.vehicle,
        customer: booking.customer,
        bookingUrl: `https://app.example.com/bookings/${booking.id}`,
      },
    });
  }
}
```

---

### XII.4 Notification Service Architecture

#### XII.4.1 Service Structure

```
notifications/
├── notifications.module.ts
├── notifications.service.ts
├── telegram/
│   ├── telegram.service.ts
│   ├── telegram.controller.ts
│   └── telegram.commands.ts
├── email/
│   ├── email.service.ts
│   └── templates/
└── dto/
    ├── send-notification.dto.ts
    └── notification-preference.dto.ts
```

#### XII.4.2 Notification Service Logic

**Flow:**

```
Alert/Violation Created
    ↓
Check Notification Preferences
    ↓
Filter by alert_type, severity, vehicle_ids
    ↓
Send via enabled channels:
    ├─ Telegram (if enabled)
    └─ Email (if enabled)
```

**Implementation:**

```typescript
// notifications/notifications.service.ts
@Injectable()
export class NotificationsService {
  constructor(
    private telegramService: TelegramService,
    private emailService: EmailService,
    private preferencesRepo: Repository<NotificationPreferences>,
  ) {}

  async sendAlert(alert: Alert) {
    // Lấy danh sách users cần nhận thông báo
    const preferences = await this.preferencesRepo.find({
      where: {
        // Filter theo alert_type, severity, vehicle_ids
        alert_types: { contains: [alert.alert_type] },
        min_severity: { lte: alert.severity },
        // vehicle_ids: null hoặc chứa alert.vehicle_id
      },
    });

    for (const pref of preferences) {
      // Gửi Telegram
      if (pref.telegram_enabled && pref.telegram_chat_id) {
        await this.telegramService.sendAlert(
          pref.telegram_chat_id,
          alert
        );
      }

      // Gửi Email
      if (pref.email_enabled && pref.email_address) {
        await this.emailService.sendAlertEmail(
          pref.email_address,
          alert
        );
      }
    }
  }

  async sendViolation(violation: Violation) {
    // Tương tự sendAlert
  }
}
```

---

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
  "vehicle_ids": null, // null = tất cả xe
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
  "vehicle_ids": [1, 2, 3] // null = tất cả xe
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

### XII.7 Notification Types

#### XII.7.1 Alert Notifications

**Các loại alert gửi notification:**

- `motion_detected`: Xe di chuyển khi đỗ
- `low_battery`: Pin backup thấp
- `geofence_exit`: Xe ra khỏi vùng cho phép
- `speeding`: Vượt quá tốc độ
- `device_offline`: Device không gửi dữ liệu quá lâu
- `ignition_on`: Bật máy
- `ignition_off`: Tắt máy
- [Phase 2] `unauthorized_movement`: Xe di chuyển khi không có booking

#### XII.7.2 Violation Notifications

- `speeding`: Vi phạm tốc độ
- `hard_braking`: Phanh gấp
- `hard_acceleration`: Tăng tốc gấp
- `idle_too_long`: Dừng quá lâu
- `geofence_violation`: Vi phạm geofence

#### XII.7.3 System Notifications

- `maintenance_due`: Bảo trì sắp đến hạn
- `device_status_change`: Thay đổi trạng thái device
- [Phase 2] `booking_reminder`: Nhắc nhở booking
- [Phase 2] `payment_due`: Thanh toán đến hạn

---

### XII.8 Configuration

#### XII.8.1 Environment Variables

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_WEBHOOK_URL=https://api.example.com/api/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@example.com
SMTP_PASS=your_app_password
SMTP_FROM_NAME=Vehicle Tracking System
SMTP_FROM_EMAIL=noreply@example.com

# Email Templates
EMAIL_TEMPLATES_PATH=./templates/emails
EMAIL_BASE_URL=https://app.example.com

# Notification Settings
NOTIFICATION_QUEUE_ENABLED=true
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY=5000
```

#### XII.8.2 Rate Limiting

**Telegram:**
- Max 30 messages/second per bot
- Sử dụng queue để tránh rate limit

**Email:**
- Max 100 emails/hour (tùy SMTP provider)
- Sử dụng queue cho bulk emails

---

### XII.9 Queue System (Optional)

**Sử dụng Bull Queue cho async notifications:**

```typescript
// notifications/notifications.processor.ts
import { Processor, Process } from '@nestjs/bull';

@Processor('notifications')
export class NotificationsProcessor {
  @Process('send-alert')
  async handleSendAlert(job: Job<Alert>) {
    const alert = job.data;
    await this.notificationsService.sendAlert(alert);
  }
}
```

---

### XII.10 Summary

**Telegram Bot:**
- ✅ Real-time notifications
- ✅ Bot commands để query thông tin
- ✅ Webhook để nhận messages
- ✅ Chat ID management

**Email:**
- ✅ HTML email templates
- ✅ SMTP integration
- ✅ Rich formatting

**Notification Preferences:**
- ✅ User có thể chọn kênh (Telegram/Email)
- ✅ Filter theo alert types, severity, vehicles
- ✅ API để quản lý preferences

**Integration:**
- ✅ Tích hợp với EMQX Rules Engine
- ✅ Tự động gửi khi có alert/violation
- ✅ Queue system để xử lý async

**Phase 2:**
- ⏸️ Booking notifications
- ⏸️ Payment notifications
- ⏸️ Damage report notifications

