import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

// Note: DataSource cannot use NestJS ConfigService directly
// It runs outside of NestJS context, so we use process.env
// When running locally (not in Docker), use localhost instead of 'postgres'
const isDocker = process.env.DOCKER_ENV === 'true' || process.env.DB_HOST === 'postgres';
const dbHost = isDocker ? (process.env.DB_HOST || 'postgres') : 'localhost';

export default new DataSource({
  type: 'postgres',
  host: dbHost,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vehicle_tracking',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});

