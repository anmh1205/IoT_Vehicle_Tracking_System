## IX.3.4 Bookings & Reservations [Phase 2]

**Table: bookings** -- [Phase 2] Quản lý đặt xe và hợp đồng thuê

```sql
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  booking_number VARCHAR(50) UNIQUE NOT NULL, -- Mã đặt xe (VD: BK-20240115-001)
  customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE RESTRICT,
  -- Thời gian
  pickup_time TIMESTAMP NOT NULL, -- Thời gian nhận xe
  return_time TIMESTAMP NOT NULL, -- Thời gian trả xe dự kiến
  actual_pickup_time TIMESTAMP, -- Thời gian nhận xe thực tế
  actual_return_time TIMESTAMP, -- Thời gian trả xe thực tế
  -- Địa điểm
  pickup_location VARCHAR(200), -- Địa điểm nhận xe
  pickup_lat DECIMAL(10, 8),
  pickup_lon DECIMAL(11, 8),
  return_location VARCHAR(200), -- Địa điểm trả xe
  return_lat DECIMAL(10, 8),
  return_lon DECIMAL(11, 8),
  -- Giá cả
  rental_days INT, -- Số ngày thuê
  rental_hours INT, -- Số giờ thuê (nếu < 1 ngày)
  daily_rate DECIMAL(10, 2), -- Giá mỗi ngày tại thời điểm đặt
  hourly_rate DECIMAL(10, 2), -- Giá mỗi giờ (nếu có)
  subtotal DECIMAL(10, 2), -- Tổng tiền thuê
  discount_amount DECIMAL(10, 2) DEFAULT 0, -- Giảm giá
  deposit_amount DECIMAL(10, 2), -- Tiền cọc
  total_amount DECIMAL(10, 2), -- Tổng cộng
  -- Trạng thái
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
  cancellation_reason TEXT, -- Lý do hủy
  cancelled_by INT REFERENCES users(id), -- Ai hủy (customer hoặc admin)
  cancelled_at TIMESTAMP,
  -- Ghi chú
  special_requests TEXT, -- Yêu cầu đặc biệt từ khách hàng
  admin_notes TEXT, -- Ghi chú của admin
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_vehicle_id ON bookings(vehicle_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_pickup_time ON bookings(pickup_time);
CREATE INDEX idx_bookings_booking_number ON bookings(booking_number);
CREATE INDEX idx_bookings_vehicle_pickup ON bookings(vehicle_id, pickup_time, return_time) WHERE status IN ('confirmed', 'in_progress');
```

**Table: rental_contracts** -- [Phase 2] Hợp đồng thuê xe

```sql
CREATE TABLE rental_contracts (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
  contract_number VARCHAR(50) UNIQUE NOT NULL, -- Số hợp đồng
  -- Thông tin hợp đồng
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  terms_and_conditions TEXT, -- Điều khoản và điều kiện
  -- Giấy tờ
  customer_id_card_image_url VARCHAR(500), -- Ảnh CMND/CCCD
  customer_license_image_url VARCHAR(500), -- Ảnh bằng lái
  contract_document_url VARCHAR(500), -- File hợp đồng đã ký
  -- Trạng thái
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'signed', 'active', 'completed', 'terminated'
  signed_at TIMESTAMP, -- Thời gian ký hợp đồng
  signed_by_customer BOOLEAN DEFAULT FALSE,
  signed_by_admin INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rental_contracts_booking_id ON rental_contracts(booking_id);
CREATE INDEX idx_rental_contracts_status ON rental_contracts(status);
CREATE INDEX idx_rental_contracts_contract_number ON rental_contracts(contract_number);
```

