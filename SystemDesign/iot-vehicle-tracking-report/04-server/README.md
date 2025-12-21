# 04. Server (Hệ thống Server)

Folder này chứa thiết kế toàn bộ hệ thống server, bao gồm cả **backend** và **frontend**.

## Cấu trúc

```
04-server/
├── backend/          # Backend (MQTT, Database, API)
│   ├── part-01-mqtt-broker.md
│   ├── part-02-emqx-rules-engine.md
│   ├── part-03-database.md
│   └── README.md
└── frontend/         # Frontend (Web/Mobile UI)
    ├── part-01-frontend.md
    └── README.md
```

## Nội dung

### Backend
- **MQTT Broker**: Nhận dữ liệu từ IoT trackers
- **Rules Engine**: Xử lý và route dữ liệu
- **Database**: Lưu trữ dữ liệu (PostgreSQL + InfluxDB)
- **API Server**: Cung cấp REST/GraphQL API cho frontend

### Frontend
- **Web Dashboard**: Giao diện quản lý và theo dõi
- **Mobile App**: Ứng dụng di động (tùy chọn)
- **Real-time Updates**: Hiển thị vị trí và cảnh báo real-time

## Workflow

1. Thiết kế backend trước (MQTT → Rules → Database → API)
2. Sau đó thiết kế frontend để kết nối với backend API
3. Đảm bảo frontend và backend tích hợp tốt với nhau

## Lưu ý

Backend và frontend cần được thiết kế đồng bộ:
- API endpoints phải phù hợp với nhu cầu frontend
- Real-time updates cần được đồng bộ giữa backend và frontend
- Authentication/Authorization cần được xử lý ở cả hai phía

