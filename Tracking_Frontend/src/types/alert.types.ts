export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';

export interface Alert {
  id: number;
  vehicleId: string | null;
  deviceId: string | null;
  tripId: number | null;
  geofenceId: number | null;
  alertType: string;
  severity: AlertSeverity;
  status: AlertStatus;
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
  severity: string;
  title: string;
  message?: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  thresholdValue?: number;
  actualValue?: number;
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
  vehicleId?: string;
  deviceId?: string;
}
