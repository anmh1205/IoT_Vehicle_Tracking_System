# Kế Hoạch Tính Năng Frontend

## Tổng Quan

Tài liệu này mô tả chi tiết các tính năng frontend cần phát triển cho hệ thống IoT Vehicle Tracking System, được phân loại theo mức độ ưu tiên và phạm vi đồ án.

## Phân Loại Tính Năng

### Phase 1: Tính Năng Cốt Lõi (Bắt Buộc cho Đồ Án)

Các tính năng cần thiết để demo hệ thống cơ bản.

### Phase 2: Tính Năng Mở Rộng (Tùy Chọn)

Các tính năng nâng cao, có thể bỏ qua nếu không đủ thời gian.

---

## PHASE 1: TÍNH NĂNG CỐT LÕI

### 1. Authentication & Authorization

#### 1.1 Đăng Nhập / Đăng Xuất

**Mô tả:**
- Form đăng nhập với email/username và password
- Xử lý JWT token (access token + refresh token)
- Lưu token vào localStorage/cookie
- Redirect sau khi đăng nhập thành công

**API Endpoints:**
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`

**UI Components:**
- Login page (`/login`)
- Protected route wrapper
- Auth context/provider

**Tính năng:**
- ✅ Form validation (email, password)
- ✅ Error handling (sai mật khẩu, tài khoản không tồn tại)
- ✅ Loading state
- ✅ Remember me (optional)
- ✅ Auto logout khi token hết hạn

**Ưu tiên:** ⭐⭐⭐⭐⭐ (Cao nhất)

---

#### 1.2 Quản Lý Session

**Mô tả:**
- Hiển thị thông tin user hiện tại
- Đổi mật khẩu
- Xem lịch sử đăng nhập

**UI Components:**
- User profile dropdown
- Settings page (`/settings`)

**Tính năng:**
- ✅ Hiển thị user info (tên, email, role)
- ✅ Đổi mật khẩu
- ✅ Logout

**Ưu tiên:** ⭐⭐⭐⭐

---

### 2. Dashboard

#### 2.1 Dashboard Tổng Quan

**Mô tả:**
- Hiển thị thống kê tổng quan về hệ thống
- Cards với số liệu chính
- Charts/biểu đồ
- Danh sách xe đang hoạt động

**UI Components:**
- Dashboard page (`/dashboard`)
- Stat cards
- Charts (Recharts/Chart.js)

**Tính năng:**
- ✅ Tổng số xe (active, inactive, maintenance)
- ✅ Tổng số chuyến đi hôm nay
- ✅ Số cảnh báo chưa xử lý
- ✅ Biểu đồ số chuyến đi theo ngày/tuần/tháng
- ✅ Danh sách xe đang di chuyển (real-time)
- ✅ Map preview với vị trí các xe

**API Endpoints:**
- `GET /api/dashboard/stats`
- `GET /api/vehicles?status=active&limit=10`

**Ưu tiên:** ⭐⭐⭐⭐⭐

---

### 3. Quản Lý Phương Tiện (Vehicles)

#### 3.1 Danh Sách Phương Tiện

**Mô tả:**
- Bảng danh sách tất cả phương tiện
- Filter, search, sort
- Pagination

**UI Components:**
- Vehicles list page (`/vehicles`)
- Data table component
- Filter sidebar

**Tính năng:**
- ✅ Hiển thị danh sách xe (bảng)
- ✅ Search theo biển số, tên xe
- ✅ Filter theo status (active, inactive, maintenance)
- ✅ Filter theo vehicle type
- ✅ Sort theo cột (tên, ngày tạo, status)
- ✅ Pagination
- ✅ Xem chi tiết (modal hoặc navigate)
- ✅ Actions: Edit, Delete, View Details

**API Endpoints:**
- `GET /api/vehicles` (với query params: search, filter, sort, pagination)
- `GET /api/vehicles/:id`
- `PUT /api/vehicles/:id`
- `DELETE /api/vehicles/:id`

**Ưu tiên:** ⭐⭐⭐⭐⭐

---

#### 3.2 Thêm/Sửa Phương Tiện

**Mô tả:**
- Form thêm mới hoặc chỉnh sửa thông tin xe
- Validation đầy đủ
- Upload ảnh (optional)

**UI Components:**
- Vehicle form (modal hoặc page)
- Form fields với validation

**Tính năng:**
- ✅ Form fields:
  - Biển số (plate_number) - required
  - Loại xe (vehicle_type) - dropdown
  - Hãng (brand)
  - Model
  - Năm sản xuất (year)
  - Màu sắc (color)
  - Số chỗ ngồi (seats)
  - Hộp số (transmission)
  - Loại nhiên liệu (fuel_type)
  - Số km hiện tại (mileage_km)
  - Trạng thái (status)
- ✅ Validation (required fields, format)
- ✅ Submit và error handling
- ✅ Upload ảnh xe (optional)

**API Endpoints:**
- `POST /api/vehicles`
- `PUT /api/vehicles/:id`

**Ưu tiên:** ⭐⭐⭐⭐⭐

---

#### 3.3 Chi Tiết Phương Tiện

**Mô tả:**
- Trang chi tiết một phương tiện
- Thông tin cơ bản
- Vị trí hiện tại trên bản đồ
- Lịch sử chuyến đi
- Cảnh báo liên quan
- Thiết bị gắn trên xe

**UI Components:**
- Vehicle detail page (`/vehicles/:id`)
- Tabs/Sections
- Map component

**Tính năng:**
- ✅ Tab "Thông tin": Thông tin cơ bản xe
- ✅ Tab "Vị trí": Map với vị trí hiện tại
- ✅ Tab "Chuyến đi": Danh sách trips
- ✅ Tab "Cảnh báo": Alerts liên quan
- ✅ Tab "Thiết bị": Device info
- ✅ Tab "Bảo trì": Maintenance records

**API Endpoints:**
- `GET /api/vehicles/:id`
- `GET /api/vehicles/:id/trips`
- `GET /api/vehicles/:id/alerts`
- `GET /api/vehicles/:id/device`

**Ưu tiên:** ⭐⭐⭐⭐⭐

---

### 4. Theo Dõi Real-time (Tracking)

#### 4.1 Bản Đồ Theo Dõi

**Mô tả:**
- Bản đồ hiển thị vị trí các xe real-time
- WebSocket connection để nhận updates
- Markers cho từng xe
- Click vào marker để xem thông tin

**UI Components:**
- Tracking map page (`/tracking`)
- Leaflet map component
- Vehicle markers
- Info popup

**Tính năng:**
- ✅ Map với Leaflet/React Leaflet
- ✅ WebSocket connection (Socket.io client)
- ✅ Real-time updates vị trí xe
- ✅ Markers cho từng xe (màu sắc theo status)
- ✅ Click marker → popup với thông tin xe
- ✅ Filter xe hiển thị trên map
- ✅ Zoom to vehicle
- ✅ Route visualization (nếu có trip đang active)
- ✅ Auto refresh (mỗi 5-10 giây)

**API Endpoints:**
- WebSocket: `/socket.io` (real-time location updates)
- `GET /api/vehicles/:id/location` (current location)

**Ưu tiên:** ⭐⭐⭐⭐⭐

---

#### 4.2 Theo Dõi Một Xe Cụ Thể

**Mô tả:**
- Trang theo dõi chi tiết một xe
- Map với route history
- Thông tin real-time (tốc độ, hướng, v.v.)
- Timeline của chuyến đi

**UI Components:**
- Single vehicle tracking page (`/vehicles/:id/tracking`)
- Map với route
- Info panel

**Tính năng:**
- ✅ Map với vị trí hiện tại
- ✅ Route history (polyline)
- ✅ Info panel: tốc độ, hướng, thời gian
- ✅ Playback route (nếu có)
- ✅ Timeline events

**API Endpoints:**
- `GET /api/vehicles/:id/telemetry` (real-time)
- `GET /api/trips/:id/route` (route history)

**Ưu tiên:** ⭐⭐⭐⭐

---

### 5. Quản Lý Chuyến Đi (Trips)

#### 5.1 Danh Sách Chuyến Đi

**Mô tả:**
- Bảng danh sách tất cả chuyến đi
- Filter theo xe, ngày, trạng thái
- Xem route trên map

**UI Components:**
- Trips list page (`/trips`)
- Data table
- Route viewer modal

**Tính năng:**
- ✅ Danh sách trips (bảng)
- ✅ Filter: vehicle, date range, status
- ✅ Search
- ✅ Sort
- ✅ Pagination
- ✅ Click để xem route trên map
- ✅ Export (optional)

**API Endpoints:**
- `GET /api/trips` (với filters)
- `GET /api/trips/:id`
- `GET /api/trips/:id/route`

**Ưu tiên:** ⭐⭐⭐⭐

---

#### 5.2 Chi Tiết Chuyến Đi

**Mô tả:**
- Trang chi tiết một chuyến đi
- Map với route
- Thống kê (quãng đường, thời gian, tốc độ trung bình)
- Timeline events

**UI Components:**
- Trip detail page (`/trips/:id`)
- Map với route polyline
- Stats cards
- Timeline component

**Tính năng:**
- ✅ Map với route (polyline)
- ✅ Thống kê:
  - Quãng đường (km)
  - Thời gian (duration)
  - Tốc độ trung bình
  - Tốc độ tối đa
  - Số lần dừng
- ✅ Timeline events (start, stops, end)
- ✅ Playback route (optional)

**API Endpoints:**
- `GET /api/trips/:id`
- `GET /api/trips/:id/route`
- `GET /api/trips/:id/statistics`

**Ưu tiên:** ⭐⭐⭐⭐

---

### 6. Quản Lý Cảnh Báo (Alerts)

#### 6.1 Danh Sách Cảnh Báo

**Mô tả:**
- Bảng danh sách tất cả cảnh báo
- Filter theo loại, trạng thái, xe
- Đánh dấu đã xử lý

**UI Components:**
- Alerts list page (`/alerts`)
- Data table
- Status badges

**Tính năng:**
- ✅ Danh sách alerts (bảng)
- ✅ Filter: type, status, vehicle, date
- ✅ Search
- ✅ Sort
- ✅ Pagination
- ✅ Badge màu theo mức độ (critical, warning, info)
- ✅ Actions: View, Mark as resolved
- ✅ Real-time updates (WebSocket)

**API Endpoints:**
- `GET /api/alerts`
- `GET /api/alerts/:id`
- `PUT /api/alerts/:id/resolve`

**Ưu tiên:** ⭐⭐⭐⭐⭐

---

#### 6.2 Chi Tiết Cảnh Báo

**Mô tả:**
- Trang chi tiết một cảnh báo
- Thông tin chi tiết
- Vị trí trên map
- Lịch sử xử lý

**UI Components:**
- Alert detail page (`/alerts/:id`)
- Map component
- Info panel

**Tính năng:**
- ✅ Thông tin cảnh báo (type, message, timestamp)
- ✅ Vị trí trên map
- ✅ Thông tin xe liên quan
- ✅ Lịch sử xử lý
- ✅ Action: Resolve, Acknowledge

**API Endpoints:**
- `GET /api/alerts/:id`

**Ưu tiên:** ⭐⭐⭐⭐

---

### 7. Quản Lý Khách Hàng (Customers)

#### 7.1 Danh Sách Khách Hàng

**Mô tả:**
- Bảng danh sách khách hàng
- Filter, search
- Xem chi tiết

**UI Components:**
- Customers list page (`/customers`)
- Data table

**Tính năng:**
- ✅ Danh sách customers (bảng)
- ✅ Search (tên, email, phone)
- ✅ Filter (status, verification)
- ✅ Sort
- ✅ Pagination
- ✅ Actions: View, Edit, Delete

**API Endpoints:**
- `GET /api/customers`
- `GET /api/customers/:id`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id`

