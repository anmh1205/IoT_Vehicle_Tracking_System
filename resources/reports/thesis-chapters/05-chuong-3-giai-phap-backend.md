### 3.1.3. Phân tích và lựa chọn kiến trúc Cloud

#### 3.1.3.1. Đặt vấn đề cho kiến trúc Cloud

Hệ thống Backend/Cloud là tầng điều phối trung tâm của toàn bộ giải pháp IoT. Vì vậy, thiết kế cần đồng thời giải quyết các bài toán kỹ thuật sau:

- **Tiếp nhận dữ liệu liên tục từ nhiều thiết bị**: telemetry gửi theo chu kỳ ngắn, có thể xuất hiện burst khi thiết bị reconnect.
- **Cập nhật thời gian thực cho dashboard**: dữ liệu vị trí/trạng thái cần phản ánh gần như tức thời cho người vận hành.
- **Lưu trữ dữ liệu hỗn hợp**: vừa có dữ liệu chuỗi thời gian (GPS, OBD2), vừa có dữ liệu quan hệ nghiệp vụ (xe, người dùng, cảnh báo, geofence).
- **Chi phí và năng lực vận hành phù hợp đồ án**: ưu tiên self-hosted, dễ triển khai, dễ mở rộng theo từng dịch vụ.

#### 3.1.3.2. So sánh các phương án kiến trúc Cloud

[Bảng 3.15A: So sánh các phương án kiến trúc Cloud]

| Phương án | Mô tả ngắn | Ưu điểm | Hạn chế | Mức phù hợp |
| --------- | ---------- | ------- | ------- | ----------- |
| **PA-A: Monolithic REST + 1 DB** | Thiết bị gửi HTTP trực tiếp vào API server, lưu chung một cơ sở dữ liệu | Triển khai ban đầu đơn giản | Không tối ưu cho telemetry tần suất cao, khó mở rộng realtime, tải dồn lên API | Trung bình |
| **PA-B: Managed Cloud Native** | AWS IoT Core/Lambda + dịch vụ DB managed | Khả năng mở rộng cao, nhiều dịch vụ sẵn có | Chi phí vận hành cao, phụ thuộc nhà cung cấp, độ phức tạp hạ tầng vượt phạm vi đồ án | Trung bình |
| **PA-C: Event-driven self-hosted** | MQTT Broker + MQTT Bridge + dual database + API/WebSocket | Phù hợp IoT realtime, tách tải tốt, mở rộng theo dịch vụ, chi phí tự chủ | Cần chuẩn hóa message flow và quản lý nhiều dịch vụ Docker | **Cao (Đã chọn)** |

#### 3.1.3.3. Chọn giải pháp kiến trúc Cloud

Đồ án chọn **PA-C: kiến trúc phân tầng kết hợp hướng sự kiện (event-driven)** với chuỗi xử lý:

`Device -> EMQX -> MQTT Bridge -> PostgreSQL/VictoriaMetrics/VictoriaLogs -> Backend API -> Frontend`

Lý do lựa chọn:

- **Khớp bản chất dữ liệu IoT**: MQTT xử lý tốt mô hình pub/sub, giảm coupling giữa thiết bị và tầng ứng dụng.
- **Tối ưu hiệu năng theo vai trò**: Bridge xử lý ingestion, API tập trung nghiệp vụ, database tách theo loại dữ liệu.
- **Dễ scale theo chiều ngang**: có thể nhân bản riêng broker/bridge/api khi số thiết bị tăng.
- **Phù hợp chi phí và phạm vi thực hiện**: self-hosted qua Docker Compose, không phụ thuộc nền tảng cloud thương mại.

### 3.2.3. Giải pháp Backend & Cloud

Phần này trình bày chi tiết giải pháp thiết kế và triển khai hệ thống Backend/Cloud theo phương án đã lựa chọn ở mục 3.1.3.

#### 3.2.3.1. Kiến trúc tổng quan hệ thống Cloud (Cloud Architecture Overview)

##### a) Mô hình kiến trúc tổng thể

Hệ thống Cloud áp dụng kiến trúc phân tầng (layered architecture) kết hợp kiến trúc hướng sự kiện (event-driven architecture) để xử lý luồng dữ liệu IoT liên tục từ nhiều thiết bị đồng thời. Kiến trúc tổng thể gồm các tầng chính sau:

