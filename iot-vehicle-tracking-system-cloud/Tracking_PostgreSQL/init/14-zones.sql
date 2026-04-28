-- =============================================================================
-- 14-zones.sql
-- Unified vehicle zones and local GIS admin-unit cache
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'zone_enter';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'zone_exit';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'zone_outside_periodic';

CREATE TABLE IF NOT EXISTS gis_admin_units (
    id BIGSERIAL PRIMARY KEY,
    provider VARCHAR(64) NOT NULL DEFAULT 'gis.vn',
    unit_code VARCHAR(64) NOT NULL,
    unit_name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    level VARCHAR(32) NOT NULL CHECK (level IN ('province', 'district', 'ward')),
    parent_code VARCHAR(64),
    geom geometry(Geometry, 4326) NOT NULL,
    geometry_json JSONB,
    sync_checksum VARCHAR(128),
    sync_version VARCHAR(64),
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, unit_code)
);

CREATE INDEX IF NOT EXISTS idx_gis_admin_units_parent_code ON gis_admin_units(parent_code);
CREATE INDEX IF NOT EXISTS idx_gis_admin_units_level ON gis_admin_units(level);
CREATE INDEX IF NOT EXISTS idx_gis_admin_units_geom ON gis_admin_units USING GIST (geom);

DROP TRIGGER IF EXISTS trigger_gis_admin_units_updated_at ON gis_admin_units;

CREATE TRIGGER trigger_gis_admin_units_updated_at
    BEFORE UPDATE ON gis_admin_units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS vehicle_zones (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    zone_type VARCHAR(32) NOT NULL CHECK (zone_type IN ('circle', 'administrative_boundary')),
    center_lat DECIMAL(10,8) CHECK (center_lat BETWEEN -90 AND 90),
    center_lon DECIMAL(11,8) CHECK (center_lon BETWEEN -180 AND 180),
    radius_m DOUBLE PRECISION CHECK (radius_m > 0),
    center_source VARCHAR(32) CHECK (center_source IN ('vehicle_position', 'map_pick')),
    center_snapshot_at TIMESTAMPTZ,
    boundary_selection_json JSONB,
    geometry_json JSONB,
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    membership_state VARCHAR(16) NOT NULL DEFAULT 'unknown' CHECK (membership_state IN ('unknown', 'inside', 'outside', 'suspect')),
    last_membership_changed_at TIMESTAMPTZ,
    last_alerted_type VARCHAR(32) CHECK (last_alerted_type IN ('zone_enter', 'zone_exit', 'zone_outside_periodic')),
    last_alerted_at TIMESTAMPTZ,
    suppression_until TIMESTAMPTZ,
    alert_mode VARCHAR(32) NOT NULL DEFAULT 'transition_only' CHECK (alert_mode IN ('transition_only', 'transition_and_recovery', 'periodic_while_outside', 'silent')),
    cooldown_sec INTEGER NOT NULL DEFAULT 300 CHECK (cooldown_sec >= 0),
    warning_json JSONB,
    created_by INT REFERENCES users(id),
    updated_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vehicle_id),
    CHECK (
        (zone_type = 'circle' AND center_lat IS NOT NULL AND center_lon IS NOT NULL AND radius_m IS NOT NULL)
        OR
        (zone_type = 'administrative_boundary' AND boundary_selection_json IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_vehicle_zones_status ON vehicle_zones(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_zones_updated_at ON vehicle_zones(updated_at DESC);

DROP TRIGGER IF EXISTS trigger_vehicle_zones_updated_at ON vehicle_zones;

CREATE TRIGGER trigger_vehicle_zones_updated_at
    BEFORE UPDATE ON vehicle_zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO vehicle_zones (
    vehicle_id,
    zone_type,
    center_lat,
    center_lon,
    radius_m,
    center_source,
    center_snapshot_at,
    geometry_json,
    status,
    membership_state,
    last_membership_changed_at,
    last_alerted_at,
    suppression_until,
    alert_mode,
    cooldown_sec,
    warning_json,
    created_by,
    updated_by,
    created_at,
    updated_at
)
SELECT
    vaz.vehicle_id,
    'circle',
    vaz.center_lat,
    vaz.center_lon,
    vaz.radius_m,
    vaz.center_source,
    vaz.center_snapshot_at,
    NULL,
    vaz.status,
    vaz.last_membership_state,
    vaz.last_membership_changed_at,
    vaz.last_alerted_at,
    vaz.suppression_until,
    vaz.alert_mode,
    vaz.cooldown_sec,
    vaz.source_warning_json,
    vaz.created_by,
    vaz.updated_by,
    vaz.created_at,
    vaz.updated_at
FROM vehicle_allowed_zones vaz
ON CONFLICT (vehicle_id) DO NOTHING;
