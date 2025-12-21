# BÁO CÁO THIẾT KẾ HỆ THỐNG IoT QUẢN LÝ PHƯƠNG TIỆN GIAO THÔNG

## THUÊ XE TỰ LÁI

---

## Mục lục (đã tách file theo folder)

### 📚 01. Introduction (Giới thiệu & Phạm vi)
- [PHẦN I: THAM KHẢO KIẾN THỨC NỀN VÀ BRAINSTORM](./01-introduction/part-01-nen-tang-va-brainstorm.md)
- [PHẦN II: LỰA CHỌN PHẠM VI (SCOPE)](./01-introduction/part-02-scope.md)

### 🔧 02. Hardware (Phần cứng)
- [PHẦN III: LỰA CHỌN GIẢI PHÁP PHẦN CỨNG](./02-hardware/part-03-phan-cung.md)
- [PHẦN IV: CHIẾN LƯỢC QUẢN LÝ NĂNG LƯỢNG](./02-hardware/part-04-quan-ly-nang-luong.md)
- [PHẦN VI: TÍNH TOÁN NĂNG LƯỢNG](./02-hardware/part-06-tinh-toan-nang-luong.md)

### 💻 03. Software (Phần mềm)
- [PHẦN V: THIẾT KẾ PHẦN MỀM (FIRMWARE)](./03-software/part-05-firmware.md)

### 🖥️ 05. Server (Hệ thống Server - Backend + Frontend)

#### Backend
- [PHẦN VII: LỰA CHỌN VÀ CẤU HÌNH MQTT BROKER](./05-server/backend/part-07-mqtt-broker.md)
- [PHẦN VIII: EMQX RULES ENGINE](./05-server/backend/part-08-emqx-rules-engine.md)
- [PHẦN IX: KIẾN TRÚC CƠ SỞ DỮ LIỆU](./05-server/backend/part-09-database.md)

#### Frontend
- [THIẾT KẾ FRONTEND (GIAO DIỆN NGƯỜI DÙNG)](./05-server/frontend/part-frontend.md)

### 📝 06. Conclusion (Kết luận)
- [PHẦN X: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN](./06-conclusion/part-10-ket-luan.md)

### 📎 Appendix (Phụ lục)
- [Github repository naming](./appendix/appendix-github-repo-naming.md)

---

## Gợi ý workflow brainstorm

### Khi thiết kế phần cứng:
- Mở song song:
  - `01-introduction/part-01-...` (ý tưởng/giả định)
  - `02-hardware/part-03-...` (phần cứng)
  - `02-hardware/part-04-...` (năng lượng)

### Khi thiết kế firmware:
- Mở song song:
  - `02-hardware/part-03-...` (phần cứng)
  - `03-software/part-05-...` (firmware)

### Khi thiết kế server (backend + frontend):
- **Backend**: Mở song song:
  - `05-server/backend/part-07-...` (MQTT)
  - `05-server/backend/part-08-...` (Rules Engine)
  - `05-server/backend/part-09-...` (Database)
- **Frontend**: Sau khi backend xong, thiết kế:
  - `05-server/frontend/part-frontend.md` (Giao diện người dùng)

### Khi tổng kết:
- Cập nhật "đề xuất cuối" ở `06-conclusion/part-10-...`


