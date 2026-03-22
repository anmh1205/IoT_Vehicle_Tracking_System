# System Requirements

> Yêu cầu hệ thống cho dự án IoT

---

## 1. Functional Requirements

### 1.1 Device Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-D01 | Đăng ký thiết bị mới với device_id unique | Must |
| FR-D02 | Xem danh sách thiết bị với filter/search | Must |
| FR-D03 | Xem chi tiết thiết bị (thông tin, cấu hình) | Must |
| FR-D04 | Cập nhật cấu hình thiết bị | Must |
| FR-D05 | Xóa thiết bị | Should |
| FR-D06 | Theo dõi trạng thái online/offline | Must |
| FR-D07 | Gán thiết bị cho user cụ thể | Should |

### 1.2 Data Collection

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DC01 | Nhận dữ liệu sensor qua MQTT | Must |
| FR-DC02 | Lưu trữ time-series data | Must |
| FR-DC03 | Xác thực thiết bị trước khi nhận data | Must |
| FR-DC04 | Batch processing để tối ưu database | Should |
| FR-DC05 | Xử lý data validation | Must |

### 1.3 Real-time Features

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-RT01 | Hiển thị data real-time trên dashboard | Must |
| FR-RT02 | Cập nhật trạng thái thiết bị real-time | Must |
| FR-RT03 | Push notification khi có alert | Should |
| FR-RT04 | Live location tracking (nếu có GPS) | Could |

### 1.4 Analytics & Reporting

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-A01 | Xem lịch sử data theo time range | Must |
| FR-A02 | Biểu đồ thống kê (charts) | Must |
| FR-A03 | Export data ra Excel/CSV | Should |
| FR-A04 | Custom reports | Could |

### 1.5 User Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-U01 | Đăng nhập/đăng xuất | Must |
| FR-U02 | Phân quyền (admin/user) | Must |
| FR-U03 | Quản lý users (CRUD) | Should |
| FR-U04 | Giới hạn truy cập thiết bị theo user | Should |

### 1.6 Alerts & Notifications

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AL01 | Tạo alert khi sensor vượt ngưỡng | Must |
| FR-AL02 | Hiển thị alert trên dashboard | Must |
| FR-AL03 | Push notification (mobile) | Should |
| FR-AL04 | Alert history | Should |

### 1.7 OTA Firmware Update

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-FW01 | Upload firmware mới | Should |
| FR-FW02 | Gán firmware cho thiết bị | Should |
| FR-FW03 | Theo dõi trạng thái update | Should |

---

## 2. Non-Functional Requirements

### 2.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-P01 | API response time | < 200ms (p95) |
| NFR-P02 | Real-time latency | < 500ms |
| NFR-P03 | MQTT message throughput | 10,000 msg/s |
| NFR-P04 | Dashboard load time | < 3s |
| NFR-P05 | Concurrent WebSocket connections | 1,000+ |

### 2.2 Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-S01 | Number of devices | 10,000+ |
| NFR-S02 | Data points per day | 100M+ |
| NFR-S03 | Concurrent users | 500+ |
| NFR-S04 | Horizontal scaling | Supported |

### 2.3 Availability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-A01 | System uptime | 99.5% |
| NFR-A02 | Planned maintenance window | < 4h/month |
| NFR-A03 | Recovery Time Objective (RTO) | < 1h |
| NFR-A04 | Recovery Point Objective (RPO) | < 5min |

### 2.4 Security

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SEC01 | API authentication | JWT |
| NFR-SEC02 | Device authentication | Token-based |
| NFR-SEC03 | Data encryption in transit | TLS 1.3 |
| NFR-SEC04 | Password hashing | bcrypt/argon2 |
| NFR-SEC05 | Rate limiting | Yes |
| NFR-SEC06 | SQL injection prevention | Yes |
| NFR-SEC07 | XSS prevention | Yes |

### 2.5 Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-R01 | Data durability | 99.99% |
| NFR-R02 | Automatic reconnection (MQTT) | Yes |
| NFR-R03 | Message delivery guarantee | At least once |
| NFR-R04 | Graceful degradation | Yes |

### 2.6 Maintainability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-M01 | Code test coverage | > 70% |
| NFR-M02 | Documentation | Complete |
| NFR-M03 | Logging | Structured |
| NFR-M04 | Health checks | All services |

---

## 3. Constraints

### 3.1 Technical Constraints

| Constraint | Description |
|------------|-------------|
| Node.js | Version 20+ required |
| PostgreSQL | Version 16+ |
| Docker | Required for deployment |
| Browser support | Chrome 90+, Firefox 90+, Safari 15+ |

### 3.2 Business Constraints

| Constraint | Description |
|------------|-------------|
| Budget | Open source stack preferred |
| Timeline | MVP in 3 months |
| Team size | 2-5 developers |

### 3.3 Integration Constraints

| System | Protocol | Notes |
|--------|----------|-------|
| IoT Devices | MQTT 5.0 | Over WiFi/4G |
| Mobile App | REST + WebSocket | Flutter WebView |
| External APIs | REST | Optional integrations |

---

## 4. Assumptions

1. Thiết bị IoT có kết nối internet ổn định
2. Users truy cập qua modern browsers
3. Server có đủ resources cho dự kiến load
4. EMQX broker được quản lý riêng
5. SSL certificates được cung cấp sẵn

---

## 5. Dependencies

### External Services

| Service | Purpose | Required |
|---------|---------|----------|
| EMQX Cloud / Self-hosted | MQTT Broker | Yes |
| Docker Registry | Container images | Yes |
| Email Service | Notifications | Optional |
| Firebase | Push notifications | Optional |
| Map Provider | Location tracking | Optional |

### Third-party Libraries

| Library | Purpose | License |
|---------|---------|---------|
| Express.js | Web framework | MIT |
| Next.js | React framework | MIT |
| PostgreSQL | Database | PostgreSQL |
| VictoriaMetrics | Time-series | Apache 2.0 |
| Socket.IO | Real-time | MIT |
