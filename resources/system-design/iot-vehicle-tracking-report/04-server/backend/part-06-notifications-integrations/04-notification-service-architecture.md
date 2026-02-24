## PHẦN XII.4: NOTIFICATION SERVICE ARCHITECTURE

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

