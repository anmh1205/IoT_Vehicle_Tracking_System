## IX.3.13 Logs & Audit

**Table: connection_logs**

```sql
CREATE TABLE connection_logs (
  id SERIAL PRIMARY KEY,
  device_id INT REFERENCES devices(id) ON DELETE CASCADE,
  connection_type VARCHAR(20), -- 'mqtt', 'http', 'websocket'
  status VARCHAR(20), -- 'connected', 'disconnected', 'failed'
  ip_address VARCHAR(45),
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_connection_logs_device_id ON connection_logs(device_id);
CREATE INDEX idx_connection_logs_created_at ON connection_logs(created_at DESC);
```

**Table: user_actions** -- Audit log

```sql
CREATE TABLE user_actions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'create_vehicle', 'update_config', etc.
  resource_type VARCHAR(50), -- 'vehicle', 'device', 'alert', etc.
  resource_id INT,
  details JSONB, -- Chi tiết hành động
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_actions_user_id ON user_actions(user_id);
CREATE INDEX idx_user_actions_action_type ON user_actions(action_type);
CREATE INDEX idx_user_actions_created_at ON user_actions(created_at DESC);
```

**Giải Thích Audit Log:**

**Audit Log (Nhật Ký Kiểm Tra)** là bản ghi theo thứ tự thời gian về các hoạt động và sự kiện diễn ra trong hệ thống, đặc biệt là các hành động của người dùng.

**Mục Đích:**

1. **Bảo Mật**: Theo dõi ai đã làm gì, khi nào, từ đâu
2. **Điều Tra**: Khi có sự cố, có thể truy vết lại lịch sử hành động
3. **Tuân Thủ**: Đáp ứng yêu cầu pháp lý về ghi nhận hoạt động
4. **Phân Tích**: Hiểu cách người dùng sử dụng hệ thống
5. **Trách Nhiệm**: Xác định người chịu trách nhiệm cho các thay đổi

**Ví Dụ Hành Động Cần Ghi Log:**

- **Authentication**: `login`, `logout`, `password_change`, `token_refresh`
- **Vehicle Management**: `create_vehicle`, `update_vehicle`, `delete_vehicle`, `assign_driver`
- **Device Management**: `register_device`, `update_config`, `send_command`
- **Alert Management**: `acknowledge_alert`, `resolve_alert`, `create_alert_rule`
- **User Management**: `create_user`, `update_role`, `suspend_user`
- **Geofence**: `create_geofence`, `assign_geofence`, `delete_geofence`

**Ví Dụ Dữ Liệu Trong `user_actions`:**

```json
{
  "id": 1,
  "user_id": 5,
  "action_type": "update_config",
  "resource_type": "device",
  "resource_id": 123,
  "details": {
    "old_value": { "heartbeat_interval": 600 },
    "new_value": { "heartbeat_interval": 900 },
    "reason": "User requested change"
  },
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Lợi Ích Trong Hệ Thống Vehicle Tracking:**

- ✅ **Bảo Mật**: Phát hiện truy cập bất thường hoặc thay đổi cấu hình trái phép
- ✅ **Điều Tra**: Khi có sự cố với xe/device, có thể xem ai đã thay đổi gì
- ✅ **Tuân Thủ**: Đáp ứng yêu cầu pháp lý về quản lý phương tiện
- ✅ **Phân Tích**: Hiểu cách quản trị viên sử dụng hệ thống

