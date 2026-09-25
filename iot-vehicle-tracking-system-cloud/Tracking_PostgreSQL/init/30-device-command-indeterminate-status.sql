-- Preserve uncertainty when a device reboots after accepting a command but
-- before Backend receives the final execution result.
ALTER TABLE device_commands
  DROP CONSTRAINT IF EXISTS device_commands_status_check;

ALTER TABLE device_commands
  ADD CONSTRAINT device_commands_status_check
  CHECK (status IN ('pending', 'sent', 'accepted', 'indeterminate', 'acknowledged', 'failed'));
