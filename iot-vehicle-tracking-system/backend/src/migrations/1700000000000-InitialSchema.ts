import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL NOT NULL,
        "username" VARCHAR(50) NOT NULL UNIQUE,
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "password_hash" VARCHAR(255) NOT NULL,
        "full_name" VARCHAR(255),
        "phone" VARCHAR(20),
        "role" VARCHAR(20) DEFAULT 'staff',
        "active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // Vehicles table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vehicles" (
        "id" SERIAL NOT NULL,
        "vehicle_id" VARCHAR(50) NOT NULL UNIQUE,
        "plate_number" VARCHAR(20) NOT NULL,
        "brand" VARCHAR(100),
        "model" VARCHAR(100),
        "year" INTEGER,
        "color" VARCHAR(50),
        "vehicle_type" VARCHAR(50),
        "vin" VARCHAR(50),
        "seats" INTEGER,
        "transmission" VARCHAR(50),
        "fuel_type" VARCHAR(50),
        "mileage_km" DECIMAL(10,2) DEFAULT 0,
        "registration_number" VARCHAR(100),
        "insurance_expiry" DATE,
        "status" VARCHAR(20) DEFAULT 'active',
        "owner_id" INTEGER,
        "device_id" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vehicles" PRIMARY KEY ("id")
      )
    `);

    // Devices table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "devices" (
        "id" SERIAL NOT NULL,
        "device_id" VARCHAR(50) NOT NULL UNIQUE,
        "vehicle_id" INTEGER,
        "device_type" VARCHAR(50) DEFAULT 'tracker',
        "firmware_version" VARCHAR(20),
        "hardware_version" VARCHAR(20),
        "imei" VARCHAR(20) UNIQUE,
        "sim_card_number" VARCHAR(20),
        "status" VARCHAR(20) DEFAULT 'active',
        "last_seen" TIMESTAMP,
        "battery_level" DECIMAL(5,2),
        "signal_strength" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_devices" PRIMARY KEY ("id")
      )
    `);

    // Customers table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" SERIAL NOT NULL,
        "user_id" INTEGER,
        "full_name" VARCHAR(100) NOT NULL,
        "email" VARCHAR(100),
        "phone" VARCHAR(20) NOT NULL,
        "date_of_birth" DATE,
        "id_card_number" VARCHAR(20) UNIQUE,
        "id_card_issue_date" DATE,
        "id_card_issue_place" VARCHAR(200),
        "address" TEXT,
        "license_number" VARCHAR(50),
        "license_type" VARCHAR(20),
        "license_issue_date" DATE,
        "license_expiry_date" DATE,
        "license_issue_place" VARCHAR(200),
        "status" VARCHAR(20) DEFAULT 'active',
        "verification_status" VARCHAR(20) DEFAULT 'pending',
        "verified_by" INTEGER,
        "verified_at" TIMESTAMP,
        "total_rentals" INTEGER DEFAULT 0,
        "total_spent" DECIMAL(12,2) DEFAULT 0,
        "rating_average" DECIMAL(3,2) DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customers" PRIMARY KEY ("id")
      )
    `);

    // Trips table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trips" (
        "id" SERIAL NOT NULL,
        "booking_id" INTEGER,
        "vehicle_id" INTEGER NOT NULL,
        "customer_id" INTEGER,
        "trip_id" VARCHAR(50) NOT NULL UNIQUE,
        "start_time" TIMESTAMP NOT NULL,
        "end_time" TIMESTAMP,
        "start_location_lat" DECIMAL(10,8),
        "start_location_lon" DECIMAL(11,8),
        "end_location_lat" DECIMAL(10,8),
        "end_location_lon" DECIMAL(11,8),
        "distance_km" DECIMAL(10,2),
        "duration_minutes" INTEGER,
        "max_speed" DECIMAL(5,2),
        "avg_speed" DECIMAL(5,2),
        "mileage_at_start" INTEGER,
        "mileage_at_end" INTEGER,
        "status" VARCHAR(20) DEFAULT 'in_progress',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trips" PRIMARY KEY ("id")
      )
    `);

    // Trip Events table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trip_events" (
        "id" SERIAL NOT NULL,
        "trip_id" INTEGER NOT NULL,
        "event_type" VARCHAR(50) NOT NULL,
        "event_time" TIMESTAMP NOT NULL,
        "location_lat" DECIMAL(10,8),
        "location_lon" DECIMAL(11,8),
        "speed" DECIMAL(5,2),
        "description" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trip_events" PRIMARY KEY ("id")
      )
    `);

    // Alerts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "alerts" (
        "id" SERIAL NOT NULL,
        "vehicle_id" INTEGER,
        "booking_id" INTEGER,
        "device_id" INTEGER,
        "alert_type" VARCHAR(50) NOT NULL,
        "severity" VARCHAR(20) DEFAULT 'medium',
        "title" VARCHAR(200),
        "message" TEXT,
        "location_lat" DECIMAL(10,8),
        "location_lon" DECIMAL(11,8),
        "acknowledged" BOOLEAN DEFAULT false,
        "acknowledged_at" TIMESTAMP,
        "acknowledged_by" INTEGER,
        "resolved" BOOLEAN DEFAULT false,
        "resolved_at" TIMESTAMP,
        "resolved_by" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alerts" PRIMARY KEY ("id")
      )
    `);

    // Violations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "violations" (
        "id" SERIAL NOT NULL,
        "trip_id" INTEGER,
        "vehicle_id" INTEGER NOT NULL,
        "violation_type" VARCHAR(50) NOT NULL,
        "violation_time" TIMESTAMP NOT NULL,
        "location_lat" DECIMAL(10,8),
        "location_lon" DECIMAL(11,8),
        "speed_limit" DECIMAL(5,2),
        "actual_speed" DECIMAL(5,2),
        "severity" VARCHAR(20),
        "description" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_violations" PRIMARY KEY ("id")
      )
    `);

    // Geofences table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "geofences" (
        "id" SERIAL NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "geofence_type" VARCHAR(20) DEFAULT 'circle',
        "center_lat" DECIMAL(10,8),
        "center_lon" DECIMAL(11,8),
        "radius_meters" INTEGER,
        "coordinates" JSONB,
        "alert_on_entry" BOOLEAN DEFAULT false,
        "alert_on_exit" BOOLEAN DEFAULT true,
        "enabled" BOOLEAN DEFAULT true,
        "created_by" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_geofences" PRIMARY KEY ("id")
      )
    `);

    // Vehicle Geofences (many-to-many)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vehicle_geofences" (
        "id" SERIAL NOT NULL,
        "vehicle_id" INTEGER NOT NULL,
        "geofence_id" INTEGER NOT NULL,
        "assigned_at" TIMESTAMP NOT NULL DEFAULT now(),
        "is_active" BOOLEAN DEFAULT true,
        CONSTRAINT "PK_vehicle_geofences" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_vehicle_geofences" UNIQUE ("vehicle_id", "geofence_id")
      )
    `);

    // Maintenance Records table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "maintenance_records" (
        "id" SERIAL NOT NULL,
        "vehicle_id" INTEGER NOT NULL,
        "maintenance_type" VARCHAR(50) NOT NULL,
        "description" TEXT,
        "cost" DECIMAL(10,2),
        "mileage_km" INTEGER,
        "performed_by" VARCHAR(100),
        "next_maintenance_date" DATE,
        "next_maintenance_mileage" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_maintenance_records" PRIMARY KEY ("id")
      )
    `);

    // Commands table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "commands" (
        "id" SERIAL NOT NULL,
        "device_id" INTEGER NOT NULL,
        "command_type" VARCHAR(50) NOT NULL,
        "command_data" JSONB,
        "status" VARCHAR(20) DEFAULT 'pending',
        "sent_at" TIMESTAMP,
        "acknowledged_at" TIMESTAMP,
        "response_data" JSONB,
        "created_by" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_commands" PRIMARY KEY ("id")
      )
    `);

    // Notifications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" SERIAL NOT NULL,
        "user_id" INTEGER,
        "type" VARCHAR(20) NOT NULL,
        "subject" VARCHAR(255) NOT NULL,
        "message" TEXT NOT NULL,
        "recipient" VARCHAR(500),
        "status" VARCHAR(20) DEFAULT 'pending',
        "metadata" JSONB,
        "error_message" TEXT,
        "sent_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);

    // Foreign Keys
    await queryRunner.query(`
      ALTER TABLE "vehicles" 
      ADD CONSTRAINT "FK_vehicles_owner" 
      FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "devices" 
      ADD CONSTRAINT "FK_devices_vehicle" 
      FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "customers" 
      ADD CONSTRAINT "FK_customers_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "customers" 
      ADD CONSTRAINT "FK_customers_verifier" 
      FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "trips" 
      ADD CONSTRAINT "FK_trips_vehicle" 
      FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "trips" 
      ADD CONSTRAINT "FK_trips_customer" 
      FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "trip_events" 
      ADD CONSTRAINT "FK_trip_events_trip" 
      FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "alerts" 
      ADD CONSTRAINT "FK_alerts_vehicle" 
      FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "alerts" 
      ADD CONSTRAINT "FK_alerts_device" 
      FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "alerts" 
      ADD CONSTRAINT "FK_alerts_acknowledger" 
      FOREIGN KEY ("acknowledged_by") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "alerts" 
      ADD CONSTRAINT "FK_alerts_resolver" 
      FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "violations" 
      ADD CONSTRAINT "FK_violations_trip" 
      FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "violations" 
      ADD CONSTRAINT "FK_violations_vehicle" 
      FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "geofences" 
      ADD CONSTRAINT "FK_geofences_creator" 
      FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "vehicle_geofences" 
      ADD CONSTRAINT "FK_vehicle_geofences_vehicle" 
      FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "vehicle_geofences" 
      ADD CONSTRAINT "FK_vehicle_geofences_geofence" 
      FOREIGN KEY ("geofence_id") REFERENCES "geofences"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "maintenance_records" 
      ADD CONSTRAINT "FK_maintenance_vehicle" 
      FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "commands" 
      ADD CONSTRAINT "FK_commands_device" 
      FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "commands" 
      ADD CONSTRAINT "FK_commands_creator" 
      FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications" 
      ADD CONSTRAINT "FK_notifications_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    // Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehicles_vehicle_id" ON "vehicles" ("vehicle_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehicles_plate_number" ON "vehicles" ("plate_number")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehicles_status" ON "vehicles" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_devices_device_id" ON "devices" ("device_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_devices_vehicle_id" ON "devices" ("vehicle_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_devices_status" ON "devices" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_devices_last_seen" ON "devices" ("last_seen")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customers_phone" ON "customers" ("phone")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customers_id_card" ON "customers" ("id_card_number")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customers_status" ON "customers" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customers_verification_status" ON "customers" ("verification_status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_trips_trip_id" ON "trips" ("trip_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_trips_vehicle_id" ON "trips" ("vehicle_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_trips_start_time" ON "trips" ("start_time" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_trips_status" ON "trips" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_trip_events_trip_id" ON "trip_events" ("trip_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_trip_events_event_time" ON "trip_events" ("event_time" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_alerts_vehicle_id" ON "alerts" ("vehicle_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_alerts_alert_type" ON "alerts" ("alert_type")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_alerts_severity" ON "alerts" ("severity")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_alerts_acknowledged" ON "alerts" ("acknowledged")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_alerts_created_at" ON "alerts" ("created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_violations_vehicle_id" ON "violations" ("vehicle_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_violations_trip_id" ON "violations" ("trip_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_violations_violation_type" ON "violations" ("violation_type")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_violations_violation_time" ON "violations" ("violation_time" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_geofences_enabled" ON "geofences" ("enabled")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_maintenance_vehicle_id" ON "maintenance_records" ("vehicle_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_maintenance_next_date" ON "maintenance_records" ("next_maintenance_date")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_commands_device_id" ON "commands" ("device_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_commands_status" ON "commands" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_user_id" ON "notifications" ("user_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_status" ON "notifications" ("status", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_type" ON "notifications" ("type", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_commands_created_at" ON "commands" ("created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_commands_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_commands_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_commands_device_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_maintenance_next_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_maintenance_vehicle_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_geofences_enabled"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_violations_violation_time"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_violations_violation_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_violations_trip_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_violations_vehicle_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_alerts_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_alerts_acknowledged"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_alerts_severity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_alerts_alert_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_alerts_vehicle_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trip_events_event_time"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trip_events_trip_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trips_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trips_start_time"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trips_vehicle_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trips_trip_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customers_verification_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customers_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customers_id_card"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customers_phone"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_devices_last_seen"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_devices_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_devices_vehicle_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_devices_device_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vehicles_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vehicles_plate_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vehicles_vehicle_id"`);

    // Drop foreign keys
    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_notifications_user"`);
    await queryRunner.query(`ALTER TABLE "commands" DROP CONSTRAINT IF EXISTS "FK_commands_creator"`);
    await queryRunner.query(`ALTER TABLE "commands" DROP CONSTRAINT IF EXISTS "FK_commands_device"`);
    await queryRunner.query(`ALTER TABLE "maintenance_records" DROP CONSTRAINT IF EXISTS "FK_maintenance_vehicle"`);
    await queryRunner.query(`ALTER TABLE "vehicle_geofences" DROP CONSTRAINT IF EXISTS "FK_vehicle_geofences_geofence"`);
    await queryRunner.query(`ALTER TABLE "vehicle_geofences" DROP CONSTRAINT IF EXISTS "FK_vehicle_geofences_vehicle"`);
    await queryRunner.query(`ALTER TABLE "geofences" DROP CONSTRAINT IF EXISTS "FK_geofences_creator"`);
    await queryRunner.query(`ALTER TABLE "violations" DROP CONSTRAINT IF EXISTS "FK_violations_vehicle"`);
    await queryRunner.query(`ALTER TABLE "violations" DROP CONSTRAINT IF EXISTS "FK_violations_trip"`);
    await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT IF EXISTS "FK_alerts_resolver"`);
    await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT IF EXISTS "FK_alerts_acknowledger"`);
    await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT IF EXISTS "FK_alerts_device"`);
    await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT IF EXISTS "FK_alerts_vehicle"`);
    await queryRunner.query(`ALTER TABLE "trip_events" DROP CONSTRAINT IF EXISTS "FK_trip_events_trip"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT IF EXISTS "FK_trips_customer"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT IF EXISTS "FK_trips_vehicle"`);
    await queryRunner.query(`ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "FK_customers_verifier"`);
    await queryRunner.query(`ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "FK_customers_user"`);
    await queryRunner.query(`ALTER TABLE "devices" DROP CONSTRAINT IF EXISTS "FK_devices_vehicle"`);
    await queryRunner.query(`ALTER TABLE "vehicles" DROP CONSTRAINT IF EXISTS "FK_vehicles_owner"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "commands"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "maintenance_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vehicle_geofences"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "geofences"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "violations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "alerts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trips"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "devices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vehicles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}

