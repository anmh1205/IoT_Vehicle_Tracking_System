## IX.3.17 Notifications (System Notifications)

**Table: notifications**

```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- 'alert', 'system', 'maintenance', 'violation'
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  related_resource_type VARCHAR(50), -- 'vehicle', 'alert', 'trip', etc.
  related_resource_id INT,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;
```

