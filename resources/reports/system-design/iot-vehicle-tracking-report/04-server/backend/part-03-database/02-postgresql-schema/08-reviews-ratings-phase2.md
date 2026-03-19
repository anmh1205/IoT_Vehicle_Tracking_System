## IX.3.8 Reviews & Ratings [Phase 2]

**Table: reviews** -- [Phase 2] Đánh giá từ khách hàng

```sql
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
  customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
  -- Đánh giá xe
  vehicle_rating INT CHECK (vehicle_rating >= 1 AND vehicle_rating <= 5),
  vehicle_comment TEXT,
  -- Đánh giá dịch vụ
  service_rating INT CHECK (service_rating >= 1 AND service_rating <= 5),
  service_comment TEXT,
  -- Tổng đánh giá
  overall_rating DECIMAL(3, 2), -- Trung bình của vehicle_rating và service_rating
  is_public BOOLEAN DEFAULT TRUE, -- Có hiển thị công khai không
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  moderated_by INT REFERENCES users(id),
  moderated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_vehicle_id ON reviews(vehicle_id);
CREATE INDEX idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX idx_reviews_overall_rating ON reviews(overall_rating DESC);
CREATE INDEX idx_reviews_is_public ON reviews(is_public) WHERE is_public = TRUE;
```

