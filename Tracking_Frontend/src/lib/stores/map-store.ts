import { create } from 'zustand';

export interface DevicePosition {
  deviceId: string;
  deviceName: string;
  vehiclePlate: string | null;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  status: 'running' | 'stopped' | 'disconnected';
  timestamp: number;
}

interface MapState {
  positions: Map<string, DevicePosition>;
  selectedDeviceId: string | null;
  followMode: boolean;
  showGeofences: boolean;
  updatePosition: (position: DevicePosition) => void;
  updateBatch: (positions: DevicePosition[]) => void;
  selectDevice: (deviceId: string | null) => void;
  toggleFollowMode: () => void;
  toggleGeofences: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  positions: new Map(),
  selectedDeviceId: null,
  followMode: false,
  showGeofences: true,
  updatePosition: (position) => set((state) => {
    const next = new Map(state.positions);
    next.set(position.deviceId, position);
    return { positions: next };
  }),
  updateBatch: (positions) => set((state) => {
    const next = new Map(state.positions);
    for (const item of positions) next.set(item.deviceId, item);
    return { positions: next };
  }),
  selectDevice: (deviceId) => set({ selectedDeviceId: deviceId }),
  toggleFollowMode: () => set((state) => ({ followMode: !state.followMode })),
  toggleGeofences: () => set((state) => ({ showGeofences: !state.showGeofences })),
}));