**Ưu tiên:** ⭐⭐⭐⭐

---

#### 7.2 Thêm/Sửa Khách Hàng

**Mô tả:**
- Form thêm/sửa khách hàng
- Verification status

**UI Components:**
- Customer form (modal hoặc page)

**Tính năng:**
- ✅ Form fields:
  - Tên đầy đủ
  - Email
  - Số điện thoại
  - Địa chỉ
  - CMND/CCCD
  - Verification status
- ✅ Validation
- ✅ Submit

**API Endpoints:**
- `POST /api/customers`
- `PUT /api/customers/:id`

**Ưu tiên:** ⭐⭐⭐

---

### 8. Quản Lý Thiết Bị (Devices)

#### 8.1 Danh Sách Thiết Bị

**Mô tả:**
- Bảng danh sách thiết bị tracker
- Filter theo xe, trạng thái
- Cấu hình thiết bị

**UI Components:**
- Devices list page (`/devices`)
- Data table

**Tính năng:**
- ✅ Danh sách devices (bảng)
- ✅ Filter: vehicle, status, type
- ✅ Search
- ✅ Sort
- ✅ Pagination
- ✅ Actions: View, Edit, Configure

**API Endpoints:**
- `GET /api/devices`
- `GET /api/devices/:id`
- `PUT /api/devices/:id`

