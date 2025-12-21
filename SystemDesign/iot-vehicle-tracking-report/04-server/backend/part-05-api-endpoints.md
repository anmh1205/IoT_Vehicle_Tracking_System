## PHẦN XI: API ENDPOINTS DESIGN

### XI.1 Tổng Quan

**Base URL:** `https://api.example.com/api`

**Authentication:** JWT Bearer Token (trừ auth endpoints)

**Response Format:** JSON

**Error Format:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Email must be a valid email"
    }
  ]
}
```

### XI.2 Authentication APIs

#### POST /api/auth/login

**Mô tả:** Đăng nhập admin/staff

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "full_name": "Admin User",
    "role": "admin"
  }
}
```

**Errors:**
- `401 Unauthorized`: Email hoặc password sai
- `400 Bad Request`: Validation failed

---

#### POST /api/auth/register

**Mô tả:** Đăng ký tài khoản admin/staff mới (chỉ admin mới được tạo)

**Request:**
```json
{
  "username": "staff01",
  "email": "staff01@example.com",
  "password": "password123",
  "full_name": "Staff User",
  "phone": "0123456789",
  "role": "staff"
}
```

**Response (201 Created):**
```json
{
  "id": 2,
  "username": "staff01",
  "email": "staff01@example.com",
  "full_name": "Staff User",
  "role": "staff",
  "status": "active",
  "created_at": "2024-01-15T10:00:00Z"
}
```

**Errors:**
- `400 Bad Request`: Email/username đã tồn tại
- `403 Forbidden`: Không có quyền tạo user

---

#### POST /api/auth/refresh

**Mô tả:** Refresh access token

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### POST /api/auth/logout

**Mô tả:** Đăng xuất, vô hiệu hóa refresh token

**Headers:** `Authorization: Bearer {access_token}`

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

### XI.3 Vehicles APIs

#### GET /api/vehicles

**Mô tả:** Lấy danh sách xe (có pagination và filter)

