# PHỤ LỤC - APPENDICES

---

# PHỤ LỤC 1: BÁO CÁO TÀI CHÍNH - FINANCE REPORT

## 1.1. Bảng kê chi phí linh kiện (Bill of Materials - BOM)

Bảng dưới đây liệt kê chi tiết các linh kiện chính sử dụng trong thiết bị tracker IoT, bao gồm đơn giá và tổng chi phí ước tính. Giá tham khảo từ các sàn thương mại điện tử tại Việt Nam (Shopee, Lazada, Điện tử Nhật Việt) tính đến tháng 01/2026.

[Bảng PL-1.1: Bảng kê chi phí linh kiện (BOM)]

| STT | Linh kiện | Model / Thông số | Số lượng | Đơn giá (VND) | Thành tiền (VND) | Ghi chú |
|-----|-----------|-------------------|----------|---------------|-------------------|---------|
| 1 | Vi điều khiển | ESP32-S3-WROOM-1 (N16R8) | 1 | 120.000 | 120.000 | MCU chính, 16MB Flash, 8MB PSRAM |
| 2 | Modem 4G/GNSS | SIMCom A7600CE-T | 1 | 250.000 | 250.000 | Tích hợp 4G LTE Cat-1 và GPS/GNSS |
| 3 | OBD2 Adapter | vgate iCar Pro BLE | 1 | 350.000 | 350.000 | Bluetooth Low Energy OBD2 |
| 4 | Cảm biến gia tốc | LIS3DH (breakout board) | 1 | 45.000 | 45.000 | IMU 3 trục, phát hiện chuyển động |
| 5 | Pin dự phòng | 21700 Li-ion 5000mAh | 1 | 80.000 | 80.000 | Samsung/LG cell |
| 6 | IC sạc pin | IP2312 module | 1 | 25.000 | 25.000 | Sạc 3A, CC/CV |
| 7 | Buck converter | MP1584 module (12V->5V) | 1 | 15.000 | 15.000 | Giảm áp từ ắc quy xe |
| 8 | Boost converter | MT3608 module (3.7V->5V) | 1 | 12.000 | 12.000 | Tăng áp từ pin dự phòng |
| 9 | LDO 3.3V | AMS1117-3.3 | 2 | 3.000 | 6.000 | Cấp nguồn cho ESP32-S3 và LIS3DH |
| 10 | MOSFET nguồn | AO3401 (P-ch) + AO3400 (N-ch) | 4 | 5.000 | 20.000 | Power path và LVD |
| 11 | Op-amp comparator | LM393 | 1 | 8.000 | 8.000 | Cho mạch Low Voltage Disconnect |
| 12 | Anten GPS | Anten gốm GNSS 25x25mm | 1 | 25.000 | 25.000 | Anten GPS/GLONASS/BeiDou |
| 13 | Anten 4G | Anten FPC 4G LTE | 1 | 20.000 | 20.000 | Anten mạng di động |
| 14 | SIM tray + SIM | Nano SIM holder + SIM 4G | 1 | 15.000 | 15.000 | SIM data 4G |
| 15 | Connector OBD2 | Jack OBD2 16-pin male | 1 | 35.000 | 35.000 | Kết nối nguồn 12V từ xe |
| 16 | Tụ điện, điện trở | Linh kiện thụ động (combo) | 1 bộ | 30.000 | 30.000 | Tụ lọc, điện trở chia áp, LED |
| 17 | PCB / Perfboard | PCB prototype 7x9cm | 2 | 10.000 | 20.000 | Bo mạch prototype |
| 18 | Hộp đựng | Hộp nhựa ABS 120x80x40mm | 1 | 25.000 | 25.000 | Vỏ bảo vệ thiết bị |
| 19 | Dây kết nối | Dây nối, header, jumper | 1 bộ | 20.000 | 20.000 | Dây kết nối nội bộ |
| | | | | **Tổng cộng** | **1.121.000** | |

## 1.2. Chi phí hạ tầng cloud (ước tính hàng tháng)

[Bảng PL-1.2: Chi phí hạ tầng cloud]