- **Tầng thu thập dữ liệu (Data Ingestion Layer)**: Tiếp nhận dữ liệu từ các thiết bị IoT thông qua giao thức MQTT, xử lý và phân phối đến các thành phần lưu trữ.
- **Tầng lưu trữ dữ liệu (Data Storage Layer)**: Sử dụng chiến lược lưu trữ kép (dual database strategy) với cơ sở dữ liệu quan hệ và cơ sở dữ liệu chuỗi thời gian.
- **Tầng xử lý nghiệp vụ (Business Logic Layer)**: API Server xử lý các yêu cầu từ Frontend, thực thi logic nghiệp vụ và quản lý trạng thái hệ thống.
- **Tầng giao tiếp thời gian thực (Real-time Communication Layer)**: Cung cấp dữ liệu cập nhật trực tiếp đến người dùng thông qua giao thức WebSocket.

![Hình 3.12 - Sơ đồ kiến trúc tổng quan hệ thống Cloud](./assets/figures/05-chuong-3-giai-phap-backend-hinh-3–12.png)

*Hình 3.12: Sơ đồ kiến trúc tổng quan hệ thống Cloud*

> Nguồn: Hình vẽ của tác giả

```
Thiết bị IoT (ESP32 + GPS + OBD2)
         |
         | MQTT (Port 1883)
         v
    EMQX Broker ──────── ACL per device
         |
         v
   Tracking_MqttBridge (Node.js standalone)
         |
    ┌────┴─────────────────────┐
    |            |              |
    v            v              v
PostgreSQL   VictoriaMetrics  VictoriaLogs
(Relational) (Time-Series)   (Event Logs)
    |
    v
  Tracking_Backend (Express.js API - Port 3000)
         |
         | WebSocket (Socket.IO)
         v
  Tracking_Frontend (Next.js - Port 3002)
```

##### b) Luồng dữ liệu chính trong hệ thống

Luồng dữ liệu chính của hệ thống được tổ chức theo trình tự sau:

1. **Thiết bị IoT** gửi dữ liệu telemetry (vị trí GPS, dữ liệu OBD2, trạng thái pin, dữ liệu cảm biến gia tốc) lên EMQX Broker thông qua giao thức MQTT 5.0 theo topic có cấu trúc `v1/{device_id}/rawdata`.
2. **EMQX Broker** tiếp nhận và phân phối message đến các subscriber. Rules Engine của EMQX thực hiện lọc và phát hiện cảnh báo tại tầng broker.
3. **MQTT Bridge** (dịch vụ Node.js độc lập) subscribe các topic từ EMQX, xác thực dữ liệu đầu vào bằng Zod schema, sau đó thực hiện ghi kép (dual write):
   - Ghi dữ liệu chuỗi thời gian vào **VictoriaMetrics** (vị trí, tốc độ, OBD2 metrics).
   - Ghi nhật ký sự kiện vào **VictoriaLogs** (kết nối/ngắt kết nối, lỗi, sự kiện MQTT).
   - Cập nhật trạng thái thiết bị vào **PostgreSQL** (trạng thái trực tuyến, phiên làm việc).
   - Phát sự kiện đến **Socket.IO** để cập nhật thời gian thực cho Dashboard.
4. **API Server** (Express.js) cung cấp REST API cho Frontend, truy vấn dữ liệu từ PostgreSQL và VictoriaMetrics, đồng thời gửi lệnh điều khiển ngược về thiết bị thông qua EMQX.
5. **Frontend** (Next.js) nhận dữ liệu cập nhật thời gian thực qua Socket.IO và dữ liệu lịch sử qua REST API.

##### c) Mô hình triển khai Docker

Hệ thống áp dụng mô hình triển khai per-service Docker Compose theo chuẩn IVM26 Pattern. Mỗi dịch vụ có file `docker-compose.yml` riêng biệt, tất cả chia sẻ mạng Docker chung `tracking-network` (external network). Mô hình này mang lại các ưu điểm:

