## IX.3.5 Payments [Phase 2]

**Table: payments** -- [Phase 2] Quản lý thanh toán

```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
  payment_number VARCHAR(50) UNIQUE NOT NULL, -- Mã thanh toán
  payment_type VARCHAR(20) NOT NULL, -- 'deposit', 'rental_fee', 'additional_fee', 'refund', 'penalty'
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50), -- 'cash', 'bank_transfer', 'credit_card', 'debit_card', 'e_wallet'
  payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  transaction_id VARCHAR(100), -- Mã giao dịch từ payment gateway
  payment_date TIMESTAMP,
  notes TEXT,
  processed_by INT REFERENCES users(id), -- Nhân viên xử lý
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_payment_number ON payments(payment_number);
CREATE INDEX idx_payments_payment_date ON payments(payment_date DESC);
```

