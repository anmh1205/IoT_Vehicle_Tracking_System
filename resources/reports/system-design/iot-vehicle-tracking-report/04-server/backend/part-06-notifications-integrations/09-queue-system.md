## PHẦN XII.9: QUEUE SYSTEM (OPTIONAL)

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

**Lợi ích:**

- ✅ Async processing - không block API response
- ✅ Retry failed notifications
- ✅ Rate limiting
- ✅ Monitoring và logging

---

