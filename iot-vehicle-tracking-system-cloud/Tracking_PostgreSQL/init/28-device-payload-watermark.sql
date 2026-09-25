ALTER TABLE devices ADD COLUMN IF NOT EXISTS payload_updated_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_devices_payload_updated_at ON devices(payload_updated_at DESC);
