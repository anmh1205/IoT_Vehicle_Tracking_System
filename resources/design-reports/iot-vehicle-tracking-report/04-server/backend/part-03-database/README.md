# PHẦN IX: KIẾN TRÚC CƠ SỞ DỮ LIỆU

Tài liệu này đã được tách thành các file chi tiết:

- [`01-overview.md`](./01-overview.md) - Tổng quan và lựa chọn database
- [`02-postgresql-schema/README.md`](./02-postgresql-schema/README.md) - PostgreSQL Schema chi tiết (tất cả tables)
- [`03-influxdb-schema.md`](./03-influxdb-schema.md) - InfluxDB Schema (time-series data)
- [`04-relationships.md`](./04-relationships.md) - Database Relationships và ER Diagram
- [`05-indexes-performance.md`](./05-indexes-performance.md) - Indexes và Performance Optimization
- [`06-backup-recovery.md`](./06-backup-recovery.md) - Backup & Recovery Strategy
- [`07-evaluation.md`](./07-evaluation.md) - Đánh giá cấu trúc database

---

## Tổng Quan

**Ngữ Cảnh:** Hệ thống cho thuê xe tự lái - Chủ dịch vụ quản lý xe và theo dõi khách hàng đang thuê xe.

**Phạm Vi Đồ Án (Phase 1):**

- ✅ Quản lý xe và thiết bị tracker
- ✅ Quản lý khách hàng (thông tin cơ bản)
- ✅ Theo dõi chuyến đi (trips) và vị trí xe
- ✅ Cảnh báo và vi phạm
- ⏸️ **Phase 2**: Bookings, Contracts, Payments, Damage Reports, Reviews

**Kiến Trúc Database:**

- **PostgreSQL**: Dữ liệu quan trọng (vehicles, customers, trips, alerts, violations)
- **InfluxDB**: Raw time-series data (locations, OBD2 data, GPS locations)

