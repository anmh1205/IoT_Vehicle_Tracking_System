import { createConflictError } from '@/shared/utils/errors.util';
import { parseGeoJsonGeometry } from '@/shared/utils/zone-geometry.util';
import * as zoneBoundaryRepo from '@/domain/zone/repositories/zone-boundary.repository';
import type { ResolveZoneBoundariesInput, ResolveZoneBoundariesResult, SearchZoneBoundariesQuery, ZoneBoundarySelection, ZoneBoundaryUnit } from '@/domain/zone/types/zone.types';

const DEFAULT_PROVIDER = 'gis.vn';

const toSelection = (row: zoneBoundaryRepo.ZoneBoundaryRow): ZoneBoundarySelection => ({
  provider: row.provider,
  unitCode: row.unit_code,
  unitName: row.unit_name,
  fullName: row.full_name,
  level: row.level,
  parentCode: row.parent_code,
});

export const searchZoneBoundaries = async (
  query: SearchZoneBoundariesQuery,
): Promise<ZoneBoundaryUnit[]> => {
  const rows = await zoneBoundaryRepo.searchBoundaries(query);

  return rows.map((row) => ({
    ...toSelection(row),
    syncVersion: row.sync_version,
    syncedAt: row.synced_at?.toISOString() ?? null,
  }));
};

export const resolveZoneBoundaries = async (
  input: ResolveZoneBoundariesInput,
): Promise<ResolveZoneBoundariesResult> => {
  const selections = input.selections.map((selection) => ({
    provider: selection.provider?.trim() || DEFAULT_PROVIDER,
    unitCode: selection.unitCode.trim(),
  }));

  const rows = await zoneBoundaryRepo.resolveBoundaries(selections);
  if (rows.length !== selections.length) {
    const resolvedKeys = new Set(rows.map((row) => `${row.provider}:${row.unit_code}`));
    const missing = selections
      .map(({ provider, unitCode }) => `${provider}:${unitCode}`)
      .filter((key) => !resolvedKeys.has(key));
    throw createConflictError(`Boundary selections could not be resolved from local cache: ${missing.join(', ')}`);
  }

  const geometry = parseGeoJsonGeometry(await zoneBoundaryRepo.resolveMergedGeometry(selections));
  return {
    selections: rows.map((row) => toSelection(row)),
    geometry,
  };
};
