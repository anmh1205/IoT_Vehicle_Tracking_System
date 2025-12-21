## PHẦN X: API SERVER (BACKEND APPLICATION)

### X.1 Vai Trò API Server

**API Server** là lớp ứng dụng backend cung cấp:

1. **REST API**: Giao tiếp với frontend (web/mobile)
2. **WebSocket**: Real-time updates (vị trí, cảnh báo)
3. **Business Logic**: Xử lý nghiệp vụ (quản lý xe, người dùng, cảnh báo)
4. **Authentication/Authorization**: Xác thực và phân quyền
5. **Database Integration**: Kết nối PostgreSQL và InfluxDB
6. **MQTT Integration**: Gửi commands đến trackers qua MQTT

**Kiến Trúc:**

```
Frontend (Web/Mobile)
    │
    ├─ REST API ──→ API Server ──→ PostgreSQL
    │                                    │
    └─ WebSocket ──→ API Server ──→ InfluxDB
                            │
                            └─ MQTT ──→ EMQX ──→ Trackers
```

### X.2 Lựa Chọn Công Nghệ

**So Sánh Ngắn Gọn:**

| Tiêu Chí             | Node.js + NestJS | Python + FastAPI  | Go + Gin/Echo |
| -------------------- | ---------------- | ----------------- | ------------- |
| **Learning Curve**   | ⭐⭐⭐⭐⭐ (Dễ)  | ⭐⭐⭐⭐⭐ (Dễ)   | ⭐⭐⭐ (Khó)  |
| **Ecosystem**        | ⭐⭐⭐⭐⭐ (npm) | ⭐⭐⭐⭐⭐ (PyPI) | ⭐⭐⭐⭐      |
| **Real-time**        | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐          | ⭐⭐⭐⭐      |
| **MQTT Support**     | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐⭐        | ⭐⭐⭐⭐      |
| **Phù Hợp Luận Văn** | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐          | ⭐⭐⭐        |

**Lựa Chọn: Node.js + NestJS**

**Lý Do:**

- ✅ **Dễ học**: TypeScript/JavaScript phổ biến, nhiều tài liệu
- ✅ **Ecosystem phong phú**: npm có sẵn thư viện cho MQTT, PostgreSQL, InfluxDB, WebSocket
- ✅ **NestJS**: Framework có cấu trúc rõ ràng, phù hợp dự án lớn
- ✅ **Real-time tốt**: Socket.io tích hợp dễ dàng
- ✅ **TypeScript**: Type safety, dễ maintain
- ✅ **Phù hợp IoT**: Nhiều dự án IoT dùng Node.js

**Tech Stack:**

```
- Runtime: Node.js 18+ (LTS)
- Framework: NestJS 10+
- Language: TypeScript
- Database ORM: TypeORM hoặc Prisma (PostgreSQL)
- InfluxDB Client: @influxdata/influxdb-client
- MQTT Client: mqtt.js hoặc @nestjs/mqtt
- WebSocket: @nestjs/websockets (Socket.io)
- Authentication: @nestjs/passport (JWT)
- Validation: class-validator
- API Docs: Swagger (@nestjs/swagger)
```

**Ưu Điểm:**

- Cấu trúc module rõ ràng (Controllers, Services, Modules)
- Dependency Injection built-in
- Decorators cho routing, validation
- Auto-generate API documentation
- Testing framework tích hợp

---

### X.3 Kiến Trúc API Server (NestJS)

**Cấu Trúc Thư Mục:**