| STT | Hạng mục | Thông số | Chi phí hàng tháng (VND) | Ghi chú |
|-----|----------|----------|--------------------------|---------|
| 1 | VPS Server | 4 vCPU, 8GB RAM, 100GB SSD | 300.000 - 500.000 | DigitalOcean / Vultr / Viettel IDC |
| 2 | SIM 4G data | Gói cước data IoT | 70.000 | Mỗi thiết bị 1 SIM |
| 3 | Tên miền | Domain .com | 25.000 | ~300.000 VND/năm |
| 4 | SSL Certificate | Let's Encrypt | 0 | Miễn phí, tự động gia hạn |
| | | | **Tổng hàng tháng** | **395.000 - 595.000** |

## 1.3. Tổng hợp chi phí dự án

[Bảng PL-1.3: Tổng hợp chi phí dự án]

| Hạng mục | Chi phí (VND) | Ghi chú |
|----------|---------------|---------|
| Phần cứng (1 bộ tracker) | 1.121.000 | Theo BOM ở bảng PL-1.1 |
| Phần mềm (licenses) | 0 | Toàn bộ mã nguồn mở |
| Hạ tầng cloud (3 tháng dev + 3 tháng test) | 2.370.000 - 3.570.000 | 6 tháng x chi phí hàng tháng |
| SIM 4G (6 tháng) | 420.000 | 70.000 x 6 tháng |
| Công cụ phát triển (khác) | 200.000 | USB-UART, breadboard, dây đo |
| **Tổng chi phí dự án** | **4.111.000 - 5.311.000** | |

> **Nhận xét:** Tổng chi phí dự án dưới 6.000.000 VND, trong đó chi phí phần cứng cho mỗi bộ tracker chỉ khoảng 1.121.000 VND -- thấp hơn đáng kể so với các giải pháp thương mại tương đương (2.000.000 - 5.000.000 VND/thiết bị). Khi sản xuất số lượng lớn (>50 bộ), chi phí linh kiện có thể giảm 15-25% nhờ mua sỉ.

---

# PHỤ LỤC 2: CÁC TIÊU CHUẨN THIẾT KẾ - STANDARDS

## 2.1. Tiêu chuẩn OBD2 (SAE J1979 / ISO 15031-5)

**Mô tả:** On-Board Diagnostics II (OBD2) là tiêu chuẩn chẩn đoán xe được bắt buộc áp dụng cho tất cả các xe sản xuất từ năm 1996 (tại Mỹ) và 2001 (tại Châu Âu). Tiêu chuẩn này quy định giao diện vật lý (connector 16-pin), giao thức truyền thông, và các thông số chẩn đoán (PIDs - Parameter IDs).

**Áp dụng trong dự án:**

| Chuẩn cụ thể | Nội dung | Áp dụng |
|-------------|----------|---------|
| SAE J1979 | Định nghĩa các Diagnostic Test Modes (Mode 01-0A) | Đọc dữ liệu động cơ: RPM, tốc độ, nhiệt độ, nhiên liệu |
| ISO 15031-5 | Định nghĩa PIDs và định dạng dữ liệu | Phân tích (parsing) bản tin OBD2 response |
| ISO 15765-2 | Transport protocol cho CAN bus (ISO-TP) | Xử lý multi-frame response (VIN, DTC list) |
| ISO 15765-4 | Emissions-related OBD via CAN | Giao tiếp CAN qua OBD2 adapter BLE |

**Các OBD2 PIDs sử dụng trong dự án:**

| PID (hex) | Mô tả | Đơn vị | Mode |
|-----------|-------|--------|------|
| 0x00 | Supported PIDs [01-20] | Bitmask | 01 |
| 0x04 | Calculated Engine Load | % | 01 |
| 0x05 | Engine Coolant Temperature | C | 01 |
| 0x0C | Engine RPM | rpm | 01 |
| 0x0D | Vehicle Speed | km/h | 01 |
| 0x0F | Intake Air Temperature | C | 01 |
| 0x11 | Throttle Position | % | 01 |
| 0x2F | Fuel Tank Level Input | % | 01 |
| 0x46 | Ambient Air Temperature | C | 01 |

## 2.2. Tiêu chuẩn MQTT 5.0 (OASIS)

**Mô tả:** MQTT (Message Queuing Telemetry Transport) phiên bản 5.0 là tiêu chuẩn OASIS cho giao thức truyền thông IoT, được thiết kế cho các thiết bị có tài nguyên hạn chế và băng thông thấp.

**Các tính năng MQTT 5.0 sử dụng trong dự án:**