- **Độc lập khi triển khai**: Mỗi dịch vụ có thể khởi động, dừng hoặc cập nhật độc lập mà không ảnh hưởng đến các dịch vụ khác.
- **Quản lý tài nguyên riêng**: Mỗi container được giới hạn CPU và RAM cụ thể (ví dụ: Backend 512MB/1 CPU, MQTT Bridge 256MB/0.5 CPU).
- **Dễ dàng mở rộng**: Có thể nhân bản (scale) từng dịch vụ riêng lẻ theo nhu cầu.

[Bảng 3.16: Phân bổ tài nguyên Docker cho các dịch vụ]

| Dịch vụ                  | Container                | Port        | Tài nguyên     |
| ------------------------ | ------------------------ | ----------- | -------------- |
| Tracking_Backend         | tracking-backend         | 3000        | 512MB, 1 CPU   |
| Tracking_Frontend        | tracking-frontend        | 3002        | 256MB, 0.5 CPU |
| Tracking_MqttBridge      | tracking-mqtt-bridge     | -           | 256MB, 0.5 CPU |
| Tracking_PostgreSQL      | tracking-postgresql      | 5432        | 512MB, 1 CPU   |
| Tracking_EMQX            | tracking-emqx            | 1883, 18083 | 512MB, 1 CPU   |
| Tracking_VictoriaMetrics | tracking-victoriametrics | 8428        | 256MB, 0.5 CPU |
| Tracking_VictoriaLogs    | tracking-victorialogs    | 9428        | 256MB, 0.5 CPU |
| Tracking_Grafana         | tracking-grafana         | 3001        | 256MB, 0.5 CPU |

#### 3.2.3.2. MQTT Broker - EMQX (Message Broker Selection & Configuration)

##### a) Vai trò của MQTT Broker

MQTT Broker là thành phần middleware trung tâm trong kiến trúc IoT, chịu trách nhiệm tiếp nhận message từ các publisher (thiết bị tracker) và phân phối đến các subscriber (MQTT Bridge, Backend). Broker hoạt động theo mô hình **Publish-Subscribe (Pub/Sub)**, qua đó cho phép giao tiếp bất đồng bộ giữa các thành phần mà không cần biết địa chỉ cụ thể của nhau.

Trong hệ thống theo dõi phương tiện, MQTT Broker xử lý luồng dữ liệu liên tục từ hàng chục đến hàng trăm thiết bị tracker, mỗi thiết bị gửi dữ liệu vị trí và telemetry với tần suất từ 1 đến 60 giây tùy chế độ hoạt động.

##### b) So sánh và lựa chọn MQTT Broker

Để lựa chọn MQTT Broker phù hợp, đồ án đã đánh giá bốn giải pháp phổ biến trên thị trường:

[Bảng 3.17: So sánh các MQTT Broker phổ biến]

| Tiêu chí                | Mosquitto | EMQX             | HiveMQ       | VerneMQ          |
| ----------------------- | --------- | ---------------- | ------------ | ---------------- |
| **Kết nối đồng thời**   | ~1.000    | ~100.000.000     | ~200.000.000 | ~10.000.000      |
| **Thông lượng message** | 40K msg/s | 100K msg/s       | 200K msg/s   | 50K msg/s        |
| **Độ trễ (Latency)**    | 0,25 ms   | 0,27 ms          | <1 ms        | 2,1 ms           |
| **Sử dụng CPU**         | Rất thấp  | Thấp (2%)        | Thấp         | Cao (10%)        |
| **Sử dụng RAM**         | 254 MB    | 495 MB           | Trung bình   | 1,2 GB           |
| **Hỗ trợ Clustering**   | Không     | Có (20+ node)    | Có           | Có               |
| **Khả dụng cao (HA)**   | Không     | Có               | Có           | Có               |
| **Độ phức tạp cài đặt** | Rất dễ    | Trung bình       | Khó          | Trung bình       |
| **Chi phí**             | Miễn phí  | Miễn phí/Trả phí | Trả phí      | Miễn phí/Trả phí |
| **Cộng đồng**           | Lớn       | Lớn              | Trung bình   | Nhỏ              |

**Kết luận lựa chọn: EMQX Single Node**

EMQX được lựa chọn làm MQTT Broker cho hệ thống với các lý do chính:

