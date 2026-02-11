import { pool } from '@/infrastructure/database/pool';
import type { QueryResultRow } from 'pg';

export const findOne = async <T extends QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> => {
  const result = await pool.query<T>(text, params);
  return result.rows[0] ?? null;
};

export const findMany = async <T extends QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> => {
  const result = await pool.query<T>(text, params);
  return result.rows;
};

export const insertOne = async <T extends QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T> => {
  const result = await pool.query<T>(text, params);
  return result.rows[0];
};

export const updateOne = async <T extends QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> => {
  const result = await pool.query<T>(text, params);
  return result.rows[0] ?? null;
};

export const deleteOne = async (text: string, params?: unknown[]): Promise<boolean> => {
  const result = await pool.query(text, params);
  return (result.rowCount ?? 0) > 0;
};

export const executeQuery = async (text: string, params?: unknown[]): Promise<number> => {
  const result = await pool.query(text, params);
  return result.rowCount ?? 0;
};
