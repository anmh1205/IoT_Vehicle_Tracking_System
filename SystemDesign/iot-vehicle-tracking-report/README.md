# BÁO CÁO THIẾT KẾ HỆ THỐNG IoT QUẢN LÝ PHƯƠNG TIỆN GIAO THÔNG

## THUÊ XE TỰ LÁI

---

## Mục lục (đã tách file theo folder)

### 📚 01. Introduction (Giới thiệu & Phạm vi)
- [PHẦN I: THAM KHẢO KIẾN THỨC NỀN VÀ BRAINSTORM](./01-introduction/part-01-nen-tang-va-brainstorm.md)
- [PHẦN II: LỰA CHỌN PHẠM VI (SCOPE)](./01-introduction/part-02-scope.md)

### 🔧 02. Hardware (Phần cứng)
- [PHẦN III: LỰA CHỌN GIẢI PHÁP PHẦN CỨNG](./02-hardware/part-01-phan-cung.md)
- [PHẦN IV: CHIẾN LƯỢC QUẢN LÝ NĂNG LƯỢNG](./02-hardware/part-02-quan-ly-nang-luong.md)
- [PHẦN VI: TÍNH TOÁN NĂNG LƯỢNG](./02-hardware/part-03-tinh-toan-nang-luong.md)

### 💻 03. Firmware (Phần mềm)
- [PHẦN V.1: KIẾN TRÚC VÀ LUỒNG HOẠT ĐỘNG](./03-firmware/part-01-kien-truc-va-luong-hoat-dong.md)
- [PHẦN V.2: BLE OBD2](./03-firmware/part-02-ble-obd2.md)
- [PHẦN V.3: MODEM SIMCOM A7600CE-T](./03-firmware/part-03-modem-simcom.md)
- [PHẦN V.4: POWER MANAGEMENT VÀ GPIO](./03-firmware/part-04-power-management-gpio.md)
- [PHẦN V.5: DATA FORMAT VÀ STATE MACHINE](./03-firmware/part-05-data-format-state-machine.md)
- [PHẦN V.6: CONFIGURATION MANAGEMENT](./03-firmware/part-06-configuration.md)
- [PHẦN V.7: THAM KHẢO ESP-IDF CHO VGATE ICAR PRO](./03-firmware/part-07-vgate-icar-pro-esp-idf-reference.md)

### 🖥️ 04. Server (Hệ thống Server - Backend + Frontend)

#### Backend
- [PHẦN VII: LỰA CHỌN VÀ CẤU HÌNH MQTT BROKER](./04-server/backend/part-01-mqtt-broker.md)
- [PHẦN VIII: EMQX RULES ENGINE](./04-server/backend/part-02-emqx-rules-engine.md)
- [PHẦN IX: KIẾN TRÚC CƠ SỞ DỮ LIỆU](./04-server/backend/part-03-database.md)
- [PHẦN X: API SERVER (BACKEND APPLICATION)](./04-server/backend/part-04-api-server.md)
- [PHẦN XI: API ENDPOINTS DESIGN](./04-server/backend/part-05-api-endpoints.md)
- [PHẦN XII: NOTIFICATIONS & INTEGRATIONS (Telegram + Email)](./04-server/backend/part-06-notifications-integrations.md)
- [Database Schema SQL](./04-server/backend/schema.sql)

#### Frontend
- [PHẦN XII: THIẾT KẾ FRONTEND (GIAO DIỆN NGƯỜI DÙNG)](./04-server/frontend/part-01-frontend.md)
- [PHẦN XIII: FRONTEND DESIGN & IMPLEMENTATION PLAN](./04-server/frontend/part-02-frontend-design.md)
  - [XIII.1: Setup & Structure](./04-server/frontend/part-02-01-setup-and-structure.md)
  - [XIII.2: Theme & Styling](./04-server/frontend/part-02-02-theme-and-styling.md)
  - [XIII.3: Layout Components](./04-server/frontend/part-02-03-layout-components.md)
  - [XIII.4: UI Components](./04-server/frontend/part-02-04-ui-components.md)
  - [XIII.5: Pages & Features](./04-server/frontend/part-02-05-pages-and-features.md)
  - [XIII.6: API Integration](./04-server/frontend/part-02-06-api-integration.md)
  - [XIII.7: Realtime Integration](./04-server/frontend/part-02-07-realtime-integration.md)
  - [XIII.8: Implementation Steps (Copy Template)](./04-server/frontend/part-02-08-implementation-steps.md)

### 📝 05. Conclusion (Kết luận)
- [PHẦN X: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN](./05-conclusion/part-01-ket-luan.md)

### 🔍 06. Improvements (Cải Tiến)
- [PHẦN XIV: CÁC ĐIỂM CẦN CẢI TIẾN](./06-improvements/part-01-improvement-opportunities.md)

### 📎 Appendix (Phụ lục)
- [Github repository naming](./appendix/appendix-github-repo-naming.md)

---

## Gợi ý workflow brainstorm

### Khi thiết kế phần cứng:
- Mở song song:
  - `01-introduction/part-01-...` (ý tưởng/giả định)
  - `02-hardware/part-01-...` (phần cứng)
  - `02-hardware/part-02-...` (năng lượng)

### Khi thiết kế firmware:
- Mở song song:
  - `02-hardware/part-01-...` (phần cứng)
  - `03-firmware/part-01-...` (kiến trúc firmware)
  - `03-firmware/part-02-...` (Bluetooth OBD2)
  - `03-firmware/part-03-...` (Modem SIMCom)
  - `03-firmware/part-04-...` (Power Management)
  - `03-firmware/part-05-...` (Data Format & State Machine)
  - `03-firmware/part-06-...` (Configuration)

### Khi thiết kế server (backend + frontend):
- **Backend**: Mở song song:
  - `04-server/backend/part-01-...` (MQTT)
  - `04-server/backend/part-02-...` (Rules Engine)
  - `04-server/backend/part-03-...` (Database)
  - `04-server/backend/part-04-...` (API Server - Tech Stack)
  - `04-server/backend/part-05-...` (API Endpoints Design)
  - `04-server/backend/schema.sql` (Database Schema SQL)
- **Frontend**: Sau khi backend xong, thiết kế:
  - `04-server/frontend/part-01-frontend.md` (Giao diện người dùng)

### Khi tổng kết:
- Cập nhật "đề xuất cuối" ở `05-conclusion/part-01-...`


