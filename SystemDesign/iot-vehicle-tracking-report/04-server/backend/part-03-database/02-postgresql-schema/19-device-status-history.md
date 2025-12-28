## IX.3.19 Device Status History

**Table: device_status_history**

```sql
CREATE TABLE device_status_history (
  id SERIAL PRIMARY KEY,
  device_id INT REFERENCES devices(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  reason TEXT, -- Lý do thay đổi trạng thái
  changed_by INT REFERENCES users(id), -- NULL nếu tự động
  changed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_device_status_history_device_id ON device_status_history(device_id);
CREATE INDEX idx_device_status_history_changed_at ON device_status_history(changed_at DESC);
```

