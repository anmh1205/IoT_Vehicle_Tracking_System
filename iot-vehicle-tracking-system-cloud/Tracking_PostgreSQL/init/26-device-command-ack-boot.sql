ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS runtime_boot_id VARCHAR(80);

ALTER TABLE device_commands
  ADD COLUMN IF NOT EXISTS ack_boot_id VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_device_commands_accepted_boot
  ON device_commands(device_id, ack_boot_id)
  WHERE status = 'accepted';