- **Hiệu năng vượt trội**: Hỗ trợ 100K message/giây với độ trễ chỉ 0,27ms, đủ đáp ứng nhu cầu của hệ thống IoT quy mô vừa và lớn.
- **Khả năng mở rộng**: Hỗ trợ clustering lên đến 20+ node, cho phép mở rộng hệ thống trong tương lai mà không cần thay đổi kiến trúc.
- **Rules Engine tích hợp**: Có khả năng xử lý, lọc và chuyển đổi MQTT message ngay tại tầng broker bằng ngôn ngữ giống SQL, giảm tải cho tầng ứng dụng.
- **Miễn phí và cộng đồng lớn**: Phiên bản Community cung cấp đầy đủ tính năng cần thiết cho đồ án, có cộng đồng hỗ trợ tích cực.
- **Dashboard quản lý**: Cung cấp giao diện web quản lý tại port 18083, hỗ trợ giám sát kết nối, topic và message theo thời gian thực.

##### c) Cấu hình EMQX Rules Engine

EMQX Rules Engine là SQL-based data processing engine, cho phép xử lý, lọc và chuyển đổi MQTT message ngay tại broker. Hệ thống dùng Rules Engine để phát hiện các sự kiện quan trọng mà không cần chuyển toàn bộ dữ liệu về tầng ứng dụng.

**Các rule chính được cấu hình:**

**Rule 1 - Phát hiện di chuyển bất thường (Motion Detection):**

```sql
SELECT
  clientid as device_id,
  payload.vehicle_id as vehicle_id,
  payload.location.lat as latitude,
  payload.location.lon as longitude,
  now() as timestamp
FROM "vehicle/+/alerts"
WHERE payload.alert_type = 'motion_detected'
```

**Rule 2 - Cảnh báo vượt tốc độ (Speeding Alert):**

```sql
SELECT
  clientid as device_id,
  payload.vehicle_id as vehicle_id,
  payload.location.speed as speed,
  payload.location.lat as latitude,
  payload.location.lon as longitude,
  now() as timestamp
FROM "vehicle/+/telemetry"
WHERE payload.location.speed > 100
```

**Rule 3 - Cảnh báo pin thấp (Low Battery Alert):**

```sql
SELECT
  clientid as device_id,
  payload.vehicle_id as vehicle_id,
  payload.power.backup_battery as backup_battery,
  now() as timestamp
FROM "vehicle/+/telemetry"
WHERE payload.power.backup_battery < 3.5
```

**Luồng xử lý cảnh báo:**

```
MQTT Message --> Rules Engine --> Tạo Alert/Violation --> Lưu PostgreSQL
                                        |
                                Gửi thông báo
                                   |         |
                             Telegram Bot   Email
```

Ngoài ra, hệ thống còn cấu hình các rule cho phát hiện vi phạm vùng địa lý (geofence violation) và cảnh báo thiết bị mất kết nối (device offline) khi thiết bị không gửi dữ liệu trong khoảng thời gian định trước.

#### 3.2.3.3. Thiết kế cơ sở dữ liệu (Database Architecture Design)

**Đặt vấn đề lưu trữ:** Dữ liệu hệ thống có hai đặc tính trái ngược: telemetry ghi rất nhanh theo thời gian thực và dữ liệu nghiệp vụ yêu cầu toàn vẹn quan hệ dài hạn. Một mô hình lưu trữ duy nhất thường tối ưu tốt cho một phía nhưng kém hiệu quả ở phía còn lại.

[Bảng 3.18A: So sánh các phương án kiến trúc lưu trữ dữ liệu]

| Phương án | Mô tả | Ưu điểm | Hạn chế | Mức phù hợp |
| --------- | ----- | ------- | ------- | ----------- |
| **PA-DB1: PostgreSQL duy nhất** | Dùng PostgreSQL cho cả nghiệp vụ và telemetry | Đơn giản vận hành | Ghi telemetry lớn dễ ảnh hưởng truy vấn nghiệp vụ, chi phí index/partition cao | Trung bình |
| **PA-DB2: Time-series DB duy nhất** | Dùng CSDL chuỗi thời gian cho mọi loại dữ liệu | Tối ưu ghi dữ liệu cảm biến | Kém phù hợp dữ liệu quan hệ phức tạp, khó đảm bảo ràng buộc nghiệp vụ | Thấp |
| **PA-DB3: Hybrid DB (Đã chọn)** | PostgreSQL + VictoriaMetrics + VictoriaLogs | Mỗi loại dữ liệu dùng đúng công cụ, cân bằng hiệu năng và khả năng truy vấn | Tăng số thành phần cần vận hành | **Cao** |

