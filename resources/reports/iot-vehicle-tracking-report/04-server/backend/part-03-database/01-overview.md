## PHẦN IX.1-2: TỔNG QUAN VÀ LỰA CHỌN DATABASE

### IX.1 Lựa Chọn Database

**Ngữ Cảnh:** Hệ thống cho thuê xe tự lái - Chủ dịch vụ quản lý xe và theo dõi khách hàng đang thuê xe.

**Phạm Vi Đồ Án (Phase 1):**

- ✅ Quản lý xe và thiết bị tracker
- ✅ Quản lý khách hàng (thông tin cơ bản)
- ✅ Theo dõi chuyến đi (trips) và vị trí xe
- ✅ Cảnh báo và vi phạm
- ⏸️ **Phase 2**: Bookings, Contracts, Payments, Damage Reports, Reviews

Hệ thống tracker cần lưu **hai loại dữ liệu**:

1. **Raw Data**: Location GPS, battery level, OBD2 data

   - Tần suất: Cao (mỗi phút khi đang lái)
   - Thời gian lưu: Ngắn (7–30 ngày)
   - Dung lượng: Lớn
   - **Mục đích**: Theo dõi vị trí xe, phát hiện vi phạm

2. **Dữ Liệu Quan Trọng**: Vehicle info, customers, trips, alerts, violations, bookings (phase 2), rental contracts (phase 2), payments (phase 2)
   - Tần suất: Thấp (hiếm)
   - Thời gian lưu: Lâu (6–12 tháng+)
   - Dung lượng: Nhỏ
   - **Mục đích**: Quản lý xe, khách hàng, theo dõi chuyến đi

### IX.2 PostgreSQL + VictoriaMetrics + VictoriaLogs (RECOMMENDED)

> **📌 Cập nhật**: Đã chuyển từ InfluxDB sang VictoriaMetrics + VictoriaLogs theo kiến trúc IVM26.

```
┌──────────────────────────────────────┐
│       Tracker (Xe)                   │
│   ESP32 + 4G Modem                   │
└──────────────┬───────────────────────┘
               │ MQTT
               ▼
         ┌───────────┐
         │   EMQX    │
         │  Broker   │
         └─────┬─────┘
               │
               ▼
         ┌───────────┐
         │MQTT Bridge│
         └─────┬─────┘
               │
    ┌──────────┼──────────┬──────────────┐
    │          │          │              │
    ▼          ▼          ▼              ▼
┌──────────┐ ┌────────────────┐ ┌──────────────┐
│PostgreSQL│ │VictoriaMetrics │ │VictoriaLogs  │
│(Relational)│ │ (Time-Series) │ │ (Logging)    │
├──────────┤ ├────────────────┤ ├──────────────┤
│ Vehicles │ │ GPS Locations  │ │ Device Events│
│ Customers│ │ Speed data     │ │ Error Logs   │
│ Trips    │ │ Battery levels │ │ Session Logs │
│ Alerts   │ │ OBD2 metrics   │ │ MQTT Messages│
│ Violations│ │ IMU data      │ │ Audit Trail  │
│ Commands │ │                │ │              │
│ History  │ │ Retention: 30d │ │ Retention: 7d│
│          │ │                │ │              │
│ [Phase 2]│ │                │ │              │
│ Bookings │ │                │ │              │
│ Contracts│ │                │ │              │
│ Payments │ │                │ │              │
└──────────┘ └────────────────┘ └──────────────┘
```

### IX.2.1 Lý Do Chọn VictoriaMetrics + VictoriaLogs

| Database | Mục Đích | Ưu Điểm |
|----------|----------|---------|
| **PostgreSQL** | Dữ liệu quan hệ | ACID, relationships, complex queries |
| **VictoriaMetrics** | Time-series metrics | 10x faster than InfluxDB, PromQL, low RAM |
| **VictoriaLogs** | Centralized logging | Fast search, low storage, LogsQL |

**So sánh với InfluxDB:**
- VictoriaMetrics: 10x nhanh hơn, compression tốt hơn
- VictoriaLogs: Thay thế ELK stack, nhẹ hơn nhiều
- Cả hai đều từ cùng vendor, tích hợp tốt với Grafana

