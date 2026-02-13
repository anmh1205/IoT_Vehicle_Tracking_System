import { Pool } from 'pg';
import { dbConfig } from '@/config/env';

export const pool = new Pool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  max: dbConfig.connectionLimit,
});

export const query = (text: string, params?: unknown[]) => pool.query(text, params);

export const closePool = () => pool.end();
