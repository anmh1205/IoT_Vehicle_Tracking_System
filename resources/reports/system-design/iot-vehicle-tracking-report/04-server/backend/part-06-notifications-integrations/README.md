# PHẦN XII: NOTIFICATIONS & INTEGRATIONS (Telegram Bot + Email)

Tài liệu này đã được tách thành các file chi tiết:

- [`01-overview.md`](./01-overview.md) - Tổng quan
- [`02-telegram-bot-integration.md`](./02-telegram-bot-integration.md) - Telegram Bot Integration
- [`03-email-integration.md`](./03-email-integration.md) - Email Integration
- [`04-notification-service-architecture.md`](./04-notification-service-architecture.md) - Notification Service Architecture
- [`05-api-endpoints.md`](./05-api-endpoints.md) - API Endpoints cho Notifications
- [`06-emqx-rules-engine-integration.md`](./06-emqx-rules-engine-integration.md) - Integration với EMQX Rules Engine
- [`07-notification-types.md`](./07-notification-types.md) - Notification Types
- [`08-configuration.md`](./08-configuration.md) - Configuration
- [`09-queue-system.md`](./09-queue-system.md) - Queue System (Optional)
- [`10-summary.md`](./10-summary.md) - Summary

---

## Tổng Quan

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

