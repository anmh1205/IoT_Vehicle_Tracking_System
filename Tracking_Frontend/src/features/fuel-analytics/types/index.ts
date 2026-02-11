export interface FuelSummary {
  totalFuelUsed: number;
  totalDistance: number;
  avgConsumption: number;
  totalCost: number;
  tripCount: number;
}

export interface VehicleFuelData {
  vehicleId: string;
  plateNumber: string;
  totalFuel: number;
  totalDistance: number;
  avgConsumption: number;
  tripCount: number;
}

export interface FuelTrend {
  date: string;
  fuelUsed: number;
  distance: number;
  consumption: number;
}

export interface FuelAnalyticsParams {
  from: string;
  to: string;
  interval: 'day' | 'week' | 'month';
}