**Ưu tiên:** ⭐⭐⭐

---

#### 8.2 Cấu Hình Thiết Bị

**Mô tả:**
- Form cấu hình thiết bị
- Gửi lệnh đến thiết bị

**UI Components:**
- Device config page (`/devices/:id/config`)
- Command form

**Tính năng:**
- ✅ Thông tin thiết bị (firmware, hardware version)
- ✅ Cấu hình (heartbeat interval, etc.)
- ✅ Gửi lệnh (restart, update config)
- ✅ Xem lịch sử lệnh

**API Endpoints:**
- `GET /api/devices/:id`
- `PUT /api/devices/:id/config`
- `POST /api/devices/:id/commands`

**Ưu tiên:** ⭐⭐⭐

---

### 9. Quản Lý Vùng Địa Lý (Geofences)

#### 9.1 Danh Sách Geofences

**Mô tả:**
- Danh sách các vùng địa lý
- Vẽ geofence trên map

**UI Components:**
- Geofences list page (`/geofences`)
- Map với geofence polygons

**Tính năng:**
- ✅ Danh sách geofences (bảng)
- ✅ Filter, search
- ✅ Xem trên map
- ✅ Actions: Add, Edit, Delete

**API Endpoints:**
- `GET /api/geofences`
- `POST /api/geofences`
- `PUT /api/geofences/:id`
- `DELETE /api/geofences/:id`