**Query Parameters:**
- `page` (number, default: 1): Số trang
- `limit` (number, default: 20): Số item mỗi trang
- `status` (string, optional): Filter theo status ('active', 'inactive', 'maintenance', 'retired')
- `vehicle_type` (string, optional): Filter theo loại xe
- `search` (string, optional): Tìm kiếm theo biển số, brand, model

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "vehicle_id": "VEHICLE_001",
      "plate_number": "30A-12345",
      "brand": "Toyota",
      "model": "Camry",
      "year": 2020,
      "color": "White",
      "vehicle_type": "sedan",
      "status": "active",
      "mileage_km": 15000,
      "device": {
        "id": 1,
        "device_id": "TRACKER_001",
        "status": "active",
        "last_seen": "2024-01-15T10:00:00Z",
        "battery_level": 85.5
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

#### GET /api/vehicles/:id

**Mô tả:** Lấy chi tiết một xe

**Response (200 OK):**
```json
{
  "id": 1,
  "vehicle_id": "VEHICLE_001",
  "plate_number": "30A-12345",
  "owner_id": 1,
  "brand": "Toyota",
  "model": "Camry",
  "year": 2020,
  "color": "White",
  "vin": "JT1234567890",
  "seats": 5,
  "transmission": "automatic",
  "fuel_type": "gasoline",
  "mileage_km": 15000,
  "registration_number": "REG123456",
  "insurance_expiry": "2024-12-31",
  "status": "active",
  "rental_price_per_day": 500000, // [Phase 2]
  "rental_price_per_hour": 50000, // [Phase 2]
  "deposit_amount": 5000000, // [Phase 2]
  "availability_status": "available", // [Phase 2]
  "device": {
    "id": 1,
    "device_id": "TRACKER_001",
    "firmware_version": "1.0.0",
    "status": "active",
    "last_seen": "2024-01-15T10:00:00Z",
    "battery_level": 85.5,
    "signal_strength": 20
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

**Errors:**
- `404 Not Found`: Không tìm thấy xe

---

#### POST /api/vehicles

**Mô tả:** Tạo xe mới

**Request:**
```json
{
  "vehicle_id": "VEHICLE_002",
  "plate_number": "30A-12346",
  "brand": "Honda",
  "model": "Civic",
  "year": 2021,
  "color": "Black",
  "vehicle_type": "sedan",
  "vin": "JT1234567891",
  "seats": 5,
  "transmission": "automatic",
  "fuel_type": "gasoline",
  "registration_number": "REG123457",
  "insurance_expiry": "2024-12-31"
}
```

**Response (201 Created):**
```json
{
  "id": 2,
  "vehicle_id": "VEHICLE_002",
  "plate_number": "30A-12346",
  "status": "active",
  "created_at": "2024-01-15T10:00:00Z"
}
```

**Errors:**
- `400 Bad Request`: Validation failed, duplicate vehicle_id/plate_number
- `403 Forbidden`: Không có quyền tạo xe

---

#### PUT /api/vehicles/:id

**Mô tả:** Cập nhật thông tin xe

**Request:**
```json
{
  "brand": "Honda",
  "model": "Civic 2022",
  "mileage_km": 20000,
  "status": "maintenance"
}
```

**Response (200 OK):**
```json
{
  "id": 2,
  "vehicle_id": "VEHICLE_002",
  "brand": "Honda",
  "model": "Civic 2022",
  "mileage_km": 20000,
  "status": "maintenance",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

---

#### DELETE /api/vehicles/:id

**Mô tả:** Xóa xe (soft delete hoặc hard delete)

**Response (200 OK):**
```json
{
  "message": "Vehicle deleted successfully"
}
```

---

#### GET /api/vehicles/:id/status

**Mô tả:** Lấy trạng thái hiện tại của xe (vị trí, device status, alerts)

**Response (200 OK):**
```json
{
  "vehicle_id": 1,
  "status": "active",
  "current_location": {
    "lat": 21.028511,
    "lon": 105.804817,
    "speed": 60.0,
    "course": 180.0,
    "timestamp": "2024-01-15T10:00:00Z"
  },
  "device": {
    "status": "active",
    "last_seen": "2024-01-15T10:00:00Z",
    "battery_level": 85.5,
    "signal_strength": 20
  },
  "current_trip": {
    "id": 10,
    "status": "in_progress",
    "start_time": "2024-01-15T09:00:00Z",
    "distance_km": 50.5
  },
  "active_alerts": [
    {
      "id": 5,
      "alert_type": "speeding",
      "severity": "high",
      "created_at": "2024-01-15T09:30:00Z"
    }
  ]
}
```

---

#### GET /api/vehicles/:id/availability [Phase 2]

**Mô tả:** [Phase 2] Kiểm tra availability của xe trong khoảng thời gian

**Query Parameters:**
- `start_time` (ISO 8601): Thời gian bắt đầu
- `end_time` (ISO 8601): Thời gian kết thúc

**Response (200 OK):**
```json
{
  "vehicle_id": 1,
  "available": true,
  "conflicting_bookings": []
}
```

---

### XI.4 Customers APIs

#### GET /api/customers

**Mô tả:** Lấy danh sách khách hàng

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `status` (string, optional): 'active', 'suspended', 'blacklisted'
- `verification_status` (string, optional): 'pending', 'verified', 'rejected'
- `search` (string, optional): Tìm kiếm theo tên, phone, email, CMND

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "full_name": "Nguyễn Văn A",
      "phone": "0123456789",
      "email": "nguyenvana@example.com",
      "license_number": "BL123456",
      "license_type": "B2",
      "status": "active",
      "verification_status": "verified",
      "total_rentals": 5,
      "rating_average": 4.5
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

#### GET /api/customers/:id

**Mô tả:** Lấy chi tiết khách hàng

**Response (200 OK):**
```json
{
  "id": 1,
  "user_id": null,
  "full_name": "Nguyễn Văn A",
  "email": "nguyenvana@example.com",
  "phone": "0123456789",
  "date_of_birth": "1990-01-01",
  "id_card_number": "001234567890",
  "id_card_issue_date": "2010-01-01",
  "id_card_issue_place": "Công an Hà Nội",
  "address": "123 Đường ABC, Quận XYZ, Hà Nội",
  "license_number": "BL123456",
  "license_type": "B2",
  "license_issue_date": "2015-01-01",
  "license_expiry_date": "2030-01-01",
  "license_issue_place": "Sở GTVT Hà Nội",
  "status": "active",
  "verification_status": "verified",
  "verified_by": 1,
  "verified_at": "2024-01-01T00:00:00Z",
  "total_rentals": 5,
  "total_spent": 5000000,
  "rating_average": 4.5,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

---

#### POST /api/customers

**Mô tả:** Tạo khách hàng mới

**Request:**
```json
{
  "full_name": "Nguyễn Văn B",
  "email": "nguyenvanb@example.com",
  "phone": "0987654321",
  "date_of_birth": "1995-05-15",
  "id_card_number": "001234567891",
  "id_card_issue_date": "2015-01-01",
  "id_card_issue_place": "Công an Hà Nội",
  "address": "456 Đường XYZ, Quận ABC, Hà Nội",
  "license_number": "BL123457",
  "license_type": "B2",
  "license_issue_date": "2018-01-01",
  "license_expiry_date": "2033-01-01",
  "license_issue_place": "Sở GTVT Hà Nội"
}
```

**Response (201 Created):**
```json
{
  "id": 2,
  "full_name": "Nguyễn Văn B",
  "phone": "0987654321",
  "status": "active",
  "verification_status": "pending",
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

#### PUT /api/customers/:id

**Mô tả:** Cập nhật thông tin khách hàng

**Request:**
```json
{
  "email": "newemail@example.com",
  "phone": "0987654322",
  "address": "789 Đường MNO, Quận PQR, Hà Nội"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "newemail@example.com",
  "phone": "0987654322",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

---

#### PUT /api/customers/:id/verify

**Mô tả:** Xác minh khách hàng (chỉ admin/manager)

**Request:**
```json
{
  "verification_status": "verified",
  "notes": "Đã kiểm tra giấy tờ hợp lệ"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "verification_status": "verified",
  "verified_by": 1,
  "verified_at": "2024-01-15T11:00:00Z"
}
```

---

#### GET /api/customers/:id/rentals [Phase 2]

**Mô tả:** [Phase 2] Lấy lịch sử thuê xe của khách hàng

**Response (200 OK):**
```json
{
  "customer_id": 1,
  "rentals": [
    {
      "booking_id": 10,
      "vehicle": {
        "id": 1,
        "plate_number": "30A-12345"
      },
      "pickup_time": "2024-01-10T08:00:00Z",
      "return_time": "2024-01-12T18:00:00Z",
      "status": "completed",
      "total_amount": 1500000
    }
  ]
}
```

---

### XI.5 Trips APIs

#### GET /api/trips

**Mô tả:** Lấy danh sách chuyến đi

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `vehicle_id` (number, optional): Filter theo xe
- `customer_id` (number, optional): Filter theo khách hàng
- `status` (string, optional): 'in_progress', 'completed', 'cancelled'
- `start_date` (ISO 8601, optional): Từ ngày
- `end_date` (ISO 8601, optional): Đến ngày

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "trip_id": "TRIP-20240115-001",
      "vehicle": {
        "id": 1,
        "plate_number": "30A-12345"
      },
      "customer": {
        "id": 1,
        "full_name": "Nguyễn Văn A"
      },
      "start_time": "2024-01-15T08:00:00Z",
      "end_time": "2024-01-15T18:00:00Z",
      "distance_km": 150.5,
      "duration_minutes": 600,
      "max_speed": 80.0,
      "avg_speed": 45.0,
      "status": "completed"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 200,
    "totalPages": 10
  }
}
```

---

#### GET /api/trips/:id

**Mô tả:** Lấy chi tiết chuyến đi

**Response (200 OK):**
```json
{
  "id": 1,
  "trip_id": "TRIP-20240115-001",
  "booking_id": null, // [Phase 2] null trong Phase 1
  "vehicle": {
    "id": 1,
    "plate_number": "30A-12345",
    "brand": "Toyota",
    "model": "Camry"
  },
  "customer": {
    "id": 1,
    "full_name": "Nguyễn Văn A",
    "phone": "0123456789"
  },
  "start_time": "2024-01-15T08:00:00Z",
  "end_time": "2024-01-15T18:00:00Z",
  "start_location": {
    "lat": 21.028511,
    "lon": 105.804817,
    "address": "123 Đường ABC, Hà Nội"
  },
  "end_location": {
    "lat": 20.998511,
    "lon": 105.824817,
    "address": "456 Đường XYZ, Hà Nội"
  },
  "distance_km": 150.5,
  "duration_minutes": 600,
  "max_speed": 80.0,
  "avg_speed": 45.0,
  "mileage_at_start": 15000,
  "mileage_at_end": 15150,
  "status": "completed",
  "events": [
    {
      "id": 1,
      "event_type": "ignition_on",
      "event_time": "2024-01-15T08:00:00Z",
      "location": {
        "lat": 21.028511,
        "lon": 105.804817
      }
    },
    {
      "id": 2,
      "event_type": "speeding",
      "event_time": "2024-01-15T09:30:00Z",
      "speed": 85.0,
      "description": "Vượt quá tốc độ 80 km/h"
    }
  ],
  "stops": [
    {
      "id": 1,
      "stop_type": "parking",
      "arrival_time": "2024-01-15T10:00:00Z",
      "departure_time": "2024-01-15T10:30:00Z",
      "duration_minutes": 30,
      "location": {
        "lat": 21.018511,
        "lon": 105.814817,
        "address": "Bãi đỗ xe ABC"
      }
    }
  ],
  "violations": [
    {
      "id": 1,
      "violation_type": "speeding",
      "violation_time": "2024-01-15T09:30:00Z",
      "speed_limit": 80.0,
      "actual_speed": 85.0,
      "severity": "medium"
    }
  ],
  "created_at": "2024-01-15T08:00:00Z"
}
```

---

#### GET /api/trips/:id/route

**Mô tả:** Lấy route (tuyến đường) của chuyến đi từ InfluxDB

**Query Parameters:**
- `interval` (string, optional): '1m', '5m', '10m' - Khoảng thời gian giữa các điểm

**Response (200 OK):**
```json
{
  "trip_id": 1,
  "route": [
    {
      "lat": 21.028511,
      "lon": 105.804817,
      "speed": 0.0,
      "timestamp": "2024-01-15T08:00:00Z"
    },
    {
      "lat": 21.029511,
      "lon": 105.805817,
      "speed": 45.0,
      "timestamp": "2024-01-15T08:01:00Z"
    }
  ],
  "total_points": 600
}
```

---

### XI.6 Telemetry APIs

#### GET /api/telemetry/location

**Mô tả:** Lấy dữ liệu vị trí từ InfluxDB

**Query Parameters:**
- `device_id` (string, required): Device ID
- `start_time` (ISO 8601, required): Thời gian bắt đầu
- `end_time` (ISO 8601, required): Thời gian kết thúc
- `interval` (string, optional): '1m', '5m', '10m', '1h' - Aggregate interval

**Response (200 OK):**
```json
{
  "device_id": "TRACKER_001",
  "vehicle_id": 1,
  "data": [
    {
      "lat": 21.028511,
      "lon": 105.804817,
      "alt": 50.5,
      "speed": 60.0,
      "course": 180.0,
      "satellites": 8,
      "timestamp": "2024-01-15T10:00:00Z"
    }
  ],
  "total_points": 100
}
```

---

#### GET /api/telemetry/history

**Mô tả:** Lấy lịch sử di chuyển của xe trong khoảng thời gian

**Query Parameters:**
- `vehicle_id` (number, required)
- `start_date` (ISO 8601, required)
- `end_date` (ISO 8601, required)
- `include_stops` (boolean, default: false): Bao gồm điểm dừng

**Response (200 OK):**
```json
{
  "vehicle_id": 1,
  "period": {
    "start": "2024-01-15T00:00:00Z",
    "end": "2024-01-15T23:59:59Z"
  },
  "summary": {
    "total_distance_km": 250.5,
    "total_duration_minutes": 480,
    "max_speed": 80.0,
    "avg_speed": 45.0,
    "stops_count": 5
  },
  "trips": [
    {
      "trip_id": 1,
      "start_time": "2024-01-15T08:00:00Z",
      "end_time": "2024-01-15T18:00:00Z",
      "distance_km": 150.5
    }
  ],
  "stops": [
    {
      "stop_type": "parking",
      "arrival_time": "2024-01-15T10:00:00Z",
      "departure_time": "2024-01-15T10:30:00Z",
      "duration_minutes": 30,
      "location": {
        "lat": 21.018511,
        "lon": 105.814817
      }
    }
  ]
}
```

---

#### GET /api/telemetry/realtime

**Mô tả:** WebSocket endpoint cho real-time location updates

**WebSocket Connection:**
```
ws://api.example.com/api/telemetry/realtime
```

**Subscribe Message:**
```json
{
  "action": "subscribe",
  "vehicle_ids": [1, 2, 3]
}
```

**Unsubscribe Message:**
```json
{
  "action": "unsubscribe",
  "vehicle_ids": [1]
}
```

**Location Update Message (Server → Client):**
```json
{
  "type": "location",
  "vehicle_id": 1,
  "device_id": "TRACKER_001",
  "data": {
    "lat": 21.028511,
    "lon": 105.804817,
    "speed": 60.0,
    "course": 180.0,
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

---

### XI.7 Alerts APIs

#### GET /api/alerts

**Mô tả:** Lấy danh sách cảnh báo

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `vehicle_id` (number, optional): Filter theo xe
- `alert_type` (string, optional): Filter theo loại alert
- `severity` (string, optional): 'low', 'medium', 'high', 'critical'
- `acknowledged` (boolean, optional): Filter theo trạng thái acknowledge
- `start_date` (ISO 8601, optional)
- `end_date` (ISO 8601, optional)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "vehicle": {
        "id": 1,
        "plate_number": "30A-12345"
      },
      "booking_id": null, // [Phase 2]
      "alert_type": "motion_detected",
      "severity": "high",
      "title": "Xe di chuyển khi đỗ",
      "message": "Phát hiện chuyển động khi xe đang đỗ",
      "location": {
        "lat": 21.028511,
        "lon": 105.804817
      },
      "acknowledged": false,
      "resolved": false,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

#### GET /api/alerts/:id

**Mô tả:** Lấy chi tiết cảnh báo

**Response (200 OK):**
```json
{
  "id": 1,
  "vehicle": {
    "id": 1,
    "plate_number": "30A-12345"
  },
  "booking_id": null, // [Phase 2]
  "device": {
    "id": 1,
    "device_id": "TRACKER_001"
  },
  "alert_type": "motion_detected",
  "severity": "high",
  "title": "Xe di chuyển khi đỗ",
  "message": "Phát hiện chuyển động khi xe đang đỗ",
  "location": {
    "lat": 21.028511,
    "lon": 105.804817
  },
  "acknowledged": false,
  "acknowledged_by": null,
  "acknowledged_at": null,
  "resolved": false,
  "resolved_by": null,
  "resolved_at": null,
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

#### PUT /api/alerts/:id/acknowledge

**Mô tả:** Acknowledge cảnh báo

**Request:**
```json
{
  "notes": "Đã kiểm tra, không có vấn đề"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "acknowledged": true,
  "acknowledged_by": 1,
  "acknowledged_at": "2024-01-15T11:00:00Z"
}
```

---

#### PUT /api/alerts/:id/resolve

**Mô tả:** Resolve cảnh báo

**Request:**
```json
{
  "notes": "Đã xử lý xong"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "resolved": true,
  "resolved_by": 1,
  "resolved_at": "2024-01-15T11:30:00Z"
}
```

---

#### GET /api/alerts/realtime

**Mô tả:** WebSocket endpoint cho real-time alerts

**WebSocket Connection:**
```
ws://api.example.com/api/alerts/realtime
```

**Alert Message (Server → Client):**
```json
{
  "type": "alert",
  "data": {
    "id": 1,
    "vehicle_id": 1,
    "alert_type": "motion_detected",
    "severity": "high",
    "title": "Xe di chuyển khi đỗ",
    "location": {
      "lat": 21.028511,
      "lon": 105.804817
    },
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

---

### XI.8 Violations APIs

#### GET /api/violations

**Mô tả:** Lấy danh sách vi phạm

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `vehicle_id` (number, optional)
- `customer_id` (number, optional)
- `violation_type` (string, optional)
- `severity` (string, optional)
- `acknowledged` (boolean, optional)
- `start_date` (ISO 8601, optional)
- `end_date` (ISO 8601, optional)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "vehicle": {
        "id": 1,
        "plate_number": "30A-12345"
      },
      "customer": {
        "id": 1,
        "full_name": "Nguyễn Văn A"
      },
      "trip": {
        "id": 1,
        "trip_id": "TRIP-20240115-001"
      },
      "booking_id": null, // [Phase 2]
      "violation_type": "speeding",
      "severity": "medium",
      "speed_limit": 80.0,
      "actual_speed": 85.0,
      "location": {
        "lat": 21.028511,
        "lon": 105.804817
      },
      "violation_time": "2024-01-15T09:30:00Z",
      "fine_amount": 0,
      "acknowledged": false,
      "created_at": "2024-01-15T09:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 30,
    "totalPages": 2
  }
}
```

---

#### GET /api/violations/:id

**Mô tả:** Lấy chi tiết vi phạm

**Response (200 OK):**
```json
{
  "id": 1,
  "booking_id": null, // [Phase 2]
  "vehicle": {
    "id": 1,
    "plate_number": "30A-12345"
  },
  "customer": {
    "id": 1,
    "full_name": "Nguyễn Văn A"
  },
  "trip": {
    "id": 1,
    "trip_id": "TRIP-20240115-001"
  },
  "violation_type": "speeding",
  "severity": "medium",
  "speed_limit": 80.0,
  "actual_speed": 85.0,
  "location": {
    "lat": 21.028511,
    "lon": 105.804817,
    "address": "123 Đường ABC, Hà Nội"
  },
  "violation_time": "2024-01-15T09:30:00Z",
  "description": "Vượt quá tốc độ cho phép 5 km/h",
  "fine_amount": 0,
  "acknowledged": false,
  "acknowledged_by": null,
  "acknowledged_at": null,
  "created_at": "2024-01-15T09:30:00Z"
}
```

---

#### PUT /api/violations/:id/acknowledge

**Mô tả:** Acknowledge vi phạm

**Request:**
```json
{
  "fine_amount": 500000,
  "notes": "Phạt vi phạm tốc độ"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "acknowledged": true,
  "acknowledged_by": 1,
  "acknowledged_at": "2024-01-15T11:00:00Z",
  "fine_amount": 500000
}
```

---

### XI.9 Commands APIs (MQTT)

#### POST /api/commands/:device_id

**Mô tả:** Gửi command đến tracker qua MQTT

**Request:**
```json
{
  "command": "update_config",
  "params": {
    "heartbeat_interval": 900,
    "tracking_interval": 10
  }
}
```

**Hoặc:**
```json
{
  "command": "request_location",
  "params": {}
}
```

**Hoặc:**
```json
{
  "command": "enable_tracking",
  "params": {
    "duration": 3600
  }
}
```

**Response (200 OK):**
```json
{
  "command_id": 1,
  "device_id": "TRACKER_001",
  "command": "update_config",
  "status": "sent",
  "sent_at": "2024-01-15T10:00:00Z"
}
```

**Errors:**
- `404 Not Found`: Device không tồn tại hoặc offline
- `400 Bad Request`: Command không hợp lệ

---

#### GET /api/commands

**Mô tả:** Lấy danh sách commands đã gửi

**Query Parameters:**
- `device_id` (string, optional)
- `status` (string, optional): 'pending', 'sent', 'acknowledged', 'failed'
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "device_id": "TRACKER_001",
      "command_type": "update_config",
      "status": "acknowledged",
      "sent_at": "2024-01-15T10:00:00Z",
      "acknowledged_at": "2024-01-15T10:00:05Z",
      "response_data": {
        "success": true
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

### XI.10 Devices APIs

#### GET /api/devices

**Mô tả:** Lấy danh sách devices

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `status` (string, optional): 'active', 'inactive', 'offline', 'error'
- `vehicle_id` (number, optional): Filter theo xe

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "device_id": "TRACKER_001",
      "vehicle": {
        "id": 1,
        "plate_number": "30A-12345"
      },
      "firmware_version": "1.0.0",
      "hardware_version": "1.0",
      "status": "active",
      "last_seen": "2024-01-15T10:00:00Z",
      "battery_level": 85.5,
      "signal_strength": 20
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

---

#### GET /api/devices/:id

**Mô tả:** Lấy chi tiết device

**Response (200 OK):**
```json
{
  "id": 1,
  "device_id": "TRACKER_001",
  "vehicle": {
    "id": 1,
    "plate_number": "30A-12345"
  },
  "device_type": "tracker",
  "firmware_version": "1.0.0",
  "hardware_version": "1.0",
  "imei": "123456789012345",
  "sim_card_number": "0123456789",
  "status": "active",
  "last_seen": "2024-01-15T10:00:00Z",
  "battery_level": 85.5,
  "signal_strength": 20,
  "configurations": [
    {
      "config_key": "heartbeat_interval",
      "config_value": "900"
    },
    {
      "config_key": "tracking_interval",
      "config_value": "10"
    }
  ],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

---

#### POST /api/devices

**Mô tả:** Đăng ký device mới

**Request:**
```json
{
  "device_id": "TRACKER_002",
  "vehicle_id": 2,
  "imei": "123456789012346",
  "sim_card_number": "0987654321",
  "firmware_version": "1.0.0",
  "hardware_version": "1.0"
}
```

**Response (201 Created):**
```json
{
  "id": 2,
  "device_id": "TRACKER_002",
  "status": "active",
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

#### PUT /api/devices/:id/config

**Mô tả:** Cập nhật cấu hình device

**Request:**
```json
{
  "heartbeat_interval": 900,
  "tracking_interval": 10
}
```

**Response (200 OK):**
```json
{
  "device_id": "TRACKER_001",
  "configurations": [
    {
      "config_key": "heartbeat_interval",
      "config_value": "900"
    },
    {
      "config_key": "tracking_interval",
      "config_value": "10"
    }
  ],
  "updated_at": "2024-01-15T11:00:00Z"
}
```

---

### XI.11 Geofences APIs

#### GET /api/geofences

**Mô tả:** Lấy danh sách geofences

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Văn phòng chính",
      "geofence_type": "circle",
      "center": {
        "lat": 21.028511,
        "lon": 105.804817
      },
      "radius_meters": 500,
      "enabled": true
    }
  ]
}
```

---

#### POST /api/geofences

**Mô tả:** Tạo geofence mới

**Request (Circle):**
```json
{
  "name": "Văn phòng chính",
  "description": "Khu vực văn phòng",
  "geofence_type": "circle",
  "center_lat": 21.028511,
  "center_lon": 105.804817,
  "radius_meters": 500,
  "alert_on_entry": false,
  "alert_on_exit": true
}
```

**Request (Polygon):**
```json
{
  "name": "Khu vực cấm",
  "geofence_type": "polygon",
  "coordinates": [
    [21.028511, 105.804817],
    [21.029511, 105.805817],
    [21.030511, 105.806817],
    [21.028511, 105.804817]
  ],
  "alert_on_entry": true,
  "alert_on_exit": true
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "name": "Văn phòng chính",
  "enabled": true,
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

#### PUT /api/geofences/:id/assign

**Mô tả:** Gán geofence cho xe

**Request:**
```json
{
  "vehicle_ids": [1, 2, 3]
}
```

**Response (200 OK):**
```json
{
  "geofence_id": 1,
  "assigned_vehicles": [
    {
      "vehicle_id": 1,
      "plate_number": "30A-12345"
    }
  ]
}
```

---

### XI.12 Maintenance APIs

#### GET /api/maintenance

**Mô tả:** Lấy danh sách bảo trì

**Query Parameters:**
- `vehicle_id` (number, optional)
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "vehicle": {
        "id": 1,
        "plate_number": "30A-12345"
      },
      "maintenance_type": "oil_change",
      "description": "Thay dầu động cơ",
      "cost": 500000,
      "mileage_km": 15000,
      "performed_by": "Kỹ thuật viên A",
      "next_maintenance_date": "2024-04-15",
      "next_maintenance_mileage": 20000,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

---

#### POST /api/maintenance

**Mô tả:** Tạo bản ghi bảo trì mới

**Request:**
```json
{
  "vehicle_id": 1,
  "maintenance_type": "oil_change",
  "description": "Thay dầu động cơ",
  "cost": 500000,
  "mileage_km": 15000,
  "performed_by": "Kỹ thuật viên A",
  "next_maintenance_date": "2024-04-15",
  "next_maintenance_mileage": 20000
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "vehicle_id": 1,
  "maintenance_type": "oil_change",
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

### XI.13 [Phase 2] Bookings APIs

#### GET /api/bookings [Phase 2]

**Mô tả:** [Phase 2] Lấy danh sách đặt xe

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `customer_id` (number, optional)
- `vehicle_id` (number, optional)
- `status` (string, optional): 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
- `start_date` (ISO 8601, optional)
- `end_date` (ISO 8601, optional)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "booking_number": "BK-20240115-001",
      "customer": {
        "id": 1,
        "full_name": "Nguyễn Văn A"
      },
      "vehicle": {
        "id": 1,
        "plate_number": "30A-12345"
      },
      "pickup_time": "2024-01-20T08:00:00Z",
      "return_time": "2024-01-22T18:00:00Z",
      "status": "confirmed",
      "total_amount": 1500000,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

#### POST /api/bookings [Phase 2]

**Mô tả:** [Phase 2] Tạo đặt xe mới

**Request:**
```json
{
  "customer_id": 1,
  "vehicle_id": 1,
  "pickup_time": "2024-01-20T08:00:00Z",
  "return_time": "2024-01-22T18:00:00Z",
  "pickup_location": "123 Đường ABC, Hà Nội",
  "pickup_lat": 21.028511,
  "pickup_lon": 105.804817,
  "return_location": "456 Đường XYZ, Hà Nội",
  "return_lat": 21.018511,
  "return_lon": 105.814817,
  "special_requests": "Cần thêm GPS"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "booking_number": "BK-20240115-001",
  "status": "pending",
  "total_amount": 1500000,
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

#### PUT /api/bookings/:id/pickup [Phase 2]

**Mô tả:** [Phase 2] Xác nhận nhận xe

**Request:**
```json
{
  "actual_pickup_time": "2024-01-20T08:30:00Z",
  "mileage_at_start": 15000,
  "notes": "Xe trong tình trạng tốt"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "status": "in_progress",
  "actual_pickup_time": "2024-01-20T08:30:00Z",
  "updated_at": "2024-01-20T08:30:00Z"
}
```

---

#### PUT /api/bookings/:id/return [Phase 2]

**Mô tả:** [Phase 2] Xác nhận trả xe

**Request:**
```json
{
  "actual_return_time": "2024-01-22T18:30:00Z",
  "mileage_at_end": 15200,
  "notes": "Xe trả đúng hạn"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "status": "completed",
  "actual_return_time": "2024-01-22T18:30:00Z",
  "updated_at": "2024-01-22T18:30:00Z"
}
```

---

### XI.14 [Phase 2] Contracts APIs

#### GET /api/contracts [Phase 2]

**Mô tả:** [Phase 2] Lấy danh sách hợp đồng

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "contract_number": "HD-20240115-001",
      "booking": {
        "id": 1,
        "booking_number": "BK-20240115-001"
      },
      "status": "signed",
      "start_date": "2024-01-20T08:00:00Z",
      "end_date": "2024-01-22T18:00:00Z",
      "signed_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

#### POST /api/contracts [Phase 2]

**Mô tả:** [Phase 2] Tạo hợp đồng mới

**Request:**
```json
{
  "booking_id": 1,
  "contract_number": "HD-20240115-001",
  "start_date": "2024-01-20T08:00:00Z",
  "end_date": "2024-01-22T18:00:00Z",
  "terms_and_conditions": "Điều khoản hợp đồng..."
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "contract_number": "HD-20240115-001",
  "status": "draft",
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

### XI.15 [Phase 2] Payments APIs

#### GET /api/payments [Phase 2]

**Mô tả:** [Phase 2] Lấy danh sách thanh toán

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "payment_number": "PAY-20240115-001",
      "booking": {
        "id": 1,
        "booking_number": "BK-20240115-001"
      },
      "payment_type": "deposit",
      "amount": 5000000,
      "payment_method": "bank_transfer",
      "payment_status": "completed",
      "payment_date": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

#### POST /api/payments [Phase 2]

**Mô tả:** [Phase 2] Tạo thanh toán mới

**Request:**
```json
{
  "booking_id": 1,
  "payment_type": "deposit",
  "amount": 5000000,
  "payment_method": "bank_transfer"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "payment_number": "PAY-20240115-001",
  "payment_status": "pending",
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

### XI.16 [Phase 2] Damage Reports APIs

#### GET /api/damage-reports [Phase 2]

**Mô tả:** [Phase 2] Lấy danh sách báo cáo hư hỏng

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "booking": {
        "id": 1,
        "booking_number": "BK-20240115-001"
      },
      "vehicle": {
        "id": 1,
        "plate_number": "30A-12345"
      },
      "report_type": "return",
      "damage_description": "Vết xước trên cửa trước",
      "status": "pending",
      "estimated_repair_cost": 500000,
      "created_at": "2024-01-22T18:30:00Z"
    }
  ]
}
```

---

#### POST /api/damage-reports [Phase 2]

**Mô tả:** [Phase 2] Tạo báo cáo hư hỏng mới

**Request:**
```json
{
  "booking_id": 1,
  "vehicle_id": 1,
  "report_type": "return",
  "damage_description": "Vết xước trên cửa trước",
  "damage_location": "Cửa trước bên phải",
  "damage_images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "estimated_repair_cost": 500000
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "status": "pending",
  "created_at": "2024-01-22T18:30:00Z"
}
```

---

### XI.17 [Phase 2] Reviews APIs

#### GET /api/reviews [Phase 2]

**Mô tả:** [Phase 2] Lấy danh sách đánh giá

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "vehicle": {
        "id": 1,
        "plate_number": "30A-12345"
      },
      "customer": {
        "id": 1,
        "full_name": "Nguyễn Văn A"
      },
      "vehicle_rating": 5,
      "service_rating": 4,
      "overall_rating": 4.5,
      "is_public": true,
      "status": "approved",
      "created_at": "2024-01-23T10:00:00Z"
    }
  ]
}
```

---

#### POST /api/reviews [Phase 2]

**Mô tả:** [Phase 2] Tạo đánh giá mới

**Request:**
```json
{
  "booking_id": 1,
  "vehicle_id": 1,
  "vehicle_rating": 5,
  "vehicle_comment": "Xe rất tốt",
  "service_rating": 4,
  "service_comment": "Dịch vụ tốt"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "status": "pending",
  "created_at": "2024-01-23T10:00:00Z"
}
```

---

### XI.18 Error Handling

**Standard Error Response:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Email must be a valid email"
    }
  ]
}
```

**HTTP Status Codes:**
- `200 OK`: Success
- `201 Created`: Resource created successfully
- `400 Bad Request`: Validation error, invalid input
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (duplicate)
- `500 Internal Server Error`: Server error

---

### XI.19 Pagination

**Standard Pagination Format:**
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

### XI.20 Authentication & Authorization

**JWT Token Format:**
```
Authorization: Bearer {access_token}
```

**Token Payload:**
```json
{
  "sub": 1,
  "username": "admin",
  "email": "admin@example.com",
  "role": "admin",
  "iat": 1705315200,
  "exp": 1705401600
}
```

**Role-based Access:**
- `admin`: Full access
- `manager`: Read/write access (không thể tạo/xóa admin)
- `staff`: Read/write access (hạn chế một số operations)

---

### XI.21 Rate Limiting

**Limits:**
- Public endpoints: 100 requests/hour
- Authenticated endpoints: 1000 requests/hour
- Admin endpoints: 5000 requests/hour

**Response Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705318800
```