| Tính năng | Mô tả | Áp dụng |
|-----------|-------|---------|
| QoS 0 (At most once) | Gửi không xác nhận | Dữ liệu telemetry tần suất cao (GPS, OBD2) |
| QoS 1 (At least once) | Gửi với xác nhận | Cảnh báo, lệnh điều khiển |
| Retain Message | Lưu tin nhắn cuối cùng trên broker | Trạng thái online/offline của thiết bị |
| Last Will and Testament | Thông báo tự động khi mất kết nối | Phát hiện thiết bị offline |
| Topic Alias | Giảm kích thước bản tin | Tối ưu băng thông 4G |
| Session Expiry | Thời gian hết hạn phiên | Quản lý kết nối thiết bị |
| User Properties | Metadata tùy chỉnh | Request-ID correlation |

**Cấu trúc topic MQTT:**

```
devices/{device_id}/telemetry      # Dữ liệu cảm biến (QoS 0)
devices/{device_id}/events         # Sự kiện và cảnh báo (QoS 1)
devices/{device_id}/commands       # Lệnh điều khiển (QoS 1)
devices/{device_id}/status         # Trạng thái online/offline (Retain)
```

## 2.3. Bảo mật thông tin (ISO 27001 - tham khảo)

**Mô tả:** ISO 27001 là tiêu chuẩn quốc tế về hệ thống quản lý an toàn thông tin (ISMS). Dự án tham khảo các nguyên tắc của ISO 27001 để thiết kế các biện pháp bảo mật.

**Các nguyên tắc bảo mật áp dụng:**

| Nguyên tắc | Hiện thực trong dự án |
|------------|----------------------|
| Confidentiality (Bảo mật) | Mã hóa TLS cho MQTT và HTTPS; Token hash SHA-256 |
| Integrity (Toàn vẹn) | MQTT checksum; Database constraints; Zod validation |
| Availability (Sẵn sàng) | Docker restart policy; Health checks; Pin dự phòng |
| Authentication (Xác thực) | Session-based auth với database-backed tokens |
| Authorization (Phân quyền) | RBAC (Role-Based Access Control); MQTT ACL per device |
| Audit Trail (Nhật ký) | VictoriaLogs ghi nhật ký mọi thao tác; Request-ID correlation |

## 2.4. Thiết kế REST API (RFC 7231 và best practices)

**Các nguyên tắc REST API áp dụng:**

| Nguyên tắc | Mô tả | Ví dụ trong dự án |
|------------|-------|--------------------|
| Resource-based URLs | URL đại diện cho tài nguyên, dùng số nhiều | `/api/v1/vehicles`, `/api/v1/alerts` |
| HTTP Methods | Dùng đúng ý nghĩa của phương thức | GET (đọc), POST (tạo), PUT (cập nhật), DELETE (xóa) |
| Status Codes | Mã trạng thái phản hồi chính xác | 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found |
| Pagination | Phân trang cho danh sách lớn | `?page=1&limit=20&sort=created_at:desc` |
| Versioning | Phiên bản API trong URL | `/api/v1/...` |
| Error Format | Định dạng lỗi nhất quán | `{ "error": { "code": "...", "message": "..." } }` |
| Request-ID | Định danh mỗi request | Header `X-Request-ID` cho truy vết lỗi |

---

# PHỤ LỤC 3: KẾ HOẠCH THỰC HIỆN - ASSIGNMENT AND TIMELINES

## 3.1. Phân chia giai đoạn dự án

Dự án được thực hiện trong 6 giai đoạn chính, tổng thời gian dự kiến 24 tuần (6 tháng), từ tháng 09/2025 đến tháng 02/2026.

[Bảng PL-3.1: Phân chia giai đoạn và thời gian thực hiện]

| Giai đoạn | Nội dung chính | Thời gian | Kết quả đầu ra |
|-----------|---------------|-----------|----------------|
| **GĐ1** | Nghiên cứu và thiết kế phần cứng | Tuần 1-4 (4 tuần) | Sơ đồ mạch, BOM, PCB layout |
| **GĐ2** | Phát triển firmware | Tuần 3-10 (8 tuần) | Firmware ESP-IDF hoàn chỉnh |
| **GĐ3** | Xây dựng hạ tầng cloud | Tuần 5-8 (4 tuần) | Docker infrastructure, EMQX, databases |
| **GĐ4** | Phát triển backend API | Tuần 7-14 (8 tuần) | REST API, MQTT Bridge, WebSocket |
| **GĐ5** | Phát triển frontend | Tuần 11-18 (8 tuần) | Web dashboard, bản đồ, biểu đồ |
| **GĐ6** | Tích hợp và kiểm thử | Tuần 17-22 (6 tuần) | Hệ thống tích hợp, báo cáo kiểm thử |
| **GĐ7** | Viết báo cáo và bảo vệ | Tuần 21-24 (4 tuần) | Báo cáo đồ án, slide thuyết trình |

