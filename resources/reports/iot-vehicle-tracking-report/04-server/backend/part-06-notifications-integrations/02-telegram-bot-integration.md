## PHẦN XII.2: TELEGRAM BOT INTEGRATION

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