**Kết luận lựa chọn:** Chọn **PA-DB3 (hybrid database)** để tách trách nhiệm dữ liệu, giữ ổn định cho nghiệp vụ và tối ưu luồng telemetry theo thời gian thực.

##### a) Chiến lược lưu trữ kép (Dual Database Strategy)

Hệ thống theo dõi phương tiện cần lưu trữ hai loại dữ liệu có đặc tính khác nhau căn bản:

1. **Dữ liệu thô (Raw Telemetry Data)**: Bao gồm vị trí GPS, tốc độ, mức pin, dữ liệu OBD2, dữ liệu cảm biến gia tốc. Loại dữ liệu này có tần suất ghi rất cao (mỗi giây khi xe đang di chuyển), khối lượng lớn, nhưng chỉ cần lưu trữ trong thời gian ngắn (7–30 ngày) và chủ yếu phục vụ truy vấn theo chuỗi thời gian.

2. **Dữ liệu nghiệp vụ (Business Data)**: Bao gồm thông tin xe, khách hàng, chuyến đi, cảnh báo, vi phạm, lệnh điều khiển. Loại dữ liệu này có tần suất ghi thấp, khối lượng nhỏ, nhưng cần lưu trữ lâu dài (6–12 tháng trở lên) và yêu cầu tính toàn vẹn dữ liệu quan hệ (ACID).

Do sự khác biệt cơ bản về đặc tính, hệ thống áp dụng chiến lược lưu trữ kép sử dụng ba cơ sở dữ liệu chuyên biệt:

![Hình 3.13 - Sơ đồ chiến lược lưu trữ kép](./assets/figures/05-chuong-3-giai-phap-backend-hinh-3–13.png)

*Hình 3.13: Sơ đồ chiến lược lưu trữ kép*

> Nguồn: Hình vẽ của tác giả

```
               MQTT Bridge
                   |
    ┌──────────────┼──────────────┬──────────────┐
    |              |              |              |
    v              v              v              v
PostgreSQL    VictoriaMetrics  VictoriaLogs
(Quan hệ)     (Chuỗi thời gian) (Nhật ký)
|             |                |
| Vehicles    | Vị trí GPS     | Sự kiện thiết bị
| Customers   | Tốc độ         | Nhật ký lỗi
| Trips       | Mức pin        | Phiên làm việc
| Alerts      | OBD2 metrics   | Message MQTT
| Violations  | Dữ liệu IMU   | Nhật ký kiểm toán
| Commands    |                |
| Geofences   | Lưu trữ: 30d  | Lưu trữ: 7d
```

[Bảng 3.18: So sánh các cơ sở dữ liệu trong hệ thống]

| Cơ sở dữ liệu       | Mục đích                            | Ưu điểm chính                                        |
| ------------------- | ----------------------------------- | ---------------------------------------------------- |
| **PostgreSQL 16**   | Dữ liệu quan hệ (nghiệp vụ)         | ACID, relationships, truy vấn phức tạp               |
| **VictoriaMetrics** | Dữ liệu chuỗi thời gian (telemetry) | Nhanh gấp 10 lần InfluxDB, PromQL, tiêu thụ RAM thấp |
| **VictoriaLogs**    | Nhật ký tập trung (logging)         | Tìm kiếm nhanh, lưu trữ nhỏ gọn, LogsQL              |

##### b) Cơ sở dữ liệu PostgreSQL - Schema quan hệ

PostgreSQL 16 lưu trữ toàn bộ dữ liệu nghiệp vụ của hệ thống. Schema được chuẩn hóa đến dạng chuẩn thứ ba (3NF) và hỗ trợ soft delete cho các bảng quan trọng.

**Các nhóm bảng chính (Phase 1 - khoảng 20 bảng):**

[Bảng 3.19: Các nhóm bảng chính trong PostgreSQL]

