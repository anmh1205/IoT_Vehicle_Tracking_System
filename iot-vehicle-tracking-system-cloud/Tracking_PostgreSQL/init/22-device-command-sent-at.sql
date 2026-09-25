-- Device command dispatch time must represent successful MQTT publish, not row creation.
-- Existing rows are intentionally left unchanged because historical publish outcome cannot be reconstructed safely.
ALTER TABLE device_commands
  ALTER COLUMN sent_at DROP DEFAULT;
