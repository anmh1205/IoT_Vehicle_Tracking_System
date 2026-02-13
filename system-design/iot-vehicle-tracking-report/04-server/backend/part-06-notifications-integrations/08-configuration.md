## PHẦN XII.8: CONFIGURATION

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