```
api-server/
├── src/
│   ├── main.ts                 # Entry point
│   ├── app.module.ts           # Root module
│   │
│   ├── auth/                   # Authentication module
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   └── guards/
│   │
│   ├── vehicles/               # Vehicle management
│   │   ├── vehicles.controller.ts
│   │   ├── vehicles.service.ts
│   │   └── vehicles.entity.ts
│   │
│   ├── customers/              # Customer management
│   │   ├── customers.controller.ts
│   │   ├── customers.service.ts
│   │   └── customers.entity.ts
│   │
│   ├── bookings/               # Booking management
│   │   ├── bookings.controller.ts
│   │   ├── bookings.service.ts
│   │   └── bookings.entity.ts
│   │
│   ├── contracts/              # Rental contracts
│   │   ├── contracts.controller.ts
│   │   ├── contracts.service.ts
│   │   └── contracts.entity.ts
│   │
│   ├── payments/               # Payment processing
│   │   ├── payments.controller.ts
│   │   ├── payments.service.ts
│   │   └── payments.entity.ts
│   │
│   ├── damage-reports/         # Damage reports
│   │   ├── damage-reports.controller.ts
│   │   ├── damage-reports.service.ts
│   │   └── damage-reports.entity.ts
│   │
│   ├── reviews/                # Reviews & ratings
│   │   ├── reviews.controller.ts
│   │   ├── reviews.service.ts
│   │   └── reviews.entity.ts
│   │
│   ├── telemetry/              # Telemetry data
│   │   ├── telemetry.controller.ts
│   │   ├── telemetry.service.ts
│   │   └── dto/
│   │
│   ├── alerts/                 # Alert management
│   │   ├── alerts.controller.ts
│   │   ├── alerts.service.ts
│   │   └── alerts.gateway.ts   # WebSocket
│   │
│   ├── notifications/          # Notifications & Integrations
│   │   ├── notifications.module.ts
│   │   ├── notifications.service.ts
│   │   ├── telegram/
│   │   │   ├── telegram.service.ts
│   │   │   ├── telegram.controller.ts
│   │   │   └── telegram.commands.ts
│   │   ├── email/
│   │   │   ├── email.service.ts
│   │   │   └── templates/
│   │   └── dto/
│   │
│   ├── mqtt/                   # MQTT integration
│   │   ├── mqtt.module.ts
│   │   ├── mqtt.service.ts
│   │   └── mqtt.controller.ts
│   │
│   ├── database/               # Database config
│   │   ├── postgres.module.ts
│   │   ├── influxdb.module.ts
│   │   └── entities/
│   │
│   └── common/                 # Shared utilities
│       ├── filters/
│       ├── interceptors/
│       └── decorators/
│
├── test/                       # Unit tests
├── docker-compose.yml          # Local development
├── Dockerfile                  # Production build
└── package.json
```

**Các Module Chính:**

**Phase 1:**

1. **Auth Module**: JWT authentication, user management (admin/staff)
2. **Vehicles Module**: CRUD vehicles
3. **Customers Module**: CRUD customers, verification
4. **Trips Module**: Quản lý chuyến đi, theo dõi vị trí
5. **Telemetry Module**: Query location data từ InfluxDB
6. **Alerts Module**: Quản lý cảnh báo, WebSocket real-time
7. **Violations Module**: Quản lý vi phạm
8. **Notifications Module**: Telegram Bot + Email notifications
9. **MQTT Module**: Gửi commands đến trackers
10. **Database Module**: PostgreSQL + InfluxDB connections

**[Phase 2]:** 10. **Bookings Module**: Tạo/quản lý bookings, pickup/return workflow 11. **Contracts Module**: Tạo/ký hợp đồng thuê, document management 12. **Payments Module**: Xử lý thanh toán (deposit, rental fee, penalties) 13. **Damage Reports Module**: Báo cáo hư hỏng khi nhận/trả xe 14. **Reviews Module**: Quản lý đánh giá từ khách hàng 15. **Vehicles Module**: Thêm availability management 16. **Alerts Module**: Liên kết alerts với booking

### X.4 API Endpoints

**Chi tiết API endpoints được mô tả trong file:** [`part-05-api-endpoints.md`](./part-05-api-endpoints.md)

**Tóm tắt:**

**Authentication:**

```
POST   /api/auth/login          # Đăng nhập
POST   /api/auth/register       # Đăng ký
POST   /api/auth/refresh        # Refresh token
POST   /api/auth/logout         # Đăng xuất
```

**Vehicles:**

```
GET    /api/vehicles                    # Danh sách xe
GET    /api/vehicles/:id                # Chi tiết xe
POST   /api/vehicles                    # Thêm xe mới
PUT    /api/vehicles/:id                # Cập nhật xe
DELETE /api/vehicles/:id                # Xóa xe
GET    /api/vehicles/:id/status         # Trạng thái hiện tại
GET    /api/vehicles/:id/availability   # [Phase 2] Kiểm tra availability
```

**Customers:**

```
GET    /api/customers                   # Danh sách khách hàng
GET    /api/customers/:id               # Chi tiết khách hàng
POST   /api/customers                   # Thêm khách hàng mới
PUT    /api/customers/:id               # Cập nhật khách hàng
GET    /api/customers/:id/verify        # Xác minh khách hàng
GET    /api/customers/:id/rentals       # [Phase 2] Lịch sử thuê xe
```

**[Phase 2] Bookings:**

```
GET    /api/bookings                    # Danh sách đặt xe
GET    /api/bookings/:id                # Chi tiết đặt xe
POST   /api/bookings                    # Tạo đặt xe mới
PUT    /api/bookings/:id                # Cập nhật đặt xe
PUT    /api/bookings/:id/cancel         # Hủy đặt xe
GET    /api/bookings/:id/tracking       # Theo dõi xe trong thời gian thuê
POST   /api/bookings/:id/pickup         # Xác nhận nhận xe
POST   /api/bookings/:id/return         # Xác nhận trả xe
```

**[Phase 2] Rental Contracts:**