---

### XI.22 API Versioning

**Current Version:** `v1`

**URL Format:** `/api/v1/vehicles` (optional, có thể dùng `/api/vehicles`)

**Future Versions:** `/api/v2/...`

---

### XI.23 Notifications APIs

#### GET /api/notifications/preferences

**Mô tả:** Lấy notification preferences của user hiện tại

**Headers:** `Authorization: Bearer {access_token}`

**Response (200 OK):**
```json
{
  "user_id": 1,
  "telegram": {
    "enabled": true,
    "chat_id": "123456789",
    "verified": true
  },
  "email": {
    "enabled": true,
    "email_address": "user@example.com"
  },
  "alert_types": [
    "motion_detected",
    "speeding",
    "low_battery",
    "geofence_exit"
  ],
  "min_severity": "medium",
  "vehicle_ids": null
}
```

---

#### PUT /api/notifications/preferences

**Mô tả:** Cập nhật notification preferences

**Request:**
```json
{
  "telegram_enabled": true,
  "email_enabled": true,
  "alert_types": ["motion_detected", "speeding", "low_battery"],
  "min_severity": "high",
  "vehicle_ids": [1, 2, 3]
}
```

---

#### POST /api/telegram/connect

**Mô tả:** Lấy link để kết nối Telegram bot