| Nhóm bảng                  | Các bảng chính                           | Mô tả                                   |
| -------------------------- | ---------------------------------------- | --------------------------------------- |
| **Người dùng & Xác thực**  | users, user_sessions                     | Quản lý tài khoản, phiên đăng nhập      |
| **Phương tiện & Thiết bị** | vehicles, devices, device_configurations | Thông tin xe và thiết bị tracker        |
| **Khách hàng**             | customers                                | Thông tin khách hàng thuê xe            |
| **Chuyến đi**              | trips, trip_events, stops                | Hành trình, sự kiện và điểm dừng        |
| **Cảnh báo & Vi phạm**     | alerts, violations                       | Cảnh báo hệ thống và vi phạm giao thông |
| **Vùng địa lý**            | geofences, vehicle_geofences             | Vùng địa lý và gán kết với xe           |
| **Lệnh điều khiển**        | commands                                 | Lệnh gửi đến thiết bị                   |
| **Bảo trì**                | maintenance_records                      | Lịch sử bảo trì phương tiện             |
| **Nhật ký**                | connection_logs, device_status_history   | Nhật ký kết nối và lịch sử trạng thái   |
| **Thông báo**              | notifications                            | Thông báo hệ thống                      |
| **Nhiên liệu**             | fuel_records                             | Quản lý nhiên liệu                      |

**Sơ đồ quan hệ chính (ER Diagram - rút gọn):**

![Hình 3.14 - Sơ đồ quan hệ cơ sở dữ liệu (ER Diagram)](./assets/figures/05-chuong-3-giai-phap-backend-hinh-3–14.png)

*Hình 3.14: Sơ đồ quan hệ cơ sở dữ liệu (ER Diagram)*

> Nguồn: Hình vẽ của tác giả (sử dụng công cụ dbdiagram.io)

```
users (1) ──< (N) vehicles           [Chủ sở hữu xe]
users (1) ──< (N) customers          [Người xác minh]
users (1) ──< (N) notifications      [Người nhận thông báo]
vehicles (1) ──< (1) devices         [Thiết bị gắn với xe]
vehicles (1) ──< (N) trips           [Chuyến đi của xe]
vehicles (1) ──< (N) alerts          [Cảnh báo của xe]
vehicles (1) ──< (N) maintenance_records [Bảo trì xe]
vehicles (N) ──< (N) geofences       [Liên kết qua vehicle_geofences]
customers (1) ──< (N) trips          [Chuyến đi của khách hàng]
trips (1) ──< (N) trip_events        [Sự kiện trong chuyến đi]
trips (1) ──< (N) stops              [Điểm dừng trong chuyến đi]
trips (1) ──< (N) violations         [Vi phạm trong chuyến đi]
devices (1) ──< (N) commands         [Lệnh gửi đến thiết bị]
devices (1) ──< (N) device_status_history [Lịch sử trạng thái]
devices (1) ──< (N) connection_logs  [Nhật ký kết nối]
```

Schema được thiết kế với khả năng mở rộng, các khóa ngoại và chỉ mục (index) đã được chuẩn bị sẵn để tích hợp thêm các bảng Phase 2 bao gồm: bookings (đặt xe), rental_contracts (hợp đồng thuê), payments (thanh toán), damage_reports (báo cáo hư hỏng) và reviews (đánh giá).

##### c) Cơ sở dữ liệu VictoriaMetrics - Schema chuỗi thời gian

VictoriaMetrics là cơ sở dữ liệu chuỗi thời gian tương thích Prometheus, được lựa chọn thay thế InfluxDB nhờ hiệu năng vượt trội (nhanh hơn 10 lần), mức tiêu thụ RAM thấp hơn và tích hợp tốt với Grafana.

[Bảng 3.20: So sánh VictoriaMetrics và InfluxDB]

| Tiêu chí                   | InfluxDB        | VictoriaMetrics (Đã chọn) |
| -------------------------- | --------------- | ------------------------- |
| **Ngôn ngữ truy vấn**      | Flux (phức tạp) | PromQL (đơn giản)         |
| **Hiệu năng**              | Tốt             | Nhanh gấp 10 lần          |
| **Sử dụng RAM**            | Cao             | Thấp                      |
| **Nén dữ liệu**            | Tốt             | Tốt hơn (gấp 10 lần)      |
| **Tương thích Prometheus** | Không           | Có                        |
| **Độ khó học**             | Cao (Flux)      | Thấp (PromQL)             |
| **Tích hợp Grafana**       | Qua plugin      | Hỗ trợ sẵn (Native)       |

