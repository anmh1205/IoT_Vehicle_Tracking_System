import { queryRange } from '@/domain/system-admin/repositories/victoriametrics.repository';
import { findMany } from '@/infrastructure/database/queries';

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

interface EventLogWaypointRow {
  telemetry_timestamp: Date;
  lat: string | null;
  lon: string | null;
  speed: string | null;
  course: string | null;
}

const STEP_TO_SECONDS: Record<string, number> = {
  '15s': 15,
  '1m': 60,
  '5m': 300,
  '10m': 600,
};

const toFiniteNumber = (value: string | null): number | null => {
  if (value === null || value.trim().length === 0) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getEventLogWaypoints = async (
  deviceId: string,
  startTime: Date,
  endTime: Date,
  step: string,
): Promise<TripWaypoint[]> => {
  const rows = await findMany<EventLogWaypointRow>(
    `SELECT
        COALESCE(device_timestamp, server_timestamp) AS telemetry_timestamp,
        COALESCE(context#>>'{raw_payload,data,latitude}', context->>'latitude', metadata->>'latitude') AS lat,
        COALESCE(context#>>'{raw_payload,data,longitude}', context->>'longitude', metadata->>'longitude') AS lon,
        COALESCE(context#>>'{raw_payload,data,speed}', context->>'speed', metadata->>'speed') AS speed,
        COALESCE(context#>>'{raw_payload,data,course}', context->>'course', metadata->>'course') AS course
     FROM event_logs
     WHERE device_id = $1
       AND COALESCE(device_timestamp, server_timestamp) BETWEEN $2 AND $3
       AND ((context#>>'{raw_payload,data,latitude}') IS NOT NULL OR context ? 'latitude' OR metadata ? 'latitude')
       AND ((context#>>'{raw_payload,data,longitude}') IS NOT NULL OR context ? 'longitude' OR metadata ? 'longitude')
     ORDER BY telemetry_timestamp ASC, server_timestamp ASC
     LIMIT 5000`,
    [deviceId, startTime.toISOString(), endTime.toISOString()],
  );

  const minGapSeconds = STEP_TO_SECONDS[step] ?? STEP_TO_SECONDS['15s'];
  let previousTimestamp = 0;

  return rows.flatMap((row) => {
    const lat = toFiniteNumber(row.lat);
    const lon = toFiniteNumber(row.lon);
    if (lat === null || lon === null || (lat === 0 && lon === 0)) {
      return [];
    }

    const ts = Math.floor(row.telemetry_timestamp.getTime() / 1000);
    if (previousTimestamp > 0 && ts - previousTimestamp < minGapSeconds) {
      return [];
    }
    previousTimestamp = ts;

    return [{
      ts,
      timestamp: row.telemetry_timestamp.toISOString(),
      lat,
      lon,
      speed: toFiniteNumber(row.speed),
      course: toFiniteNumber(row.course),
    }];
  });
};

/**
 * Query VictoriaMetrics for GPS waypoints during a trip's time range.
 * Merges tracker_telemetry_latitude, tracker_telemetry_longitude,
 * tracker_telemetry_speed, and tracker_telemetry_course series
 * into unified waypoint objects aligned by timestamp.
 */
export const getWaypoints = async (
  deviceId: string,
  startTime: Date,
  endTime: Date,
  step = '15s',
): Promise<TripWaypoint[]> => {
  const eventLogWaypoints = await getEventLogWaypoints(deviceId, startTime, endTime, step);
  if (eventLogWaypoints.length > 0) {
    return eventLogWaypoints;
  }

  const startSec = Math.floor(startTime.getTime() / 1000);
  const endSec = Math.floor(endTime.getTime() / 1000);

  // Query all metrics in parallel
  const [latResult, lonResult, spdResult, crsResult] = await Promise.all([
    queryRange(`tracker_telemetry_latitude{device_id="${deviceId}"}`, startSec, endSec, step),
    queryRange(`tracker_telemetry_longitude{device_id="${deviceId}"}`, startSec, endSec, step),
    queryRange(`tracker_telemetry_speed{device_id="${deviceId}"}`, startSec, endSec, step),
    queryRange(`tracker_telemetry_course{device_id="${deviceId}"}`, startSec, endSec, step),
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