> **Ghi chú:** Các giai đoạn có sự chồng chéo (overlap) có chủ đích để tối ưu hóa thời gian. Ví dụ, GĐ3 (hạ tầng cloud) bắt đầu trước khi GĐ2 (firmware) hoàn thành để có môi trường test sớm.

## 3.2. Biểu đồ Gantt (Gantt Chart)

```
Tuần:  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24
GĐ1:  [========]
GĐ2:        [====================]
GĐ3:              [========]
GĐ4:                    [====================]
GĐ5:                                [====================]
GĐ6:                                               [===============]
GĐ7:                                                        [========]
       |--- Tháng 09 ---|--- Tháng 10 ---|--- Tháng 11 ---|--- Tháng 12 ---|
       |--- Tháng 01 ---|--- Tháng 02 ---|
```

## 3.3. Chi tiết công việc theo giai đoạn

**Giai đoạn 1 -- Nghiên cứu và thiết kế phần cứng (Tuần 1-4):**

| Tuần | Công việc | Sản phẩm |
|------|-----------|----------|
| 1 | Khảo sát linh kiện, đặt mua | Danh sách linh kiện |
| 2 | Thiết kế sơ đồ nguyên lý | Sơ đồ mạch Schematic |
| 3 | Thiết kế PCB / làm mạch prototype | PCB layout / Perfboard |
| 4 | Lắp ráp và kiểm tra cơ bản | Prototype hoạt động |

**Giai đoạn 2 -- Phát triển firmware (Tuần 3-10):**

| Tuần | Công việc | Sản phẩm |
|------|-----------|----------|
| 3-4 | Setup ESP-IDF, GPIO, UART modem | Giao tiếp modem cơ bản |
| 5-6 | Module BLE OBD2, phân tích bản tin | Đọc dữ liệu OBD2 |
| 7-8 | Module MQTT, offline buffering | Truyền dữ liệu lên broker |
| 9-10 | Quản lý năng lượng, IMU, tích hợp | Firmware hoàn chỉnh |

**Giai đoạn 3 -- Hạ tầng cloud (Tuần 5-8):**

| Tuần | Công việc | Sản phẩm |
|------|-----------|----------|
| 5 | Docker setup, PostgreSQL, EMQX | Infrastructure cơ bản |
| 6 | VictoriaMetrics, VictoriaLogs | Time-series và logging |
| 7 | MQTT Bridge service | Dữ liệu từ EMQX đến DB |
| 8 | Grafana, monitoring, backup | Dashboard giám sát |

**Giai đoạn 4 -- Backend API (Tuần 7-14):**

| Tuần | Công việc | Sản phẩm |
|------|-----------|----------|
| 7-8 | Project setup, auth module | Đăng nhập, session |
| 9-10 | Vehicles, devices, customers domain | CRUD API |
| 11-12 | Telemetry, alerts, geofences domain | Dữ liệu thời gian thực |
| 13-14 | WebSocket, commands, testing | API hoàn chỉnh |

**Giai đoạn 5 -- Frontend (Tuần 11-18):**

| Tuần | Công việc | Sản phẩm |
|------|-----------|----------|
| 11-12 | Project setup, layout, auth pages | Khung ứng dụng |
| 13-14 | Dashboard, bản đồ Leaflet | Trang chủ, bản đồ |
| 15-16 | Vehicle management, alerts, geofences | Các trang quản lý |
| 17-18 | ECharts, WebSocket, polish | Giao diện hoàn chỉnh |

**Giai đoạn 6 -- Tích hợp và kiểm thử (Tuần 17-22):**

| Tuần | Công việc | Sản phẩm |
|------|-----------|----------|
| 17-18 | Tích hợp firmware - cloud | Hệ thống end-to-end |
| 19-20 | Kiểm thử chức năng, hiệu năng | Báo cáo kiểm thử |
| 21-22 | Sửa lỗi, tối ưu, triển khai UAT | Hệ thống ổn định |

---

# PHỤ LỤC 4: TÀI LIỆU BỔ TRỢ - SUPPORTING MATERIALS