**Ưu tiên:** ⭐⭐⭐

---

#### 9.2 Tạo/Sửa Geofence

**Mô tả:**
- Vẽ polygon trên map
- Đặt tên, loại (allowed/restricted)
- Gắn với xe

**UI Components:**
- Geofence editor (`/geofences/new`, `/geofences/:id/edit`)
- Map với drawing tools

**Tính năng:**
- ✅ Vẽ polygon trên map
- ✅ Form: tên, loại, mô tả
- ✅ Gắn với xe (optional)
- ✅ Save

**API Endpoints:**
- `POST /api/geofences`
- `PUT /api/geofences/:id`

**Ưu tiên:** ⭐⭐⭐

---

### 10. Quản Lý Vi Phạm (Violations)

#### 10.1 Danh Sách Vi Phạm

**Mô tả:**
- Danh sách vi phạm (speeding, geofence violation, etc.)
- Filter, search

**UI Components:**
- Violations list page (`/violations`)
- Data table

**Tính năng:**
- ✅ Danh sách violations (bảng)
- ✅ Filter: type, vehicle, date
- ✅ Search
- ✅ Sort
- ✅ Pagination
- ✅ Xem chi tiết (vị trí, tốc độ, thời gian)

**API Endpoints:**
- `GET /api/violations`
- `GET /api/violations/:id`

**Ưu tiên:** ⭐⭐⭐

---

### 11. Quản Lý Bảo Trì (Maintenance)

#### 11.1 Danh Sách Bảo Trì

**Mô tả:**
- Lịch sử bảo trì các xe
- Thêm bảo trì mới

**UI Components:**
- Maintenance list page (`/maintenance`)
- Data table
- Form

**Tính năng:**
- ✅ Danh sách maintenance records (bảng)
- ✅ Filter: vehicle, date, type
- ✅ Search
- ✅ Actions: Add, Edit, Delete

**API Endpoints:**
- `GET /api/maintenance`
- `POST /api/maintenance`
- `PUT /api/maintenance/:id`
- `DELETE /api/maintenance/:id`

