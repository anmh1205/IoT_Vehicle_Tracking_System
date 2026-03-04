import { queryRange } from '@/domain/system-admin/repositories/victoriametrics.repository';
import type { VmRangeValue } from '@/domain/system-admin/repositories/victoriametrics.repository';

/** A single GPS waypoint along the trip route */
export interface TripWaypoint {
  ts: number;
  timestamp: string;
  lat: number;
  lon: number;
  speed: number | null;
  course: number | null;
}

/** Summary stats computed from waypoints */
export interface TripRouteSummary {
  distanceKm: number;
  durationMinutes: number;
  maxSpeed: number;
  avgSpeed: number;
  startLat: number | null;
  startLon: number | null;
  endLat: number | null;
  endLon: number | null;
}

/**
 * Query VictoriaMetrics for GPS waypoints during a trip's time range.
 * Merges vehicle_latitude, vehicle_longitude, vehicle_speed, vehicle_course series
 * into unified waypoint objects aligned by timestamp.
 */
export const getWaypoints = async (
  deviceId: string,
  startTime: Date,
  endTime: Date,
  step = '15s',
): Promise<TripWaypoint[]> => {
  const startSec = Math.floor(startTime.getTime() / 1000);
  const endSec = Math.floor(endTime.getTime() / 1000);

  // Query all metrics in parallel
  const [latResult, lonResult, spdResult, crsResult] = await Promise.all([
    queryRange(`vehicle_latitude{device_id="${deviceId}"}`, startSec, endSec, step),
    queryRange(`vehicle_longitude{device_id="${deviceId}"}`, startSec, endSec, step),
    queryRange(`vehicle_speed{device_id="${deviceId}"}`, startSec, endSec, step),
    queryRange(`vehicle_course{device_id="${deviceId}"}`, startSec, endSec, step),
  ]);

  const latValues = latResult.series[0]?.values ?? [];
  const lonValues = lonResult.series[0]?.values ?? [];
  const spdValues = spdResult.series[0]?.values ?? [];
  const crsValues = crsResult.series[0]?.values ?? [];

  // Index speed and course by timestamp for fast lookup
  const spdMap = new Map<number, number>(spdValues.map((v) => [v.timestamp, v.value]));
  const crsMap = new Map<number, number>(crsValues.map((v) => [v.timestamp, v.value]));

  // Build lon lookup map
  const lonMap = new Map<number, number>(lonValues.map((v) => [v.timestamp, v.value]));

  // Merge: iterate over latitude points, match with longitude by timestamp
  const waypoints: TripWaypoint[] = [];
  for (const latPoint of latValues) {
    const lon = lonMap.get(latPoint.timestamp);
    if (lon === undefined) continue;

    // Skip invalid coordinates (0,0 or NaN)
    if (latPoint.value === 0 && lon === 0) continue;
    if (isNaN(latPoint.value) || isNaN(lon)) continue;

    waypoints.push({
      ts: latPoint.timestamp,
      timestamp: new Date(latPoint.timestamp * 1000).toISOString(),
      lat: latPoint.value,
      lon,
      speed: spdMap.get(latPoint.timestamp) ?? null,
      course: crsMap.get(latPoint.timestamp) ?? null,
    });
  }

  return waypoints;
};

/** Haversine distance between two GPS points in km */
const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Compute route summary from waypoints */
export const computeRouteSummary = (
  waypoints: TripWaypoint[],
  startTime: Date,
  endTime: Date,
): TripRouteSummary => {
  let distanceKm = 0;
  let maxSpeed = 0;
  let totalSpeed = 0;
  let speedCount = 0;

  for (let i = 1; i < waypoints.length; i++) {
    distanceKm += haversineKm(
      waypoints[i - 1].lat,
      waypoints[i - 1].lon,
      waypoints[i].lat,
      waypoints[i].lon,
    );
  }

  for (const wp of waypoints) {
    if (wp.speed !== null) {
      if (wp.speed > maxSpeed) maxSpeed = wp.speed;
      totalSpeed += wp.speed;
      speedCount++;
    }
  }

  const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;

  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    durationMinutes: Math.round(durationMinutes),
    maxSpeed: Math.round(maxSpeed * 100) / 100,
    avgSpeed: speedCount > 0 ? Math.round((totalSpeed / speedCount) * 100) / 100 : 0,
    startLat: waypoints[0]?.lat ?? null,
    startLon: waypoints[0]?.lon ?? null,
    endLat: waypoints[waypoints.length - 1]?.lat ?? null,
    endLon: waypoints[waypoints.length - 1]?.lon ?? null,
  };
};
