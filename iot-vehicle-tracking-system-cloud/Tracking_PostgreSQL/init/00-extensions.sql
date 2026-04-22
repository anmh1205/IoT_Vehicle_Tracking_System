-- =============================================================================
-- 00-extensions.sql
-- PostgreSQL extensions, ENUM types, and shared trigger functions
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- =============================================================================
-- ENUM Types: Core
-- =============================================================================

CREATE TYPE device_status_enum AS ENUM ('running', 'stopped', 'disconnected', 'online');
CREATE TYPE session_status_enum AS ENUM ('running', 'completed', 'disconnected');
CREATE TYPE event_type_enum AS ENUM ('error', 'warning', 'status_change', 'validation', 'connection', 'firmware');
CREATE TYPE severity_enum AS ENUM ('debug', 'info', 'warning', 'error', 'critical');
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'firmware_status_enum') THEN
        CREATE TYPE firmware_status_enum AS ENUM (
            'assigned', 'downloading', 'verifying', 'installing',
            'rebooting', 'confirming', 'success', 'failed', 'rolled_back'
        );
    END IF;
END $$;

-- =============================================================================
-- ENUM Types: Vehicle Tracking
-- =============================================================================

CREATE TYPE vehicle_status AS ENUM ('active', 'inactive', 'maintenance', 'retired');
CREATE TYPE vehicle_type AS ENUM ('sedan', 'suv', 'hatchback', 'coupe', 'pickup', 'van', 'truck', 'motorcycle');
CREATE TYPE fuel_type AS ENUM ('gasoline', 'diesel', 'hybrid', 'electric');
CREATE TYPE transmission_type AS ENUM ('manual', 'automatic');

CREATE TYPE trip_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');

CREATE TYPE geofence_type AS ENUM ('circle', 'polygon', 'rectangle');
CREATE TYPE geofence_trigger AS ENUM ('enter', 'exit', 'both');

CREATE TYPE alert_type AS ENUM (
    'speeding', 'geofence_enter', 'geofence_exit',
    'harsh_braking', 'harsh_acceleration', 'idle_too_long',
    'low_battery', 'device_offline', 'sos', 'maintenance_due'
);
CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed');
CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE maintenance_type AS ENUM (
    'oil_change', 'tire_rotation', 'brake_service',
    'engine_service', 'transmission', 'battery',
    'inspection', 'other'
);
CREATE TYPE maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

CREATE TYPE customer_type AS ENUM ('individual', 'company');
CREATE TYPE customer_status AS ENUM ('active', 'inactive', 'suspended');

-- =============================================================================
-- ENUM Types: Audit
-- =============================================================================

CREATE TYPE user_audit_action_enum AS ENUM (
    'login', 'logout', 'create_user', 'update_user', 'delete_user',
    'change_password', 'change_role', 'grant_device_access', 'revoke_device_access'
);

CREATE TYPE device_audit_action_enum AS ENUM (
    'create', 'update', 'delete', 'config_change', 'firmware_update', 'token_regenerate'
);

CREATE TYPE firmware_audit_action_enum AS ENUM (
    'upload', 'activate', 'deactivate', 'delete', 'batch_update'
);

-- =============================================================================
-- Shared Trigger Function: auto-update updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
