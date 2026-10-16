import { Pool } from 'pg';
import { dbConfig } from '../config/env';

/** Single shared PostgreSQL pool for MQTT Bridge repositories. */
export const pool = new Pool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  max: 20,
});
