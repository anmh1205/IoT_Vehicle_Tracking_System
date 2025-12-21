# Backend (Hệ thống Backend)

Folder này chứa thiết kế hệ thống backend (MQTT broker, rules engine, database, API server).

## Nội dung

- **part-07-mqtt-broker.md**: Lựa chọn và cấu hình MQTT broker (EMQX được khuyến nghị)
- **part-08-emqx-rules-engine.md**: Sử dụng EMQX Rules Engine để xử lý dữ liệu
- **part-09-database.md**: Kiến trúc database (PostgreSQL + InfluxDB)

## Workflow

1. Chọn MQTT broker trong `part-07-...`
2. Thiết kế rules để xử lý dữ liệu trong `part-08-...`
3. Thiết kế schema database trong `part-09-...`

## Lưu ý

Các phần này liên quan chặt chẽ với nhau:
- MQTT broker nhận dữ liệu từ tracker
- Rules Engine xử lý và route dữ liệu
- Database lưu trữ dữ liệu đã xử lý

