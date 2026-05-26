import { create } from 'zustand';
import { DEFAULT_MAP_VIEWPORT } from '@/features/map/constants/map-config';
import { fallbackBrowseMode, resolveMapHardMode } from '@/features/map/lib/map-mode';
import type {
  DeviceMapStatus,
  MapInspectPanelPayload,
  MapInspectPanelTarget,
  DevicePosition,
  MapHardMode,
  MapLayer,
  MapViewport,
} from '@/features/map/types';

type MapRestorableState = {
  selectedDeviceId: string | null;
  hardMode: MapHardMode;
  mapLayer: MapLayer;
  showGeofences: boolean;
  followMode: boolean;
  mapViewport: MapViewport;
};

const normalizeRestorableState = ({
  selectedDeviceId,
  hardMode,
  mapLayer,
  showGeofences,
  followMode,
  mapViewport,
}: MapRestorableState): MapRestorableState => {
  const resolvedSelectedDeviceId = selectedDeviceId?.trim() || null;
  const resolvedHardMode = resolveMapHardMode(hardMode, resolvedSelectedDeviceId);

  return {
    selectedDeviceId: resolvedSelectedDeviceId,
    hardMode: resolvedHardMode,
    mapLayer,
    showGeofences,
    followMode: resolvedSelectedDeviceId ? followMode : false,
    mapViewport,
  };
};

const areMapViewportsEqual = (left: MapViewport, right: MapViewport) =>
  left.center[0] === right.center[0] &&
  left.center[1] === right.center[1] &&
  left.zoom === right.zoom;

const areRestorableStatesEqual = (
  left: MapRestorableState,
  right: MapRestorableState,
) =>
  left.selectedDeviceId === right.selectedDeviceId &&
  left.hardMode === right.hardMode &&
  left.mapLayer === right.mapLayer &&
  left.showGeofences === right.showGeofences &&
  left.followMode === right.followMode &&
  areMapViewportsEqual(left.mapViewport, right.mapViewport);

export interface MapState extends MapRestorableState {
  positions: Map<string, DevicePosition>;
  searchTerm: string;
  statusFilter: 'all' | DeviceMapStatus;
  showAllowedZone: boolean;
  inspectRailCollapsed: boolean;
  inspectPanelOpen: boolean;
  inspectPanelTarget: MapInspectPanelTarget;
  inspectPanelPayload: MapInspectPanelPayload | null;
  inspectPanelRequestKey: number;
  updatePosition: (position: DevicePosition) => void;
  updateBatch: (positions: DevicePosition[]) => void;
  clearPositions: () => void;
  focusDevice: (id: string) => void;
  clearSelection: () => void;
  setSearchTerm: (value: string) => void;
  setStatusFilter: (value: 'all' | DeviceMapStatus) => void;
  setHardMode: (mode: MapHardMode) => void;
  openMobileList: () => void;
  closeMobileList: () => void;
  setMapLayer: (layer: MapLayer) => void;
  setShowGeofences: (value: boolean) => void;
  toggleGeofences: () => void;
  setFollowMode: (value: boolean) => void;
  toggleFollowMode: () => void;
  setShowAllowedZone: (value: boolean) => void;
  toggleAllowedZone: () => void;
  setInspectRailCollapsed: (value: boolean) => void;
  toggleInspectRailCollapsed: () => void;
  openInspectPanel: (target: MapInspectPanelTarget, payload?: MapInspectPanelPayload | null) => void;
  setInspectPanelTarget: (target: MapInspectPanelTarget, payload?: MapInspectPanelPayload | null) => void;
  closeInspectPanel: () => void;
  setMapViewport: (viewport: MapViewport) => void;
  applyUrlState: (state: Partial<MapRestorableState>) => void;
}

const initialState: MapRestorableState = {
  selectedDeviceId: null,
  hardMode: 'browse',
  mapLayer: 'satellite',
  showGeofences: false,
  followMode: false,
  mapViewport: DEFAULT_MAP_VIEWPORT,
};

