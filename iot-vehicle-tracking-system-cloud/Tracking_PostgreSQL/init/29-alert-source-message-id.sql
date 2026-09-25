ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS source_message_id VARCHAR(96);

DROP INDEX IF EXISTS uq_alerts_source_message_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_alerts_source_message_id
  ON alerts(device_id, source_message_id, alert_type, title)
  WHERE source_message_id IS NOT NULL;
