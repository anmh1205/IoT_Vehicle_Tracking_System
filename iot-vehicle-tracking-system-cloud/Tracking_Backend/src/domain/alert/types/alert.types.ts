export interface Alert {
  id: number;
  vehicle_id: string | null;
  device_id: string | null;
  trip_id: number | null;
  geofence_id: number | null;
  alert_type: string;
  source: 'device' | 'ecu';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  title: string;
  message: string | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  threshold_value: number | null;
  actual_value: number | null;
  source_message_id?: string | null;
  acknowledged_by: number | null;
  acknowledged_at: Date | null;
  resolved_by: number | null;
  resolved_at: Date | null;
  resolution_notes: string | null;
  created_at: Date;
  updated_at: Date;
  vehicle_plate?: string | null;
  customer_name?: string | null;
  device_name?: string | null;
  trip_code?: string | null;
  geofence_name?: string | null;
}

export interface AlertPublic {
  id: number;
  vehicleId: string | null;
  deviceId: string | null;
  vehiclePlate?: string | null;
  customerName?: string | null;
  deviceName?: string | null;
  tripId: number | null;
  geofenceId: number | null;
  tripCode?: string | null;
  geofenceName?: string | null;
  alertType: string;
  source: 'device' | 'ecu';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  title: string;
  message: string | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  thresholdValue: number | null;
  actualValue: number | null;
  acknowledgedBy: number | null;
  acknowledgedAt: string | null;
  resolvedBy: number | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertInput {
  vehicleId?: string;
  deviceId?: string;
  tripId?: number;
  geofenceId?: number;
  alertType: string;
  source?: 'device' | 'ecu';
  severity: string;
  title: string;
  message?: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  thresholdValue?: number;
  actualValue?: number;
  sourceMessageId?: string;
}

export interface UpdateAlertInput {
  status?: string;
  resolutionNotes?: string;
}

export interface AlertListQuery {
  page?: number;
  limit?: number;
  status?: string;
  severity?: string;
  alertType?: string;
  source?: 'device' | 'ecu' | 'obd' | 'system';
  search?: string;
  vehicleId?: string;
  deviceId?: string;
}
