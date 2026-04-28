import type { GeoJsonGeometry } from '@/domain/zone/types/zone.types';

const EARTH_RADIUS_METERS = 6_371_000;
const DEFAULT_SEGMENTS = 48;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

export const parseGeoJsonGeometry = (value: unknown): GeoJsonGeometry | null => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return parseGeoJsonGeometry(JSON.parse(value));
    } catch {
      return null;
    }
  }

  if (typeof value !== 'object') {
    return null;
  }

  const geometry = value as GeoJsonGeometry;
  return typeof geometry.type === 'string' ? geometry : null;
};

export const buildCircleGeometry = (
  centerLatitude: number,
  centerLongitude: number,
  radiusMeters: number,
  segments = DEFAULT_SEGMENTS,
): GeoJsonGeometry => {
  const angularDistance = radiusMeters / EARTH_RADIUS_METERS;
  const latRad = toRadians(centerLatitude);
  const lonRad = toRadians(centerLongitude);
  const coordinates: Array<[number, number]> = [];

  for (let index = 0; index <= segments; index += 1) {
    const bearing = (2 * Math.PI * index) / segments;
    const lat = Math.asin(
      Math.sin(latRad) * Math.cos(angularDistance) +
        Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const lon =
      lonRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
        Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(lat),
      );

    coordinates.push([toDegrees(lon), toDegrees(lat)]);
  }

  return {
    type: 'Polygon',
    coordinates: [coordinates],
  };
};
