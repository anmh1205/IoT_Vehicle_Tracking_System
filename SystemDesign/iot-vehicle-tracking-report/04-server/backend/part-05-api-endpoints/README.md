# PHẦN XI: API ENDPOINTS DESIGN

Tài liệu này đã được tách thành các file chi tiết:

## Phase 1 APIs (Core)

- [`01-overview.md`](./01-overview.md) - Tổng quan API
- [`02-authentication.md`](./02-authentication.md) - Authentication APIs
- [`03-vehicles.md`](./03-vehicles.md) - Vehicles APIs
- [`04-customers.md`](./04-customers.md) - Customers APIs
- [`05-trips.md`](./05-trips.md) - Trips APIs
- [`06-telemetry.md`](./06-telemetry.md) - Telemetry APIs
- [`07-alerts.md`](./07-alerts.md) - Alerts APIs
- [`08-violations.md`](./08-violations.md) - Violations APIs
- [`09-commands.md`](./09-commands.md) - Commands APIs (MQTT)
- [`10-devices.md`](./10-devices.md) - Devices APIs
- [`11-geofences.md`](./11-geofences.md) - Geofences APIs
- [`12-maintenance.md`](./12-maintenance.md) - Maintenance APIs
- [`23-notifications.md`](./23-notifications.md) - Notifications APIs

## [Phase 2] APIs

- [`13-bookings-phase2.md`](./13-bookings-phase2.md) - Bookings APIs [Phase 2]
- [`14-contracts-phase2.md`](./14-contracts-phase2.md) - Contracts APIs [Phase 2]
- [`15-payments-phase2.md`](./15-payments-phase2.md) - Payments APIs [Phase 2]
- [`16-damage-reports-phase2.md`](./16-damage-reports-phase2.md) - Damage Reports APIs [Phase 2]
- [`17-reviews-phase2.md`](./17-reviews-phase2.md) - Reviews APIs [Phase 2]

## Common & Utilities

- [`18-error-handling.md`](./18-error-handling.md) - Error Handling
- [`19-pagination.md`](./19-pagination.md) - Pagination
- [`20-auth-authorization.md`](./20-auth-authorization.md) - Authentication & Authorization
- [`21-rate-limiting.md`](./21-rate-limiting.md) - Rate Limiting
- [`22-api-versioning.md`](./22-api-versioning.md) - API Versioning
- [`24-summary.md`](./24-summary.md) - Summary

---

## Tổng Quan

**Base URL:** `https://api.example.com/api`

**Authentication:** JWT Bearer Token (trừ auth endpoints)

**Response Format:** JSON

