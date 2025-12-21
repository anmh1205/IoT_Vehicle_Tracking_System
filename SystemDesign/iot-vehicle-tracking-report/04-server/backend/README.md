# Backend (Hệ thống Backend)

Folder này chứa thiết kế hệ thống backend (MQTT broker, rules engine, database, API server).

## Nội dung

- **part-01-mqtt-broker.md**: Lựa chọn và cấu hình MQTT broker (EMQX được khuyến nghị)
- **part-02-emqx-rules-engine.md**: Sử dụng EMQX Rules Engine để xử lý dữ liệu
- **part-03-database.md**: Kiến trúc database (PostgreSQL + InfluxDB)
- **part-04-api-server.md**: API Server backend (Node.js + NestJS được khuyến nghị)
- **part-05-api-endpoints.md**: Chi tiết thiết kế API endpoints (REST + WebSocket)
- **part-06-notifications-integrations.md**: Tích hợp Telegram Bot và Email notifications
- **schema.sql**: Database schema SQL file (đầy đủ Phase 1 + Phase 2)

## Workflow

1. Chọn MQTT broker trong `part-01-...`
2. Thiết kế rules để xử lý dữ liệu trong `part-02-...`
3. Thiết kế schema database trong `part-03-...` và tạo database từ `schema.sql`
4. Chọn công nghệ và thiết kế API Server trong `part-04-...`
5. Thiết kế chi tiết API endpoints trong `part-05-...`

## Lưu ý

Các phần này liên quan chặt chẽ với nhau:
- MQTT broker nhận dữ liệu từ tracker
- Rules Engine xử lý và route dữ liệu
- Database lưu trữ dữ liệu đã xử lý