export const useMapStore = create<MapState>((set) => ({
  positions: new Map(),
  searchTerm: '',
  statusFilter: 'all',
  showAllowedZone: false,
  inspectRailCollapsed: false,
  inspectPanelOpen: false,
  inspectPanelTarget: 'overview',
  inspectPanelPayload: null,
  inspectPanelRequestKey: 0,
  ...initialState,
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
  focusDevice: (id) =>
    set((state) => {
      const device = state.positions.get(id);
      const hasValidCoords =
        device &&
        Number.isFinite(device.lat) &&
        Number.isFinite(device.lon) &&
        Math.abs(device.lat) <= 90 &&
        Math.abs(device.lon) <= 180 &&
        !(device.lat === 0 && device.lon === 0);

      return {
        selectedDeviceId: id,
        hardMode: 'inspect-device',
        followMode: true,
        showAllowedZone:
          state.hardMode === 'inspect-device' ? state.showAllowedZone : false,
        ...(hasValidCoords
          ? { mapViewport: { center: [device.lat, device.lon] as [number, number], zoom: Math.max(state.mapViewport.zoom, 15) } }
          : {}),
      };
    }),
  clearSelection: () =>
    set((state) => ({
      selectedDeviceId: null,
      hardMode: state.hardMode === 'edit-zone' ? 'edit-zone' : 'browse',
      followMode: false,
      showAllowedZone: false,
      inspectPanelOpen: false,
      inspectPanelPayload: null,
    })),
  setSearchTerm: (value) => set({ searchTerm: value }),
  setStatusFilter: (value) => set({ statusFilter: value }),
  setHardMode: (mode) =>
    set((state) => {
      const nextHardMode = resolveMapHardMode(mode, state.selectedDeviceId);

      return {
        hardMode: nextHardMode,
        inspectPanelOpen: nextHardMode === 'inspect-device' ? state.inspectPanelOpen : false,
        inspectPanelPayload: nextHardMode === 'inspect-device' ? state.inspectPanelPayload : null,
      };
    }),
  openMobileList: () =>
    set({
      hardMode: 'mobile-list',
      inspectPanelOpen: false,
      inspectPanelPayload: null,
    }),
  closeMobileList: () =>
    set((state) => ({ hardMode: fallbackBrowseMode(state.selectedDeviceId) })),
  setMapLayer: (layer) => set({ mapLayer: layer }),
  setShowGeofences: (value) => set({ showGeofences: value }),
  toggleGeofences: () => set((state) => ({ showGeofences: !state.showGeofences })),
  setFollowMode: (value) =>
    set((state) => ({
      followMode: state.selectedDeviceId ? value : false,
    })),
  toggleFollowMode: () =>
    set((state) => ({
      followMode: state.selectedDeviceId ? !state.followMode : false,
    })),
  setShowAllowedZone: (value) =>
    set((state) => ({
      showAllowedZone: state.selectedDeviceId ? value : false,
    })),
  toggleAllowedZone: () =>
    set((state) => ({
      showAllowedZone: state.selectedDeviceId ? !state.showAllowedZone : false,
    })),
  setInspectRailCollapsed: (value) => set({ inspectRailCollapsed: value }),
  toggleInspectRailCollapsed: () =>
    set((state) => ({ inspectRailCollapsed: !state.inspectRailCollapsed })),
  openInspectPanel: (target, payload = null) =>
    set((state) => ({
      inspectPanelOpen: Boolean(state.selectedDeviceId) && state.hardMode === 'inspect-device',
      inspectPanelTarget: target,
      inspectPanelPayload: payload,
      inspectPanelRequestKey: state.inspectPanelRequestKey + 1,
    })),
  setInspectPanelTarget: (target, payload = null) =>
    set((state) => ({
      inspectPanelTarget: target,
      inspectPanelPayload: payload,
      inspectPanelRequestKey: state.inspectPanelRequestKey + 1,
    })),
  closeInspectPanel: () =>
    set({
      inspectPanelOpen: false,
      inspectPanelPayload: null,
    }),
  setMapViewport: (viewport) =>
    set((state) =>
      areMapViewportsEqual(state.mapViewport, viewport)
        ? state
        : { mapViewport: viewport },
    ),
  applyUrlState: (state) =>
    set((current) => {
      const next = normalizeRestorableState({
        selectedDeviceId: state.selectedDeviceId ?? current.selectedDeviceId,
        hardMode: state.hardMode ?? current.hardMode,
        mapLayer: state.mapLayer ?? current.mapLayer,
        showGeofences: state.showGeofences ?? current.showGeofences,
        followMode: state.followMode ?? current.followMode,
        mapViewport: state.mapViewport ?? current.mapViewport,
      });

      const nextShowAllowedZone = next.selectedDeviceId
        ? current.showAllowedZone
        : false;
      const keepInspectPanel =
        Boolean(next.selectedDeviceId) && next.hardMode === 'inspect-device';

      if (
        areRestorableStatesEqual(current, next) &&
        current.showAllowedZone === nextShowAllowedZone &&
        current.inspectPanelOpen === (keepInspectPanel ? current.inspectPanelOpen : false)
      ) {
        return current;
      }

      return {
        ...next,
        showAllowedZone: nextShowAllowedZone,
        inspectPanelOpen: keepInspectPanel ? current.inspectPanelOpen : false,
        inspectPanelPayload: keepInspectPanel ? current.inspectPanelPayload : null,
      };
    }),
}));
