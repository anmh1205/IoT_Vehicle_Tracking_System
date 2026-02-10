export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Maintenance {
  id: number;
  vehicleId: string | null;
  maintenanceType: string;
  title: string;
  description: string | null;
  scheduledDate: string | null;
  completedDate: string | null;
  mileageAtService: number | null;
  nextServiceMileage: number | null;
  nextServiceDate: string | null;
  cost: number | null;
  serviceProvider: string | null;
  status: MaintenanceStatus;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceInput {
  vehicleId: string;
  maintenanceType: string;
  title: string;
  description?: string;
  scheduledDate?: string;
  mileageAtService?: number;
  nextServiceMileage?: number;
  nextServiceDate?: string;
  cost?: number;
  serviceProvider?: string;
  notes?: string;
}

export interface UpdateMaintenanceInput {
  maintenanceType?: string;
  title?: string;
  description?: string;
  scheduledDate?: string;
  mileageAtService?: number;
  nextServiceMileage?: number;
  nextServiceDate?: string;
  cost?: number;
  serviceProvider?: string;
  notes?: string;
  status?: string;
  completedDate?: string;
}

export interface MaintenanceListQuery {
  page?: number;
  limit?: number;
  status?: string;
  vehicleId?: string;
  maintenanceType?: string;
}
