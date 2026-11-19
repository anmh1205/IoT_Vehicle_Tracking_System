-- SV-02/SV-09: lossless, idempotent telemetry staging across VM downtime.
-- Run this on EXISTING production databases before deploying the updated bridge;
-- Docker init scripts execute automatically only on first cluster creation.
CREATE TABLE IF NOT EXISTS telemetry_metric_outbox (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  message_id TEXT,
  line_payload TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts INT NOT NULL DEFAULT 0,
  CONSTRAINT uq_metric_outbox_device_message UNIQUE (device_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_telemetry_metric_outbox_due
  ON telemetry_metric_outbox(next_attempt_at, id);
