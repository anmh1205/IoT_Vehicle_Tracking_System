export interface MapGeofenceRecord {
  id: number;
  name: string;
  description?: string | null;
  geofenceType: 'circle' | 'polygon' | 'rectangle' | string;
  centerLatitude: number | null;
  centerLongitude: number | null;
  radiusMeters: number | null;
  triggerOn: 'enter' | 'exit' | 'both';
  isActive: boolean;
  color?: string | null;
  vehicleIds?: string[];
  updatedAt?: string | null;
}

export interface MapGeofenceDraft {
  id: number | null;
  source: 'create' | 'edit';
  name: string;
  description: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  triggerOn: 'enter' | 'exit' | 'both';
  isActive: boolean;
  color: string;
  isPickingCenter: boolean;
}
