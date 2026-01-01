# Database Migrations

This directory contains TypeORM migration files for the database schema.

## Running Migrations

### Generate a new migration
```bash
npm run migration:generate -- src/migrations/MigrationName
```

### Create an empty migration
```bash
npm run migration:create -- src/migrations/MigrationName
```

### Run pending migrations
```bash
npm run migration:run
```

### Revert the last migration
```bash
npm run migration:revert
```

### Show migration status
```bash
npm run migration:show
```

## Initial Schema

The initial migration (`1700000000000-InitialSchema.ts`) creates all required tables:

- `users` - System users (admin/staff)
- `vehicles` - Vehicle information
- `devices` - Tracking devices
- `customers` - Customer information
- `trips` - Trip/journey records
- `trip_events` - Events during trips
- `alerts` - System alerts
- `violations` - Traffic violations
- `geofences` - Geofence definitions
- `vehicle_geofences` - Vehicle-geofence relationships
- `maintenance_records` - Vehicle maintenance records
- `commands` - Device commands

## Important Notes

- **Never use `synchronize: true` in production**
- Always test migrations on development/staging first
- Backup database before running migrations in production
- Migrations are run automatically in development if `synchronize: true` is set

