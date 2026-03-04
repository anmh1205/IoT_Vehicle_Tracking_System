## PHẦN XII.3: EMAIL INTEGRATION

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