**Response (200 OK):**
```json
{
  "bot_username": "@your_vehicle_tracking_bot",
  "connect_url": "https://t.me/your_vehicle_tracking_bot?start=USER_TOKEN_123"
}
```

---

#### POST /api/telegram/verify

**Mô tả:** Xác minh Telegram chat ID

**Request:**
```json
{
  "token": "USER_TOKEN_123",
  "chat_id": "123456789"
}
```

---

#### POST /api/telegram/disconnect

**Mô tả:** Ngắt kết nối Telegram

**Response (200 OK):**
```json
{
  "message": "Đã ngắt kết nối Telegram"
}
```

---

#### POST /api/notifications/test

**Mô tả:** Test gửi notification

**Request:**
```json
{
  "channels": ["telegram", "email"],
  "message": "Test notification"
}
```

**Chi tiết thiết kế:** Xem [`part-06-notifications-integrations.md`](./part-06-notifications-integrations.md)

---

### XI.24 Summary

**Phase 1 APIs (Core):**
- ✅ Authentication (login, register, refresh, logout)
- ✅ Vehicles (CRUD, status)
- ✅ Customers (CRUD, verification)
- ✅ Trips (list, detail, route)
- ✅ Telemetry (location, history, real-time WebSocket)
- ✅ Alerts (list, detail, acknowledge, resolve, real-time WebSocket)
- ✅ Violations (list, detail, acknowledge)
- ✅ Commands (send, list)
- ✅ Devices (list, detail, config)
- ✅ Geofences (CRUD, assign)
- ✅ Maintenance (list, create)
- ✅ Notifications (preferences, Telegram connect/verify, test)

**[Phase 2] APIs:**
- ⏸️ Bookings (CRUD, pickup, return, tracking)
- ⏸️ Contracts (CRUD, sign, document)
- ⏸️ Payments (CRUD, process)
- ⏸️ Damage Reports (CRUD, inspect)
- ⏸️ Reviews (CRUD, moderate)

**Total Endpoints:** ~55+ endpoints (Phase 1: ~40, Phase 2: ~15)

