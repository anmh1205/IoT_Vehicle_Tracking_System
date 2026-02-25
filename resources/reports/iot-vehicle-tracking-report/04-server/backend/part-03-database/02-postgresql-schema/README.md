# PostgreSQL Schema - Chi Tiết

File này đã được tách thành các file nhỏ theo nhóm bảng để dễ quản lý.

## Phase 1: Schema Cốt Lõi (Bắt Buộc cho Đồ Án)

- [`01-users-authentication.md`](./01-users-authentication.md) - Users & Authentication
- [`02-vehicles-devices.md`](./02-vehicles-devices.md) - Vehicles & Devices
- [`03-customers.md`](./03-customers.md) - Customers
- [`06-trips-rental-journeys.md`](./06-trips-rental-journeys.md) - Trips & Rental Journeys
- [`09-alerts-notifications.md`](./09-alerts-notifications.md) - Alerts & Notifications
- [`10-geofences.md`](./10-geofences.md) - Geofences
- [`11-commands-device-control.md`](./11-commands-device-control.md) - Commands & Device Control
- [`12-maintenance.md`](./12-maintenance.md) - Maintenance
- [`13-logs-audit.md`](./13-logs-audit.md) - Logs & Audit
- [`14-stops-idle-time.md`](./14-stops-idle-time.md) - Stops & Idle Time
- [`15-violations-speeding.md`](./15-violations-speeding.md) - Violations & Speeding Events
- [`16-fuel-management.md`](./16-fuel-management.md) - Fuel Management
- [`17-notifications-system.md`](./17-notifications-system.md) - System Notifications
- [`18-routes-planned-routes.md`](./18-routes-planned-routes.md) - Routes & Planned Routes
- [`19-device-status-history.md`](./19-device-status-history.md) - Device Status History
- [`20-soft-delete-support.md`](./20-soft-delete-support.md) - Soft Delete Support

## Phase 2: Schema Mở Rộng (Tùy Chọn)

- [`04-bookings-reservations-phase2.md`](./04-bookings-reservations-phase2.md) - Bookings & Reservations [Phase 2]
- [`05-payments-phase2.md`](./05-payments-phase2.md) - Payments [Phase 2]
- [`07-damage-reports-phase2.md`](./07-damage-reports-phase2.md) - Damage Reports [Phase 2]
- [`08-reviews-ratings-phase2.md`](./08-reviews-ratings-phase2.md) - Reviews & Ratings [Phase 2]

---

**Lưu Ý:**

- **Phase 1**: Schema cơ bản cho đồ án - quản lý xe, khách hàng, trips, alerts
- **Phase 2**: Các bảng được đánh dấu `[Phase 2]` sẽ được tích hợp sau khi hoàn thành tính năng cơ bản
- Schema được thiết kế để dễ mở rộng - các foreign keys và indexes đã được chuẩn bị sẵn

