import { pool } from '@/infrastructure/database/pool';
import { tripReadScopeParams, tripVisibleTo, type TripReadScope } from '@/domain/trip/repositories/trip-read-scope';
import type {
  FuelDateRange,
  FuelInterval,
  FuelSummary,
  VehicleFuelData,
  FuelTrend,
} from '@/domain/fuel-analytics/types/fuel-analytics.types';

interface SummaryRow {
  total_fuel: string;
  total_distance: string;
  trip_count: string;
}

export const getSummary = async (range: FuelDateRange, actor: TripReadScope): Promise<FuelSummary> => {
  const query = `
    SELECT
      COALESCE(SUM(fuel_used_liters), 0)::text AS total_fuel,
      COALESCE(SUM(distance_km), 0)::text AS total_distance,
      COUNT(*)::text AS trip_count
    FROM trips t
    WHERE COALESCE(actual_start, planned_start, created_at) BETWEEN $1 AND $2
      AND fuel_used_liters IS NOT NULL
      AND fuel_used_liters > 0
      AND ${tripVisibleTo(actor, 3)}
  `;

  const result = await pool.query<SummaryRow>(query, [range.from, range.to, ...tripReadScopeParams(actor)]);
  const row = result.rows[0];

  const totalFuelUsed = parseFloat(row?.total_fuel ?? '0');
  const totalDistance = parseFloat(row?.total_distance ?? '0');
  const tripCount = parseInt(row?.trip_count ?? '0', 10);
  const avgConsumption = totalDistance > 0 ? (totalFuelUsed / totalDistance) * 100 : 0;

  return {
    totalFuelUsed: Math.round(totalFuelUsed * 100) / 100,
    totalDistance: Math.round(totalDistance * 100) / 100,
    avgConsumption: Math.round(avgConsumption * 100) / 100,
    totalCost: 0,
    tripCount,
  };
};

interface VehicleFuelRow {
  vehicle_id: string;
  plate_number: string;
  total_fuel: string;
  total_distance: string;
  trip_count: string;
}

export const getByVehicle = async (range: FuelDateRange, actor: TripReadScope): Promise<VehicleFuelData[]> => {
  const query = `
    SELECT
      t.vehicle_id,
      COALESCE(v.plate_number, t.vehicle_id) AS plate_number,
      COALESCE(SUM(t.fuel_used_liters), 0)::text AS total_fuel,
      COALESCE(SUM(t.distance_km), 0)::text AS total_distance,
      COUNT(*)::text AS trip_count
    FROM trips t
    LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
    WHERE COALESCE(t.actual_start, t.planned_start, t.created_at) BETWEEN $1 AND $2
      AND t.fuel_used_liters IS NOT NULL
      AND t.fuel_used_liters > 0
      AND t.vehicle_id IS NOT NULL
      AND ${tripVisibleTo(actor, 3)}
    GROUP BY t.vehicle_id, v.plate_number
    ORDER BY SUM(t.fuel_used_liters) DESC, t.vehicle_id
  `;

  const result = await pool.query<VehicleFuelRow>(query, [range.from, range.to, ...tripReadScopeParams(actor)]);

  return result.rows.map((row) => {
    const totalFuel = parseFloat(row.total_fuel);
    const totalDistance = parseFloat(row.total_distance);
    const avgConsumption = totalDistance > 0 ? (totalFuel / totalDistance) * 100 : 0;

    return {
      vehicleId: row.vehicle_id,
      plateNumber: row.plate_number,
      totalFuel: Math.round(totalFuel * 100) / 100,
      totalDistance: Math.round(totalDistance * 100) / 100,
      avgConsumption: Math.round(avgConsumption * 100) / 100,
      tripCount: parseInt(row.trip_count, 10),
    };
  });
};

const toSeriesStep = (interval: FuelInterval): string => {
  if (interval === 'month') return '1 month';
  if (interval === 'week') return '1 week';
  return '1 day';
};

interface TrendRow {
  label: Date;
  fuel_used: string;
  distance: string;
}

export const getTrends = async (
  range: FuelDateRange,
  interval: FuelInterval,
  actor: TripReadScope,
): Promise<FuelTrend[]> => {
  const step = toSeriesStep(interval);
  const query = `
    WITH series AS (
      SELECT generate_series(
        DATE_TRUNC($4, $1::timestamptz),
        DATE_TRUNC($4, $2::timestamptz),
        $3::interval
      ) AS bucket
    ),
    bucketed AS (
      SELECT
        DATE_TRUNC($4, COALESCE(actual_start, planned_start, created_at)) AS bucket,
        COALESCE(SUM(fuel_used_liters), 0)::text AS fuel_used,
        COALESCE(SUM(distance_km), 0)::text AS distance
      FROM trips t
      WHERE COALESCE(actual_start, planned_start, created_at) BETWEEN $1 AND $2
        AND fuel_used_liters IS NOT NULL
        AND fuel_used_liters > 0
        AND ${tripVisibleTo(actor, 5)}
      GROUP BY bucket
    )
    SELECT
      series.bucket AS label,
      COALESCE(bucketed.fuel_used, '0') AS fuel_used,
      COALESCE(bucketed.distance, '0') AS distance
    FROM series
    LEFT JOIN bucketed ON bucketed.bucket = series.bucket
    ORDER BY label ASC
  `;

  const result = await pool.query<TrendRow>(query, [range.from, range.to, step, interval, ...tripReadScopeParams(actor)]);

  return result.rows.map((row) => {
    const fuelUsed = parseFloat(row.fuel_used);
    const distance = parseFloat(row.distance);
    const consumption = distance > 0 ? (fuelUsed / distance) * 100 : 0;

    return {
      date: row.label.toISOString(),
      fuelUsed: Math.round(fuelUsed * 100) / 100,
      distance: Math.round(distance * 100) / 100,
      consumption: Math.round(consumption * 100) / 100,
    };
  });
};
