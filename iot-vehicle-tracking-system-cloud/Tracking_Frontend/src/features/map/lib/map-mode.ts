'use client';

import type { MapHardMode, MapShareableHardMode } from '@/features/map/types';

export const MAP_SHAREABLE_HARD_MODES: MapShareableHardMode[] = [
  'browse',
  'inspect-device',
  'edit-geofence',
  'edit-allowed-zone',
];

export const isMapShareableHardMode = (
  value: string | null | undefined,
): value is MapShareableHardMode =>
  MAP_SHAREABLE_HARD_MODES.includes(value as MapShareableHardMode);

export const isMapEditMode = (mode: MapHardMode) =>
  mode === 'edit-geofence' || mode === 'edit-allowed-zone';

export const isMapInspectMode = (mode: MapHardMode) => mode === 'inspect-device';

export const isMapBrowsePanelMode = (mode: MapHardMode) =>
  mode === 'browse' || mode === 'inspect-device';

export const resolveMapHardMode = (
  mode: MapHardMode | MapShareableHardMode | null | undefined,
  selectedDeviceId: string | null,
): MapHardMode => {
  if (mode === 'edit-geofence') {
    return mode;
  }

  if (!selectedDeviceId) {
    return mode === 'mobile-list' ? mode : 'browse';
  }

  if (mode === 'edit-allowed-zone' || mode === 'inspect-device') {
    return mode;
  }

  return mode === 'mobile-list' ? mode : 'inspect-device';
};

export const fallbackBrowseMode = (
  selectedDeviceId: string | null,
): MapShareableHardMode =>
  selectedDeviceId ? 'inspect-device' : 'browse';
