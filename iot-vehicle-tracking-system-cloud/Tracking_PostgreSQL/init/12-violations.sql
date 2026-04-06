-- =============================================================================
-- 12-violations.sql
-- Violations table for tracking traffic/policy violations per vehicle
-- =============================================================================

CREATE TABLE IF NOT EXISTS violations (
    id BIGSERIAL PRIMARY KEY,
    alert_id BIGINT REFERENCES alerts(id),
    vehicle_id VARCHAR(50) REFERENCES vehicles(vehicle_id),
    driver_id INT REFERENCES users(id),
    violation_type VARCHAR(50) NOT NULL,
    policy_type VARCHAR(32) CHECK (policy_type IN ('ADMIN_BOUNDARY', 'RADIUS', 'DISTANCE_QUOTA')),
    policy_id BIGINT REFERENCES vehicle_policies(id) ON DELETE SET NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    description TEXT,
    location_lat DECIMAL(10,8),
    location_lon DECIMAL(11,8),
    speed_limit DECIMAL(5,2),
    actual_speed DECIMAL(5,2),
    fine_amount DECIMAL(10,2) DEFAULT 0,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by INT REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    notes TEXT,
    dedupe_key VARCHAR(128),
    evidence_json JSONB,
    correlation_id VARCHAR(64),
    detected_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_violations_dedupe_key ON violations(dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_violations_vehicle ON violations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_violations_type ON violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_violations_policy_type ON violations(policy_type);
CREATE INDEX IF NOT EXISTS idx_violations_policy_id ON violations(policy_id);
CREATE INDEX IF NOT EXISTS idx_violations_severity ON violations(severity);
CREATE INDEX IF NOT EXISTS idx_violations_acknowledged ON violations(acknowledged);
CREATE INDEX IF NOT EXISTS idx_violations_created ON violations(created_at DESC);

CREATE TRIGGER trigger_violations_updated_at
    BEFORE UPDATE ON violations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
