import { z } from 'zod';

export const createMaintenanceSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required').max(50),
  maintenanceType: z.string().min(1, 'Maintenance type is required').max(100),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  scheduledDate: z.string().datetime().optional(),
  mileageAtService: z.number().int().min(0).optional(),
  nextServiceMileage: z.number().int().min(0).optional(),
  nextServiceDate: z.string().datetime().optional(),
  cost: z.number().min(0).optional(),
  serviceProvider: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

export const updateMaintenanceSchema = z.object({
  maintenanceType: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  scheduledDate: z.string().datetime().optional(),
  completedDate: z.string().datetime().optional(),
  mileageAtService: z.number().int().min(0).optional(),
  nextServiceMileage: z.number().int().min(0).optional(),
  nextServiceDate: z.string().datetime().optional(),
  cost: z.number().min(0).optional(),
  serviceProvider: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
});

export const maintenanceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  vehicleId: z.string().max(50).optional(),
  maintenanceType: z.string().max(100).optional(),
});
