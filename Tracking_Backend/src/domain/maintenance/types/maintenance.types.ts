export interface Maintenance {
  id: number;
  vehicle_id: string | null;
  maintenance_type: string;
  title: string;
  description: string | null;
  scheduled_date: Date | null;
  completed_date: Date | null;
  mileage_at_service: number | null;
  next_service_mileage: number | null;
  next_service_date: Date | null;
  cost: number | null;
  service_provider: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface MaintenancePublic {
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
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
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

export interface UpdateMaintenanceInput extends Partial<Omit<CreateMaintenanceInput, 'vehicleId'>> {
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