**Ưu tiên:** ⭐⭐

---

### 12. Thông Báo (Notifications)

#### 12.1 Cấu Hình Thông Báo

**Mô tả:**
- Cấu hình Telegram bot
- Cấu hình Email
- Chọn loại thông báo

**UI Components:**
- Notifications settings page (`/settings/notifications`)
- Form

**Tính năng:**
- ✅ Cấu hình Telegram bot (token, chat_id)
- ✅ Cấu hình Email (SMTP)
- ✅ Chọn loại thông báo (alerts, violations, etc.)
- ✅ Test notification

**API Endpoints:**
- `GET /api/notifications/config`
- `PUT /api/notifications/config`
- `POST /api/notifications/test`

**Ưu tiên:** ⭐⭐⭐

---

## PHASE 2: TÍNH NĂNG MỞ RỘNG

### 13. Đặt Xe (Bookings) [Phase 2]

#### 13.1 Quản Lý Đặt Xe

**Mô tả:**
- Danh sách đặt xe
- Tạo đặt xe mới
- Xác nhận/hủy đặt xe

**UI Components:**
- Bookings list page (`/bookings`)
- Booking form
- Calendar view

**Tính năng:**
- ✅ Danh sách bookings
- ✅ Filter: status, customer, vehicle, date
- ✅ Calendar view
- ✅ Tạo booking mới
- ✅ Xác nhận/hủy booking
- ✅ Thanh toán (integration)

**API Endpoints:**
- `GET /api/bookings`
- `POST /api/bookings`
- `PUT /api/bookings/:id`
- `DELETE /api/bookings/:id`

**Ưu tiên:** ⭐⭐ (Phase 2)

---

### 14. Hợp Đồng (Contracts) [Phase 2]

#### 14.1 Quản Lý Hợp Đồng

**Mô tả:**
- Danh sách hợp đồng
- Tạo hợp đồng mới
- Xem PDF hợp đồng

**UI Components:**
- Contracts list page (`/contracts`)
- Contract form
- PDF viewer

**Tính năng:**
- ✅ Danh sách contracts
- ✅ Filter, search
- ✅ Tạo contract mới
- ✅ Xem PDF
- ✅ Ký điện tử (optional)

**API Endpoints:**
- `GET /api/contracts`
- `POST /api/contracts`
- `GET /api/contracts/:id/pdf`

**Ưu tiên:** ⭐ (Phase 2)

---

### 15. Thanh Toán (Payments) [Phase 2]

#### 15.1 Quản Lý Thanh Toán

**Mô tả:**
- Lịch sử thanh toán
- Tạo hóa đơn
- Tích hợp payment gateway

**UI Components:**
- Payments list page (`/payments`)
- Invoice viewer

**Tính năng:**
- ✅ Danh sách payments
- ✅ Filter, search
- ✅ Xem invoice
- ✅ Export invoice (PDF)
- ✅ Tích hợp payment gateway (VNPay, MoMo, etc.)

**API Endpoints:**
- `GET /api/payments`
- `POST /api/payments`
- `GET /api/payments/:id/invoice`

**Ưu tiên:** ⭐ (Phase 2)

---

### 16. Báo Cáo Hư Hỏng (Damage Reports) [Phase 2]

#### 16.1 Quản Lý Báo Cáo Hư Hỏng

**Mô tả:**
- Danh sách báo cáo hư hỏng
- Tạo báo cáo mới
- Upload ảnh

**UI Components:**
- Damage reports list page (`/damage-reports`)
- Report form
- Image gallery

**Tính năng:**
- ✅ Danh sách reports
- ✅ Filter, search
- ✅ Tạo report mới
- ✅ Upload ảnh
- ✅ Xử lý report (approve, reject)

**API Endpoints:**
- `GET /api/damage-reports`
- `POST /api/damage-reports`
- `PUT /api/damage-reports/:id`

**Ưu tiên:** ⭐ (Phase 2)

---

### 17. Đánh Giá (Reviews) [Phase 2]

#### 17.1 Quản Lý Đánh Giá

**Mô tả:**
- Danh sách đánh giá từ khách hàng
- Xem rating, comments

**UI Components:**
- Reviews list page (`/reviews`)
- Review cards