```
GET    /api/contracts                   # Danh sách hợp đồng
GET    /api/contracts/:id               # Chi tiết hợp đồng
POST   /api/contracts                   # Tạo hợp đồng mới
PUT    /api/contracts/:id/sign          # Ký hợp đồng
GET    /api/contracts/:id/document      # Tải file hợp đồng
```

**[Phase 2] Payments:**

```
GET    /api/payments                    # Danh sách thanh toán
GET    /api/payments/:id                # Chi tiết thanh toán
POST   /api/payments                    # Tạo thanh toán mới
PUT    /api/payments/:id/process        # Xử lý thanh toán
GET    /api/bookings/:id/payments       # Thanh toán của một booking
```

**[Phase 2] Damage Reports:**

```
GET    /api/damage-reports              # Danh sách báo cáo hư hỏng
GET    /api/damage-reports/:id          # Chi tiết báo cáo
POST   /api/damage-reports              # Tạo báo cáo mới
PUT    /api/damage-reports/:id          # Cập nhật báo cáo
PUT    /api/damage-reports/:id/inspect  # Xác nhận kiểm tra
```

**[Phase 2] Reviews:**

```
GET    /api/reviews                     # Danh sách đánh giá
GET    /api/reviews/:id                 # Chi tiết đánh giá
POST   /api/reviews                     # Tạo đánh giá mới
PUT    /api/reviews/:id/moderate        # Duyệt/từ chối đánh giá
GET    /api/vehicles/:id/reviews        # Đánh giá của một xe
```

**Telemetry:**

```
GET    /api/telemetry/location  # Lấy vị trí (query InfluxDB)
GET    /api/telemetry/history   # Lịch sử di chuyển
GET    /api/telemetry/realtime  # WebSocket real-time
```

**Alerts:**

```
GET    /api/alerts              # Danh sách cảnh báo
GET    /api/alerts/:id          # Chi tiết cảnh báo
PUT    /api/alerts/:id/ack      # Acknowledge cảnh báo
GET    /api/alerts/realtime     # WebSocket alerts
```

**Commands (MQTT):**

```
POST   /api/commands/:device_id # Gửi command đến tracker
```

### X.5 WebSocket Real-time Updates

**Connection:**

```typescript
// Client connects
ws://api.example.com/ws

// Subscribe to vehicle location
{
  "type": "subscribe",
  "topic": "vehicle/TRACKER_001/location"
}

// Receive updates
{
  "type": "location",
  "vehicle_id": "TRACKER_001",
  "data": {
    "lat": 22.123456,
    "lon": 105.123456,
    "speed": 60.0,
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### X.6 Database Integration

**PostgreSQL (TypeORM):**

```typescript
// vehicles.entity.ts
@Entity("vehicles")
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  vehicle_id: string;

  @Column()
  plate: string;

  @Column()
  device_id: string;

  @Column({ default: "active" })
  status: string;

  @CreateDateColumn()
  created_at: Date;
}
```

**InfluxDB:**

```typescript
// Query location data
const query = `
  from(bucket: "vehicle_telemetry")
    |> range(start: -1h)
    |> filter(fn: (r) => r["_measurement"] == "location")
    |> filter(fn: (r) => r["device_id"] == "TRACKER_001")
`;
```

### X.7 MQTT Integration

**Subscribe to EMQX:**

```typescript
// Subscribe to telemetry topics
mqttClient.subscribe("vehicle/+/telemetry");
mqttClient.subscribe("vehicle/+/alerts");

// Handle incoming messages
mqttClient.on("message", (topic, message) => {
  const data = JSON.parse(message.toString());
  // Process and save to database
});
```

**Publish Commands:**

```typescript
// Send command to tracker
mqttClient.publish(
  `vehicle/${deviceId}/commands`,
  JSON.stringify({
    command: "update_config",
    params: { heartbeat_interval: 900 },
  })
);
```

### X.8 Deployment

**Docker Compose (Development):**

```yaml
version: "3.8"
services:
  api-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/tracking
      - INFLUXDB_URL=http://influxdb:8086
      - MQTT_BROKER=mqtt://emqx:1883
    depends_on:
      - postgres
      - influxdb
      - emqx
```

**Production:**

- **Container**: Docker
- **Orchestration**: Docker Compose hoặc Kubernetes
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt (certbot)

### X.9 Kết Luận

**Tech Stack Hoàn Chỉnh:**

```
Frontend ──→ API Server (NestJS) ──→ PostgreSQL
                              │
                              └─→ InfluxDB
                              │
                              └─→ EMQX (MQTT)
```

**Tóm Tắt:**

- ✅ Node.js + NestJS phù hợp nhất cho luận văn
- ✅ Dễ học, nhiều tài liệu và ecosystem phong phú
- ✅ Real-time tốt với WebSocket và MQTT integration
- ✅ TypeScript type safety và cấu trúc rõ ràng
