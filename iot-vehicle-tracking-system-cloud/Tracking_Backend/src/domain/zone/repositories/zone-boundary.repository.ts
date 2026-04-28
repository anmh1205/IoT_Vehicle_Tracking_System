import type { QueryResultRow } from 'pg';
import { findMany, findOne } from '@/infrastructure/database/queries';
import type { SearchZoneBoundariesQuery, ZoneBoundaryLevel } from '@/domain/zone/types/zone.types';

export interface ZoneBoundaryRow extends QueryResultRow {
  provider: string;
  unit_code: string;
  unit_name: string;
  full_name: string | null;
  level: ZoneBoundaryLevel;
  parent_code: string | null;
  sync_version: string | null;
  synced_at: Date | null;
}

interface ResolveBoundariesRow extends ZoneBoundaryRow {
  geometry_json: string | null;
}

const DEFAULT_LIMIT = 30;

export const searchBoundaries = async (
  query: SearchZoneBoundariesQuery,
): Promise<ZoneBoundaryRow[]> => {
  const clauses = ['1 = 1'];
  const values: unknown[] = [];
  let index = 1;

  if (query.level) {
    clauses.push(`level = $${index++}`);
    values.push(query.level);
  }

  if (query.parentCode) {
    clauses.push(`parent_code = $${index++}`);
    values.push(query.parentCode);
  }

  if (query.query?.trim()) {
    clauses.push(
      `(unit_name ILIKE $${index} OR COALESCE(full_name, '') ILIKE $${index} OR unit_code ILIKE $${index})`,
    );
    values.push(`%${query.query.trim()}%`);
    index += 1;
  }

  values.push(Math.max(1, Math.min(query.limit ?? DEFAULT_LIMIT, 100)));

  return findMany<ZoneBoundaryRow>(
    `SELECT provider, unit_code, unit_name, full_name, level, parent_code, sync_version, synced_at
     FROM gis_admin_units
     WHERE ${clauses.join(' AND ')}
     ORDER BY
       CASE level
         WHEN 'province' THEN 1
         WHEN 'district' THEN 2
         ELSE 3
       END,
       unit_name ASC
     LIMIT $${index}`,
    values,
  );
};

export const resolveBoundaries = async (
  selections: Array<{ provider: string; unitCode: string }>,
): Promise<ResolveBoundariesRow[]> => {
  if (selections.length === 0) {
    return [];
  }

  const keys = selections.map(({ provider, unitCode }) => `${provider}:${unitCode}`);

  return findMany<ResolveBoundariesRow>(
    `SELECT
       provider,
       unit_code,
       unit_name,
       full_name,
       level,
       parent_code,
       sync_version,
       synced_at,
       ST_AsGeoJSON(geom)::text AS geometry_json
     FROM gis_admin_units
     WHERE (provider || ':' || unit_code) = ANY($1::text[])`,
    [keys],
  );
};

export const resolveMergedGeometry = async (
  selections: Array<{ provider: string; unitCode: string }>,
): Promise<string | null> => {
  if (selections.length === 0) {
    return null;
  }

  const keys = selections.map(({ provider, unitCode }) => `${provider}:${unitCode}`);
  const row = await findOne<{ geometry_json: string | null }>(
    `SELECT ST_AsGeoJSON(ST_UnaryUnion(ST_Collect(geom)))::text AS geometry_json
     FROM gis_admin_units
     WHERE (provider || ':' || unit_code) = ANY($1::text[])`,
    [keys],
  );

  return row?.geometry_json ?? null;
};
