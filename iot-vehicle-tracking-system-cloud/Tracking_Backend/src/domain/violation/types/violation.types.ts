// DB model (snake_case) — mirrors the violations table directly
export interface Violation {
  id: number;
  alert_id: number | null;
  vehicle_id: string | null;
  driver_id: number | null;
  violation_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string | null;
  location_lat: number | null;
  location_lon: number | null;
  speed_limit: number | null;
  actual_speed: number | null;
  fine_amount: number;
  acknowledged: boolean;
  acknowledged_by: number | null;
  acknowledged_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// Public API model (camelCase) — exposed to frontend
export interface ViolationPublic {
  id: number;
  alertId: number | null;
  vehicleId: string | null;
  driverId: number | null;
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string | null;
  locationLat: number | null;
  locationLon: number | null;
  speedLimit: number | null;
  actualSpeed: number | null;
  fineAmount: number;
  acknowledged: boolean;
  acknowledgedBy: number | null;
  acknowledgedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateViolationInput {
  alertId?: number;
  vehicleId?: string;
  driverId?: number;
  violationType: string;
  severity?: string;
  description?: string;
  locationLat?: number;
  locationLon?: number;
  speedLimit?: number;
  actualSpeed?: number;
  fineAmount?: number;
  notes?: string;
}

export interface AcknowledgeViolationInput {
  notes?: string;
}

export interface ViolationListQuery {
  page?: number;
  limit?: number;
  vehicleId?: string;
  driverId?: number;
  violationType?: string;
  severity?: string;
  acknowledged?: boolean;
  policyType?: 'ADMIN_BOUNDARY' | 'RADIUS' | 'DISTANCE_QUOTA';
}
