## IX.3.11 Commands & Device Control

**Table: commands**

```sql
CREATE TABLE commands (
  id SERIAL PRIMARY KEY,
  device_id INT REFERENCES devices(id) ON DELETE CASCADE,
  command_type VARCHAR(50) NOT NULL, -- 'update_config', 'request_location', 'enable_tracking', etc.
  command_data JSONB, -- Parameters của command
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'acknowledged', 'failed'
  sent_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  response_data JSONB, -- Response từ device
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_commands_device_id ON commands(device_id);
CREATE INDEX idx_commands_status ON commands(status);
CREATE INDEX idx_commands_created_at ON commands(created_at DESC);
```

