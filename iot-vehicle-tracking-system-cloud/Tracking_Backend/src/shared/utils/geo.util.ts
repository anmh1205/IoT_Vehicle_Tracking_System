const EARTH_RADIUS_METERS = 6_371_000;
const COORD_EPSILON = 1e-9;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export const computeDistanceMeters = (
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): number => {
  const dLat = toRadians(toLat - fromLat);
  const dLon = toRadians(toLon - fromLon);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
};

const pointOnSegment = (
  point: [number, number],
  segStart: [number, number],
  segEnd: [number, number],
): boolean => {
  const [lat, lon] = point;
  const [latA, lonA] = segStart;
  const [latB, lonB] = segEnd;

  const cross = (lat - latA) * (lonB - lonA) - (lon - lonA) * (latB - latA);
  if (Math.abs(cross) > COORD_EPSILON) return false;

  const minLat = Math.min(latA, latB) - COORD_EPSILON;
  const maxLat = Math.max(latA, latB) + COORD_EPSILON;
  const minLon = Math.min(lonA, lonB) - COORD_EPSILON;
  const maxLon = Math.max(lonA, lonB) + COORD_EPSILON;

  return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
};

export const pointOnPolygonBoundary = (
  point: [number, number],
  polygon: Array<[number, number]>,
): boolean => {
  if (polygon.length < 2) return false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (pointOnSegment(point, polygon[j], polygon[i])) {
      return true;
    }
  }

  return false;
};

export const pointInPolygon = (
  point: [number, number],
  polygon: Array<[number, number]>,
): boolean => {
  if (polygon.length < 3) return false;

  const [lat, lon] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lonI] = polygon[i];
    const [latJ, lonJ] = polygon[j];

    const intersect =
      lonI > lon !== lonJ > lon &&
      lat < ((latJ - latI) * (lon - lonI)) / ((lonJ - lonI) || Number.EPSILON) + latI;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
};
