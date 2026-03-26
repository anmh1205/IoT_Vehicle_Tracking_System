import { create } from 'zustand';
import { DEFAULT_MAP_VIEWPORT } from '@/features/map/constants/map-config';
import type { DeviceMapStatus, DevicePosition, MapLayer, MapViewport } from '@/features/map/types';

export interface MapState {
  positions: Map<string, DevicePosition>;
  selectedDeviceId: string | null;
  searchTerm: string;
  statusFilter: 'all' | DeviceMapStatus;
  mapLayer: MapLayer;
  showGeofences: boolean;
  followMode: boolean;
  mapViewport: MapViewport;
  updatePosition: (position: DevicePosition) => void;
  updateBatch: (positions: DevicePosition[]) => void;
  clearPositions: () => void;
  setSelectedDevice: (id: string | null) => void;
  selectDevice: (id: string | null) => void;
  setSearchTerm: (value: string) => void;
  setStatusFilter: (value: 'all' | DeviceMapStatus) => void;
  setMapLayer: (layer: MapLayer) => void;
  toggleGeofences: () => void;
  toggleFollowMode: () => void;
  setMapViewport: (viewport: MapViewport) => void;
}

export const useMapStore = create<MapState>((set) => ({
  positions: new Map(),
  selectedDeviceId: null,
  searchTerm: '',
  statusFilter: 'all',
  mapLayer: 'street',
  showGeofences: true,
  followMode: false,
  mapViewport: DEFAULT_MAP_VIEWPORT,
  updatePosition: (position) =>
    set((state) => {
      const next = new Map(state.positions);
      next.set(position.deviceId, position);
      return { positions: next };
    }),
  updateBatch: (positions) =>
    set((state) => {
      const next = new Map(state.positions);
      for (const position of positions) {
        next.set(position.deviceId, position);
      }
      return { positions: next };
    }),
  clearPositions: () => set({ positions: new Map() }),
  setSelectedDevice: (id) => set({ selectedDeviceId: id }),
  selectDevice: (id) => set({ selectedDeviceId: id }),
  setSearchTerm: (value) => set({ searchTerm: value }),
  setStatusFilter: (value) => set({ statusFilter: value }),
  setMapLayer: (layer) => set({ mapLayer: layer }),
  toggleGeofences: () => set((state) => ({ showGeofences: !state.showGeofences })),
  toggleFollowMode: () => set((state) => ({ followMode: !state.followMode })),
  setMapViewport: (viewport) => set({ mapViewport: viewport }),
}));
