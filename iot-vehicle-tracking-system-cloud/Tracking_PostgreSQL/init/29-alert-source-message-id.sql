ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS source_message_id VARCHAR(96);

CREATE UNIQUE INDEX IF NOT EXISTS uq_alerts_source_message_id
  ON alerts(source_message_id)
  WHERE source_message_id IS NOT NULL;
