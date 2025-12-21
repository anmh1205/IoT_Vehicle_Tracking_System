## PHẦN: THIẾT KẾ FRONTEND (GIAO DIỆN NGƯỜI DÙNG)

### Tổng quan

Frontend là giao diện web/mobile để người dùng tương tác với hệ thống tracking, xem vị trí xe, nhận cảnh báo, và quản lý phương tiện.

### Các chức năng chính

1. **Dashboard**: Hiển thị tổng quan về tất cả phương tiện
2. **Theo dõi real-time**: Xem vị trí xe trên bản đồ
3. **Quản lý phương tiện**: Thêm, sửa, xóa thông tin xe
4. **Cảnh báo**: Xem và xử lý các cảnh báo (chuyển động bất thường, pin yếu, v.v.)
5. **Báo cáo**: Xem lịch sử di chuyển, thống kê

### Công nghệ đề xuất

- **Framework**: React, Vue.js, hoặc Angular
- **Bản đồ**: Google Maps API, Mapbox, hoặc Leaflet
- **Real-time**: WebSocket hoặc MQTT over WebSocket
- **UI/UX**: Material-UI, Ant Design, hoặc Tailwind CSS

### Kiến trúc

```
Frontend (Web/Mobile)
    ↓ HTTP/REST API
Backend API Server
    ↓
PostgreSQL + InfluxDB
    ↓
EMQX MQTT Broker
    ↓
IoT Trackers
```

---

*File này đang được phát triển. Bạn có thể bổ sung thêm nội dung thiết kế frontend tại đây.*

