import { DEFAULT_MAP_VIEWPORT } from '@/features/map/constants/map-config';
import {
  isMapShareableHardMode,
  resolveMapHardMode,
} from '@/features/map/lib/map-mode';
import type {
  MapHardMode,
  MapLayer,
  MapShareableHardMode,
  MapViewport,
} from '@/features/map/types';

export const MAP_URL_PARAM_KEYS = {
  device: 'device',
  latitude: 'lat',
  longitude: 'lng',
  zoom: 'z',
  layer: 'layer',
  follow: 'follow',
  geofences: 'geofences',
  mode: 'mode',
} as const;

export interface MapUrlState {
  selectedDeviceId: string | null;
  mapViewport: MapViewport;
  mapLayer: MapLayer;
  followMode: boolean;
  showGeofences: boolean;
  hardMode: MapShareableHardMode;
}

const parseFiniteNumber = (value: string | null, fallback: number) => {
  if (value === null || value.trim().length === 0) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBooleanFlag = (value: string | null) =>
  value === '1' || value === 'true' || value === 'yes';

const parseMapLayer = (value: string | null): MapLayer =>
  value === 'street' ? 'street' : 'satellite';

export const createMapUrlState = (
  input: Partial<MapUrlState> & { hardMode?: MapHardMode | MapShareableHardMode | null },
): MapUrlState => {
  const selectedDeviceId = input.selectedDeviceId?.trim() || null;
  const requestedMode = isMapShareableHardMode(input.hardMode ?? null)
    ? input.hardMode
    : 'browse';
  const hardMode = resolveMapHardMode(
    requestedMode,
    selectedDeviceId,
  ) as MapShareableHardMode;

  return {
    selectedDeviceId,
    mapViewport: {
      center: [
        parseFiniteNumber(
          input.mapViewport?.center?.[0] != null
            ? String(input.mapViewport.center[0])
            : null,
          DEFAULT_MAP_VIEWPORT.center[0],
        ),
        parseFiniteNumber(
          input.mapViewport?.center?.[1] != null
            ? String(input.mapViewport.center[1])
            : null,
          DEFAULT_MAP_VIEWPORT.center[1],
        ),
      ],
      zoom: parseFiniteNumber(
        input.mapViewport?.zoom != null ? String(input.mapViewport.zoom) : null,
        DEFAULT_MAP_VIEWPORT.zoom,
      ),
    },
    mapLayer: input.mapLayer === 'street' ? 'street' : 'satellite',
    followMode: selectedDeviceId ? Boolean(input.followMode) : false,
    showGeofences: Boolean(input.showGeofences),
    hardMode,
  };
};

export const parseMapUrlState = (
  searchParams: Pick<URLSearchParams, 'get'>,
): MapUrlState => {
  const selectedDeviceId = searchParams.get(MAP_URL_PARAM_KEYS.device)?.trim() || null;
  const modeParam = searchParams.get(MAP_URL_PARAM_KEYS.mode);

  return createMapUrlState({
    selectedDeviceId,
    mapViewport: {
      center: [
        parseFiniteNumber(
          searchParams.get(MAP_URL_PARAM_KEYS.latitude),
          DEFAULT_MAP_VIEWPORT.center[0],
        ),
        parseFiniteNumber(
          searchParams.get(MAP_URL_PARAM_KEYS.longitude),
          DEFAULT_MAP_VIEWPORT.center[1],
        ),
      ],
      zoom: parseFiniteNumber(
        searchParams.get(MAP_URL_PARAM_KEYS.zoom),
        DEFAULT_MAP_VIEWPORT.zoom,
      ),
    },
    mapLayer: parseMapLayer(searchParams.get(MAP_URL_PARAM_KEYS.layer)),
    followMode: parseBooleanFlag(searchParams.get(MAP_URL_PARAM_KEYS.follow)),
    showGeofences: parseBooleanFlag(searchParams.get(MAP_URL_PARAM_KEYS.geofences)),
    hardMode: isMapShareableHardMode(modeParam)
      ? modeParam
      : selectedDeviceId
        ? 'inspect-device'
        : 'browse',
  });
};

export const serializeMapUrlState = (state: MapUrlState) => {
  const params = new URLSearchParams();

  if (state.selectedDeviceId) {
    params.set(MAP_URL_PARAM_KEYS.device, state.selectedDeviceId);
  }

  params.set(MAP_URL_PARAM_KEYS.latitude, state.mapViewport.center[0].toFixed(6));
  params.set(MAP_URL_PARAM_KEYS.longitude, state.mapViewport.center[1].toFixed(6));
  params.set(MAP_URL_PARAM_KEYS.zoom, String(Math.round(state.mapViewport.zoom * 100) / 100));
  params.set(MAP_URL_PARAM_KEYS.layer, state.mapLayer);

  if (state.showGeofences) {
    params.set(MAP_URL_PARAM_KEYS.geofences, '1');
  }

  if (state.followMode) {
    params.set(MAP_URL_PARAM_KEYS.follow, '1');
  }

  if (state.hardMode !== 'browse') {
    params.set(MAP_URL_PARAM_KEYS.mode, state.hardMode);
  }

  return params.toString();
};

export const applyMapUrlStateToSearchParams = (
  searchParams: URLSearchParams,
  state: MapUrlState,
) => {
  Object.values(MAP_URL_PARAM_KEYS).forEach((key) => {
    searchParams.delete(key);
  });

  const serialized = new URLSearchParams(serializeMapUrlState(state));

  serialized.forEach((value, key) => {
    searchParams.set(key, value);
  });

  return searchParams;
};