**Chính sách lưu trữ (Retention Policy):** Dữ liệu thô được lưu trữ trong 30 ngày (`-retentionPeriod=30d`). Hệ thống hỗ trợ cấu hình downsampling thông qua vmagent với recording rules để tạo dữ liệu tổng hợp theo giờ/ngày, phục vụ báo cáo dài hạn mà không tốn dung lượng lưu trữ lớn.

##### d) VictoriaLogs - Cơ sở dữ liệu nhật ký

VictoriaLogs được sử dụng làm hệ thống nhật ký tập trung (centralized logging), thay thế bộ công cụ ELK Stack truyền thống với ưu điểm nhẹ hơn và dễ triển khai. VictoriaLogs lưu trữ các loại nhật ký: sự kiện thiết bị, nhật ký lỗi, phiên làm việc, message MQTT, và nhật ký kiểm toán (audit trail). Chính sách lưu trữ: 7 ngày cho nhật ký thông thường.

#### 3.2.3.4. API Server và kiến trúc phần mềm (API Server & Software Architecture)

##### a) Lựa chọn công nghệ

API Server là tầng ứng dụng Backend cung cấp REST API, WebSocket và xử lý logic nghiệp vụ. Để lựa chọn framework phù hợp, đồ án đã đánh giá ba phương án:

[Bảng 3.21: So sánh framework Backend]

| Tiêu chí                         | Express + TypeScript | NestJS     | Go + Gin   |
| -------------------------------- | -------------------- | ---------- | ---------- |
| **Độ khó học**                   | Rất dễ               | Trung bình | Khó        |
| **Linh hoạt**                    | Rất cao              | Trung bình | Cao        |
| **Hiệu năng**                    | Cao                  | Cao        | Rất cao    |
| **Lượng code mẫu (Boilerplate)** | Ít                   | Nhiều      | Trung bình |
| **Hệ sinh thái IoT**             | Rất tốt              | Tốt        | Tốt        |
| **Hỗ trợ thời gian thực**        | Rất tốt              | Rất tốt    | Tốt        |

**Kết luận lựa chọn: Node.js + Express + TypeScript**

Lý do lựa chọn gồm: tính linh hoạt cao; đặc tính nhẹ và nhanh phù hợp với IoT; TypeScript giúp bảo đảm an toàn kiểu dữ liệu; Zod kết hợp xác thực runtime với type inference; và khả năng tổ chức code theo Domain-Driven Design.

##### b) Kiến trúc Domain-Driven Design (DDD)

API Server được tổ chức theo kiến trúc Domain-Driven Design với ba tầng rõ ràng:

**Tầng 1 - API Layer (Routes):** Định nghĩa các route, ánh xạ HTTP method đến controller tương ứng.

**Tầng 2 - Service Layer (Business Logic):** Chứa toàn bộ logic nghiệp vụ, điều phối giữa các repository và dịch vụ bên ngoài.

**Tầng 3 - Repository Layer (Data Access):** Truy cập cơ sở dữ liệu, thực hiện các truy vấn SQL và trả về dữ liệu đã được xác thực kiểu.

Hệ thống bao gồm hơn 20 domain module, mỗi module có cấu trúc `services/`, `repositories/`, `types/` riêng biệt, đảm bảo nguyên tắc Single Responsibility và dễ bảo trì.

##### c) MQTT Bridge - Dịch vụ độc lập

MQTT Bridge đã được tách thành dịch vụ Node.js hoàn toàn độc lập (`Tracking_MqttBridge/`) với `package.json`, `docker-compose.yml`, logger, connection pool và cấu hình riêng. Việc tách biệt này mang lại các ưu điểm: độc lập khi mở rộng, cách ly lỗi, và đơn giản hóa kiến trúc.

#### 3.2.3.5. Thiết kế API Endpoints (REST API Design)

##### a) Nguyên tắc thiết kế

