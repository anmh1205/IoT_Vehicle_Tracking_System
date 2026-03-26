import * as maintenanceRepo from '@/domain/maintenance/repositories/maintenance.repository';
import type {
  Maintenance,
  MaintenanceListQuery,
  MaintenancePublic,
} from '@/domain/maintenance/types/maintenance.types';

const sanitizeMaintenance = (m: Maintenance): MaintenancePublic => ({
  id: m.id,
  vehicleId: m.vehicle_id,
  maintenanceType: m.maintenance_type,
  title: m.title,
  description: m.description,
  scheduledDate: m.scheduled_date?.toISOString() ?? null,
  completedDate: m.completed_date?.toISOString() ?? null,
  mileageAtService: m.mileage_at_service,
  nextServiceMileage: m.next_service_mileage,
  nextServiceDate: m.next_service_date?.toISOString() ?? null,
  cost: m.cost,
  serviceProvider: m.service_provider,
  status: m.status,
  notes: m.notes,
  createdBy: m.created_by,
  createdAt: m.created_at.toISOString(),
  updatedAt: m.updated_at.toISOString(),
});

export const listMaintenance = async (
  query: MaintenanceListQuery,
): Promise<{
  items: MaintenancePublic[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const result = await maintenanceRepo.findAll(query);

  return {
    items: result.records.map(sanitizeMaintenance),
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  };
};
