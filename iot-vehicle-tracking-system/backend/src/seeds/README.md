# Database Seeds

This directory contains seed files for populating the database with initial data.

## Running Seeds

### Run all seeds
```bash
npm run seed
```

## Available Seeds

### 001-seed-admin.ts
Creates the default admin user:
- **Username**: `admin`
- **Email**: `admin@example.com`
- **Password**: `admin123` (⚠️ Change after first login!)
- **Role**: `admin`

## Adding New Seeds

1. Create a new seed file: `XXX-seed-name.ts`
2. Export a function that accepts `DataSource` as parameter
3. Import and call it in `run-seeds.ts`

Example:
```typescript
export async function seedName(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(Entity);
  // Your seed logic here
}
```

## Important Notes

- Seeds check for existing data to avoid duplicates
- Seeds should be idempotent (safe to run multiple times)
- Always verify seed data after running

