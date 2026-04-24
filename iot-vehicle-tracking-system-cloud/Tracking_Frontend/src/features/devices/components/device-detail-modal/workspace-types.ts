import type { MapInspectPanelPayload, MapInspectPanelTarget } from '@/features/map/types';

export type DeviceDetailModalPresentation = 'dialog' | 'workspace';
export type DeviceWorkspaceSection =
  | 'overview'
  | 'vehicle'
  | 'alerts'
  | 'errors'
  | 'runtime'
  | 'route'
  | 'commands'
  | 'raw'
  | 'zones'
  | 'settings';

export interface DeviceWorkspaceLaunchState {
  section: DeviceWorkspaceSection;
  highlight: string | null;
}

export interface DeviceWorkspaceFallbackPaths {
  alertsPath: string | null;
  deviceDetailPath: string | null;
  geofencesPath: string;
  vehicleDetailPath: string | null;
}

export interface DeviceWorkspaceActions {
  onEnterAllowedZoneEdit?: () => void;
  onEnterGeofenceEdit?: () => void;
}

export interface DeviceWorkspaceAlert {
  id: number;
  alertType: string | null;
  severity: string | null;
  status: string | null;
  title: string | null;
  message: string | null;
  displayTitle: string | null;
  displayMessage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  vehicleId: string | null;
  vehiclePlate: string | null;
  deviceId: string | null;
  deviceName: string | null;
  customerName: string | null;
  geofenceId: number | null;
  geofenceName: string | null;
  latitude: number | null;
  longitude: number | null;
  actualValue: unknown;
  thresholdValue: unknown;
  rawValue: unknown;
  speed: number | null;
  source: string | null;
  tripId: number | null;
}

export interface DeviceLinkedVehicle {
  id: number;
  vehicleId: string | null;
  plateNumber: string | null;
  status: string | null;
  iconType: string | null;
  fuelType: string | null;
  transmission: string | null;
  notes: string | null;
  brand: string | null;
  model: string | null;
  vehicleType: string | null;
  year: number | null;
  color: string | null;
  vin: string | null;
  registrationNumber: string | null;
  insuranceExpiry: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  deviceId: string | null;
  customerId: number | null;
  customerName: string | null;
  customerCode: string | null;
  mileageKm: number | null;
  seats: number | null;
}

export const resolveWorkspaceLaunchState = (
  target: MapInspectPanelTarget | undefined,
  payload: MapInspectPanelPayload | null | undefined,
): DeviceWorkspaceLaunchState => {
  switch (target) {
    case 'vehicle':
      return { section: 'vehicle', highlight: payload?.highlight ?? null };
    case 'alerts':
      return { section: 'alerts', highlight: payload?.highlight ?? null };
    case 'errors':
      return { section: 'errors', highlight: payload?.highlight ?? null };
    case 'runtime':
      return { section: 'runtime', highlight: payload?.highlight ?? null };
    case 'route':
      return { section: 'route', highlight: payload?.highlight ?? null };
    case 'commands':
      return { section: 'commands', highlight: payload?.highlight ?? null };
    case 'raw':
      return { section: 'raw', highlight: payload?.highlight ?? null };
    case 'settings':
      return { section: 'settings', highlight: payload?.highlight ?? null };
    case 'geofence':
    case 'allowed-zone':
      return { section: 'zones', highlight: payload?.highlight ?? target };
    case 'overview':
    default:
      return { section: 'overview', highlight: payload?.highlight ?? null };
  }
};
