# Frontend (Giao diện người dùng)

Folder này chứa thiết kế giao diện frontend (web/mobile) cho hệ thống tracking.

## Nội dung

- **part-01-frontend.md**: Tổng quan frontend, các chức năng chính, công nghệ đề xuất
- **part-02-frontend-design/**: Thiết kế chi tiết (cấu trúc, theme, UI patterns, API, realtime, etc.)
  - Xem [`part-02-frontend-design/README.md`](./part-02-frontend-design/README.md) để biết danh sách đầy đủ
- **part-03-code-review-lessons/**: Code review và bài học từ example
  - Xem [`part-03-code-review-lessons/README.md`](./part-03-code-review-lessons/README.md)
- **part-04-features-plan.md**: ⭐ **Kế hoạch tính năng frontend** (chi tiết từng tính năng, ưu tiên, checklist)
- **part-05-implementation-steps/**: Các bước copy template và phát triển
  - Xem [`part-05-implementation-steps/README.md`](./part-05-implementation-steps/README.md)

## Workflow

Sau khi đã thiết kế backend (folder `backend/`), thiết kế frontend để:
- Kết nối với Backend API
- Hiển thị dữ liệu từ database
- Tương tác với người dùng (xem vị trí, cảnh báo, quản lý)

## Lưu ý

Frontend cần tích hợp với:
- Backend API (REST/GraphQL)
- Real-time updates (WebSocket/MQTT over WebSocket)
- Bản đồ (Google Maps, Mapbox, v.v.)

