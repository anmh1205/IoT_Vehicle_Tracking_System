# Backend (Hệ thống Backend)

Folder này chứa thiết kế hệ thống backend (MQTT broker, rules engine, database, API server).

## Nội dung

- **part-01-mqtt-broker.md**: Lựa chọn và cấu hình MQTT broker (EMQX được khuyến nghị)
- **part-02-emqx-rules-engine.md**: Sử dụng EMQX Rules Engine để xử lý dữ liệu
- **part-03-database/**: Kiến trúc database (PostgreSQL + InfluxDB)
  - Xem [`part-03-database/README.md`](./part-03-database/README.md) để biết danh sách đầy đủ
- **part-04-api-server.md**: API Server backend (Node.js + NestJS được khuyến nghị)
- **part-05-api-endpoints/**: Chi tiết thiết kế API endpoints (REST + WebSocket)
  - Xem [`part-05-api-endpoints/README.md`](./part-05-api-endpoints/README.md) để biết danh sách đầy đủ
- **part-06-notifications-integrations/**: Tích hợp Telegram Bot và Email notifications
  - Xem [`part-06-notifications-integrations/README.md`](./part-06-notifications-integrations/README.md) để biết danh sách đầy đủ
- **part-07-agent-coding-plan.md**: ⭐ **Kế hoạch chi tiết cho agent code backend & frontend**
  - Clean code principles, SOLID, design patterns
  - Templates và patterns cho NestJS và Next.js
  - Implementation order và best practices
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