## 4.1. Mã nguồn dự án (Source Code Repository)

Toàn bộ mã nguồn của dự án được quản lý trên GitHub:

- **Repository:** `https://github.com/[username]/IoT_Vehicle_Tracking_System`
- **Branch chính:** `main` (production-ready code)
- **Branch phát triển:** `feature/coding` (development branch)
- **License:** [...] (cần xác định trước khi công khai)

**Cấu trúc thư mục chính:**

```
IoT_Vehicle_Tracking_System/
├── iot-vehicle-tracking-system/
│   ├── Tracking_Backend/          # Express + TypeScript API
│   ├── Tracking_Frontend/         # Next.js 15 Web App
│   ├── Tracking_MqttBridge/       # MQTT Bridge Service
│   ├── Tracking_PostgreSQL/       # PostgreSQL + init SQL
│   ├── Tracking_EMQX/            # EMQX MQTT Broker config
│   ├── Tracking_VictoriaMetrics/  # Time-series Database
│   ├── Tracking_VictoriaLogs/     # Logging Database
│   ├── Tracking_Grafana/          # Monitoring Dashboards
│   └── Tracking_NPM/             # Nginx Proxy Manager
├── resources/                     # Documentation
└── CLAUDE.md                      # Project overview
```

## 4.2. Tham chiếu cơ sở dữ liệu (Database Schema)

Schema PostgreSQL đầy đủ được lưu tại:

- **File:** `iot-vehicle-tracking-system/Tracking_PostgreSQL/init/` (các file SQL khởi tạo)
- **Tài liệu thiết kế:** `resources/cloud-coding-plan/10-database-postgresql.md`

**Các bảng chính trong PostgreSQL:**

| STT | Tên bảng | Mô tả | Quan hệ chính |
|-----|---------|-------|---------------|
| 1 | `users` | Tài khoản người dùng | 1:N với sessions, audit_logs |
| 2 | `sessions` | Phiên đăng nhập (token hash SHA-256) | N:1 với users |
| 3 | `vehicles` | Thông tin phương tiện | 1:1 với devices, 1:N với trips |
| 4 | `devices` | Thông tin thiết bị tracker | N:1 với vehicles |
| 5 | `customers` | Thông tin khách hàng | 1:N với trips |
| 6 | `trips` | Hành trình cho thuê | N:1 với vehicles, customers |
| 7 | `alerts` | Cảnh báo hệ thống | N:1 với vehicles, devices |
| 8 | `geofences` | Vùng địa lý (hàng rào ảo) | N:N với vehicles |
| 9 | `commands` | Lệnh điều khiển thiết bị | N:1 với devices |
| 10 | `audit_logs` | Nhật ký thao tác | N:1 với users |

**VictoriaMetrics metrics:**

| Metric name | Labels | Mô tả |
|-------------|--------|-------|
| `vehicle_location` | device_id, lat, lon, speed, heading | Vị trí GPS |
| `vehicle_obd2` | device_id, rpm, speed, coolant_temp, fuel_level | Dữ liệu OBD2 |
| `vehicle_imu` | device_id, accel_x, accel_y, accel_z | Dữ liệu gia tốc |
| `device_status` | device_id, battery_voltage, signal_strength | Trạng thái thiết bị |

## 4.3. Tài liệu API (API Documentation)

Tài liệu API đầy đủ được tạo tự động bằng Swagger/OpenAPI và có thể truy cập tại:

- **URL (development):** `http://localhost:3000/api-docs`
- **Tài liệu thiết kế:** `resources/cloud-coding-plan/21-backend-api-endpoints.md`

**Tổng hợp API endpoints chính:**

