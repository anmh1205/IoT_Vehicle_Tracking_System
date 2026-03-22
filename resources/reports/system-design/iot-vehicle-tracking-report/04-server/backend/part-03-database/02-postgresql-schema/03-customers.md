## IX.3.3 Customers (Khách Hàng Thuê Xe)

**Table: customers**

```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL, -- Link với user account nếu có
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20) NOT NULL,
  date_of_birth DATE,
  id_card_number VARCHAR(20) UNIQUE, -- CMND/CCCD
  id_card_issue_date DATE,
  id_card_issue_place VARCHAR(200),
  address TEXT,
  -- Bằng lái xe
  license_number VARCHAR(50),
  license_type VARCHAR(20), -- 'B1', 'B2', 'C', etc.
  license_issue_date DATE,
  license_expiry_date DATE,
  license_issue_place VARCHAR(200),
  -- Trạng thái
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'blacklisted'
  verification_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  verified_by INT REFERENCES users(id), -- Admin xác minh
  verified_at TIMESTAMP,
  -- Đánh giá
  total_rentals INT DEFAULT 0, -- Tổng số lần thuê
  total_spent DECIMAL(12, 2) DEFAULT 0, -- Tổng chi tiêu
  rating_average DECIMAL(3, 2) DEFAULT 0, -- Điểm đánh giá trung bình
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_id_card ON customers(id_card_number);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_verification_status ON customers(verification_status);
```

**Lưu Ý:**

- `customers` khác với `users`: `users` là admin/staff của dịch vụ, `customers` là khách hàng thuê xe
- Một `customer` có thể có `user_id` nếu họ đăng ký tài khoản trên hệ thống

