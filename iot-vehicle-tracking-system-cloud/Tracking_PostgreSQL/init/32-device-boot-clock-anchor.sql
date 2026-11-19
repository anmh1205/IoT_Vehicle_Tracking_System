-- FW-06/SV-01: boot-specific monotonic time anchor persisted for replay correction.
-- Run on existing PostgreSQL volumes before deploying MQTT Bridge. Never use
-- one device boot's anchor for packets belonging to a different boot_id.
CREATE TABLE IF NOT EXISTS device_boot_clock_anchors (
  device_id TEXT NOT NULL,
  boot_id TEXT NOT NULL,
  anchor_uptime_ms BIGINT NOT NULL CHECK (anchor_uptime_ms >= 0),
  anchor_utc_ms BIGINT NOT NULL CHECK (anchor_utc_ms >= 1577836800000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, boot_id)
);
CREATE INDEX IF NOT EXISTS idx_device_boot_clock_anchors_created_at
  ON device_boot_clock_anchors(created_at DESC);