| Nhóm | Method | Endpoint | Mô tả |
|------|--------|----------|-------|
| Auth | POST | `/api/v1/auth/login` | Đăng nhập |
| Auth | POST | `/api/v1/auth/logout` | Đăng xuất |
| Auth | GET | `/api/v1/auth/me` | Thông tin người dùng hiện tại |
| Vehicles | GET | `/api/v1/vehicles` | Danh sách phương tiện |
| Vehicles | POST | `/api/v1/vehicles` | Thêm phương tiện |
| Vehicles | GET | `/api/v1/vehicles/:id` | Chi tiết phương tiện |
| Devices | GET | `/api/v1/devices` | Danh sách thiết bị |
| Devices | POST | `/api/v1/devices` | Đăng ký thiết bị mới |
| Telemetry | GET | `/api/v1/telemetry/:deviceId` | Dữ liệu telemetry |
| Alerts | GET | `/api/v1/alerts` | Danh sách cảnh báo |
| Alerts | PUT | `/api/v1/alerts/:id/acknowledge` | Xác nhận cảnh báo |
| Geofences | GET | `/api/v1/geofences` | Danh sách geofences |
| Geofences | POST | `/api/v1/geofences` | Tạo geofence mới |
| Commands | POST | `/api/v1/commands` | Gửi lệnh đến thiết bị |
| Trips | GET | `/api/v1/trips` | Danh sách hành trình |
| Customers | GET | `/api/v1/customers` | Danh sách khách hàng |

## 4.4. Tài liệu cấu hình môi trường (Environment Configuration)

Mỗi dịch vụ yêu cầu file `.env` riêng. Mẫu cấu hình (`.env.example`) có sẵn trong mỗi thư mục dịch vụ.

**Các biến môi trường quan trọng:**

| Biến | Dịch vụ | Mô tả | Bắt buộc |
|------|---------|-------|----------|
| `POSTGRESQL_HOST` | Backend | Địa chỉ PostgreSQL server | Có |
| `POSTGRESQL_PORT` | Backend | Cổng PostgreSQL (mặc định: 5432) | Có |
| `POSTGRESQL_DATABASE` | Backend | Tên cơ sở dữ liệu | Có |
| `POSTGRESQL_USER` | Backend | Tên đăng nhập PostgreSQL | Có |
| `POSTGRESQL_PASSWORD` | Backend | Mật khẩu PostgreSQL | Có |
| `VICTORIAMETRICS_URL` | MqttBridge | URL VictoriaMetrics | Có |
| `VICTORIALOGS_URL` | MqttBridge | URL VictoriaLogs | Có |
| `MQTT_BROKER_URL` | Backend, MqttBridge | URL EMQX broker | Có |
| `SESSION_SECRET` | Backend | Khóa bí mật cho session (min 32 ký tự) | Có |
| `CORS_ORIGIN` | Backend | URL frontend cho CORS | Có |

> **Lưu ý bảo mật:** Tất cả mật khẩu và secret keys là BẮT BUỘC, không có giá trị mặc định. Hệ thống sẽ từ chối khởi động nếu thiếu bất kỳ biến nào.

## 4.5. Hướng dẫn cài đặt và chạy hệ thống

**Yêu cầu hệ thống:**

| Yêu cầu | Phiên bản tối thiểu |
|---------|---------------------|
| Node.js | 20.x LTS |
| Docker | 24.x |
| Docker Compose | 2.x |
| Git | 2.x |
| npm | 10.x |

**Các bước cài đặt:**

```bash
# 1. Clone repository
git clone https://github.com/[username]/IoT_Vehicle_Tracking_System.git
cd IoT_Vehicle_Tracking_System

# 2. Tạo Docker network
docker network create tracking-network

# 3. Khởi động infrastructure services
cd iot-vehicle-tracking-system/Tracking_PostgreSQL && docker-compose up -d
cd ../Tracking_EMQX && docker-compose up -d
cd ../Tracking_VictoriaMetrics && docker-compose up -d
cd ../Tracking_VictoriaLogs && docker-compose up -d

# 4. Cấu hình .env cho Backend
cd ../Tracking_Backend
cp .env.example .env
# Chỉnh sửa .env với các giá trị phù hợp

# 5. Cài đặt và chạy Backend
npm install
npm run dev

# 6. Cấu hình và chạy Frontend
cd ../Tracking_Frontend
cp .env.example .env
npm install
npm run dev

# 7. Chạy MQTT Bridge
cd ../Tracking_MqttBridge
cp .env.example .env
npm install
npm run dev
```

**Truy cập hệ thống:**

| Dịch vụ | URL | Tài khoản mặc định |
|---------|-----|---------------------|
| Frontend Web | http://localhost:3002 | admin / Admin@2026 |
| Backend API | http://localhost:3000 | -- |
| Swagger Docs | http://localhost:3000/api-docs | -- |
| EMQX Dashboard | http://localhost:18083 | admin / emqx_dev_2026 |
| Grafana | http://localhost:3001 | admin / admin |
| VictoriaMetrics | http://localhost:8428 | -- |

---

<!-- Kết thúc Phụ lục. -->
