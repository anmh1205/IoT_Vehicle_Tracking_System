-- =============================================================================
-- 08-geofences.sql
-- Geofences, geofence-vehicle assignments, maintenance, and deferred FK for alerts
-- =============================================================================

-- -----------------------------------------------------------------------------
-- geofences
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geofences (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    geofence_type geofence_type DEFAULT 'circle',
    center_latitude DECIMAL(10,8),
    center_longitude DECIMAL(11,8),
    radius_meters INTEGER,
    coordinates JSONB,
    trigger_on geofence_trigger DEFAULT 'both',
    is_active BOOLEAN DEFAULT true,
    notify_email BOOLEAN DEFAULT false,
    notify_push BOOLEAN DEFAULT true,
    color VARCHAR(7) DEFAULT '#3388ff',
    display_hidden BOOLEAN DEFAULT false,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(is_active);

CREATE TRIGGER trigger_geofences_updated_at
    BEFORE UPDATE ON geofences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- geofence_vehicles (many-to-many: geofences <-> vehicles)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geofence_vehicles (
    id SERIAL PRIMARY KEY,
    geofence_id INT NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
    vehicle_id VARCHAR(50) NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(geofence_id, vehicle_id)
);

CREATE INDEX IF NOT EXISTS idx_geofence_vehicles_geofence_id ON geofence_vehicles(geofence_id);
CREATE INDEX IF NOT EXISTS idx_geofence_vehicles_vehicle_id ON geofence_vehicles(vehicle_id);

-- -----------------------------------------------------------------------------
-- vehicle_policies
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_policies (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    policy_type VARCHAR(32) NOT NULL CHECK (policy_type IN ('ADMIN_BOUNDARY', 'RADIUS', 'DISTANCE_QUOTA')),
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'disabled')),
    params_json JSONB NOT NULL,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    created_by INT REFERENCES users(id),
    updated_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from),
    CHECK (
      (policy_type = 'ADMIN_BOUNDARY' AND params_json ? 'boundaryId') OR
      (policy_type = 'RADIUS' AND params_json ? 'centerLat' AND params_json ? 'centerLon' AND params_json ? 'radiusMeters') OR
      (policy_type = 'DISTANCE_QUOTA' AND params_json ? 'limitKm' AND params_json ? 'cycle')
    )
);

CREATE INDEX IF NOT EXISTS idx_vehicle_policies_vehicle_id ON vehicle_policies(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_policies_type_status ON vehicle_policies(policy_type, status);
CREATE INDEX IF NOT EXISTS idx_vehicle_policies_active_window ON vehicle_policies(effective_from, effective_to)
    WHERE status = 'active';

CREATE TRIGGER trigger_vehicle_policies_updated_at
    BEFORE UPDATE ON vehicle_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- admin_boundaries
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_boundaries (
    id BIGSERIAL PRIMARY KEY,
    province_code VARCHAR(32) NOT NULL,
    province_name VARCHAR(128) NOT NULL,
    geom_multipolygon geometry(MultiPolygon, 4326) NOT NULL,
    source VARCHAR(128) NOT NULL,
    source_version VARCHAR(64),
    source_license TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (province_code, source, source_version)
);

CREATE INDEX IF NOT EXISTS idx_admin_boundaries_geom ON admin_boundaries USING GIST (geom_multipolygon);
CREATE INDEX IF NOT EXISTS idx_admin_boundaries_active ON admin_boundaries(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_boundaries_province ON admin_boundaries(province_code);

CREATE TRIGGER trigger_admin_boundaries_updated_at
    BEFORE UPDATE ON admin_boundaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- vehicle_policy_state
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_policy_state (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    policy_id BIGINT NOT NULL REFERENCES vehicle_policies(id) ON DELETE CASCADE,
    spatial_state VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN' CHECK (spatial_state IN ('INSIDE', 'OUTSIDE', 'UNKNOWN', 'GPS_SUSPECT')),
    quota_state VARCHAR(16) NOT NULL DEFAULT 'UNDER_LIMIT' CHECK (quota_state IN ('UNDER_LIMIT', 'NEAR_LIMIT', 'EXCEEDED')),
    consumed_m DOUBLE PRECISION NOT NULL DEFAULT 0,
    cycle_start_at TIMESTAMPTZ,
    cycle_end_at TIMESTAMPTZ,
    last_good_fix_at TIMESTAMPTZ,
    last_evaluated_at TIMESTAMPTZ,
    last_lat DOUBLE PRECISION,
    last_lon DOUBLE PRECISION,
    last_reason_code VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vehicle_id, policy_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_policy_state_vehicle_id ON vehicle_policy_state(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_policy_state_policy_id ON vehicle_policy_state(policy_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_policy_state_quota ON vehicle_policy_state(quota_state, cycle_end_at);

CREATE TRIGGER trigger_vehicle_policy_state_updated_at
    BEFORE UPDATE ON vehicle_policy_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- policy_audit_logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS policy_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id INT REFERENCES users(id),
    action VARCHAR(64) NOT NULL,
    policy_id BIGINT REFERENCES vehicle_policies(id) ON DELETE SET NULL,
    vehicle_id VARCHAR(50) REFERENCES vehicles(vehicle_id) ON DELETE SET NULL,
    before_json JSONB,
    after_json JSONB,
    correlation_id VARCHAR(64),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_audit_logs_policy_id ON policy_audit_logs(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_audit_logs_vehicle_id ON policy_audit_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_policy_audit_logs_created_at ON policy_audit_logs(created_at DESC);

-- -----------------------------------------------------------------------------
-- Add deferred FK from alerts.geofence_id to geofences.id
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_alerts_geofence'
    ) THEN
        ALTER TABLE alerts
            ADD CONSTRAINT fk_alerts_geofence
            FOREIGN KEY (geofence_id) REFERENCES geofences(id);
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- maintenance
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maintenance (
    id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) REFERENCES vehicles(vehicle_id),
    maintenance_type maintenance_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    scheduled_date DATE,
    completed_date DATE,
    mileage_at_service INTEGER,
    next_service_mileage INTEGER,
    next_service_date DATE,
    cost DECIMAL(12,2),
    service_provider VARCHAR(200),
    status maintenance_status DEFAULT 'scheduled',
    notes TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_scheduled ON maintenance(scheduled_date);

CREATE TRIGGER trigger_maintenance_updated_at
    BEFORE UPDATE ON maintenance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