**Tính năng:**
- ✅ Danh sách reviews
- ✅ Filter: vehicle, customer, rating
- ✅ Xem chi tiết
- ✅ Reply to review (optional)

**API Endpoints:**
- `GET /api/reviews`
- `GET /api/reviews/:id`

**Ưu tiên:** ⭐ (Phase 2)

---

## TÍNH NĂNG CHUNG (Áp Dụng Cho Tất Cả Pages)

### 1. Navigation & Layout

- ✅ Sidebar navigation (collapsible)
- ✅ Header với breadcrumbs
- ✅ User menu (profile, settings, logout)
- ✅ Responsive (mobile, tablet, desktop)

### 2. Data Tables

- ✅ Sorting
- ✅ Filtering
- ✅ Search
- ✅ Pagination
- ✅ Row selection
- ✅ Export (CSV, Excel) - optional

### 3. Forms

- ✅ Validation (React Hook Form + Zod)
- ✅ Error handling
- ✅ Loading states
- ✅ Success/Error toasts

### 4. Real-time Updates

- ✅ WebSocket connection (Socket.io)
- ✅ Auto refresh data
- ✅ Toast notifications cho events mới

### 5. Maps

- ✅ Leaflet/React Leaflet
- ✅ Markers với custom icons
- ✅ Polylines cho routes
- ✅ Popups với thông tin
- ✅ Drawing tools (cho geofences)

### 6. Charts & Statistics

- ✅ Recharts hoặc Chart.js
- ✅ Line charts (trips over time)
- ✅ Bar charts (statistics)
- ✅ Pie charts (distribution)

### 7. Error Handling

- ✅ Global error boundary
- ✅ API error handling
- ✅ User-friendly error messages
- ✅ Retry mechanism

### 8. Performance

- ✅ Code splitting
- ✅ Lazy loading
- ✅ Image optimization
- ✅ Caching (TanStack Query)

---

## Ưu Tiên Phát Triển

### Sprint 1 (Tuần 1-2): Foundation
1. ✅ Setup project (Next.js, TypeScript, Tailwind)
2. ✅ Authentication (login, logout)
3. ✅ Layout (sidebar, header)
4. ✅ Dashboard cơ bản

### Sprint 2 (Tuần 3-4): Core Features
1. ✅ Vehicles management (CRUD)
2. ✅ Tracking map (real-time)
3. ✅ Alerts management

### Sprint 3 (Tuần 5-6): Extended Features
1. ✅ Trips management
2. ✅ Customers management
3. ✅ Devices management
4. ✅ Geofences

### Sprint 4 (Tuần 7-8): Polish & Testing
1. ✅ Violations, Maintenance
2. ✅ Notifications settings
3. ✅ Testing, bug fixes
4. ✅ Documentation

---

## Checklist Tính Năng

### Phase 1 (Bắt Buộc)

- [ ] Authentication & Authorization
- [ ] Dashboard
- [ ] Vehicles Management (CRUD)
- [ ] Real-time Tracking Map
- [ ] Trips Management
- [ ] Alerts Management
- [ ] Customers Management (cơ bản)
- [ ] Devices Management (cơ bản)
- [ ] Geofences (cơ bản)
- [ ] Notifications Settings

### Phase 2 (Tùy Chọn)

- [ ] Bookings Management
- [ ] Contracts Management
- [ ] Payments Management
- [ ] Damage Reports
- [ ] Reviews Management

---

## Lưu Ý

1. **Focus Phase 1**: Tập trung vào Phase 1 cho đồ án, Phase 2 có thể bỏ qua
2. **Real-time là quan trọng**: Tracking map với WebSocket là tính năng highlight
3. **Mobile Responsive**: Đảm bảo responsive cho mobile
4. **Performance**: Tối ưu loading, caching
5. **UX**: Đảm bảo UX tốt, dễ sử dụng

---

## Tài Liệu Tham Khảo

- API Endpoints: [`../backend/part-05-api-endpoints/`](../backend/part-05-api-endpoints/)
- Database Schema: [`../backend/part-03-database/`](../backend/part-03-database/)
- Frontend Design: [`part-02-frontend-design/README.md`](./part-02-frontend-design/README.md)