API được thiết kế tuân thủ các nguyên tắc RESTful: URL dạng số nhiều, versioning (`/api/v1/`), phân trang, định dạng lỗi thống nhất, và HTTP Status Code chuẩn.

##### b) Bảng tóm tắt API Endpoints

[Bảng 3.22: Tóm tắt các nhóm API Endpoints chính]

| Nhóm               | Method | Endpoint                   | Mô tả                         | Auth  |
| ------------------ | ------ | -------------------------- | ----------------------------- | ----- |
| **Authentication** | POST   | /api/v1/auth/login         | Đăng nhập                     | Không |
|                    | GET    | /api/v1/auth/me            | Thông tin người dùng hiện tại | Có    |
|                    | POST   | /api/v1/auth/logout        | Đăng xuất                     | Có    |
| **Devices**        | GET    | /api/v1/device/list        | Danh sách thiết bị            | Có    |
|                    | POST   | /api/v1/device/manage      | Thêm thiết bị                 | Có    |
| **Vehicles**       | GET    | /api/v1/vehicles           | Danh sách xe                  | Có    |
|                    | POST   | /api/v1/vehicles           | Tạo xe mới                    | Có    |
| **IoT Data**       | POST   | /api/v1/iot/data           | Gửi dữ liệu cảm biến          | Không |
| **Telemetry**      | GET    | /api/v1/telemetry/location | Dữ liệu vị trí                | Có    |
| **Dashboard**      | GET    | /api/v1/dashboard/stats    | Thống kê tổng quan            | Có    |
| **Firmware**       | POST   | /api/v1/firmware/upload    | Tải lên firmware              | Có    |

Ngoài ra, hệ thống còn cung cấp các nhóm API cho customers, trips, alerts, geofences, maintenance, export, fuel-analytics, statistics, notifications và system-admin.

#### 3.2.3.6. WebSocket và truyền dữ liệu thời gian thực (Real-time Communication)

Hệ thống sử dụng **Socket.IO 4.8** làm giải pháp truyền dữ liệu thời gian thực từ Backend đến Frontend. Hệ thống định nghĩa 7 namespace, mỗi namespace phục vụ một nhóm chức năng cụ thể: `/dashboard`, `/devices`, `/firmware`, `/exports`, `/notifications`, `/mobile`, và `/iot`.

Frontend sử dụng chiến lược kết hợp thông minh giữa WebSocket và REST API: khi WebSocket kết nối, TanStack Query tắt chế độ polling; khi WebSocket mất kết nối, TanStack Query bật polling tự động (30s).

#### 3.2.3.7. Bảo mật hệ thống (Security Design)

##### a) Xác thực Session-based (Không dùng JWT)

Hệ thống sử dụng cơ chế xác thực dựa trên phiên làm việc (session-based authentication) với token lưu trữ trong cơ sở dữ liệu, thay vì JSON Web Token (JWT).

[Bảng 3.23: So sánh JWT và Session-based authentication]

| Tiêu chí            | JWT                                | Session-based (Đã chọn)             |
| ------------------- | ---------------------------------- | ----------------------------------- |
| **Thu hồi token**   | Khó (cần blacklist)                | Dễ (xóa khỏi DB)                    |
| **Kiểm soát phiên** | Hạn chế                            | Toàn quyền (xem, thu hồi mọi phiên) |
| **Bảo mật**         | Token chứa thông tin nhạy cảm      | Chỉ chứa ID ngẫu nhiên              |
| **Kích thước**      | Lớn (header + payload + signature) | Nhỏ (chỉ token ID)                  |

##### b) Bảo mật tầng truyền tải

Helmet (security headers), CORS (giới hạn origin), Rate Limiting (giới hạn request/IP), và Request-ID Correlation (UUID per request).

##### c) Bảo mật MQTT

ACL per device, Client ID duy nhất, và xác thực MQTT bằng username/password.

##### d) Hệ thống thông báo cảnh báo

Hệ thống hỗ trợ gửi thông báo qua Telegram Bot (thời gian thực) và Email SMTP (chi tiết). Các loại cảnh báo: xe di chuyển bất thường, vi phạm tốc độ, pin thấp, thiết bị mất kết nối, lịch bảo trì sắp đến.
