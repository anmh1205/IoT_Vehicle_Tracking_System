import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { seedAdmin } from './001-seed-admin';
import { User } from '../modules/auth/entities/user.entity';
import { Vehicle } from '../modules/vehicles/entities/vehicle.entity';
import { Device } from '../modules/devices/entities/device.entity';

// Load environment variables
config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vehicle_tracking',
  entities: [User, Vehicle, Device],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});

async function runSeeds() {
  try {
    console.log('🌱 Starting database seeding...');
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Run seeds
    await seedAdmin(dataSource);

    console.log('✅ All seeds completed successfully');
  } catch (error) {
    console.error('❌ Error running seeds:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runSeeds();

