/**
 * Vehicle Form Schema
 */
import { z } from 'zod';
import type { VehicleStatus } from '@/types';

export const vehicleSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  plateNumber: z.string().min(1, 'Plate number is required'),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  color: z.string().optional(),
  vehicleType: z.string().optional(),
  vin: z.string().optional(),
  seats: z.number().int().positive().optional(),
  transmission: z.string().optional(),
  fuelType: z.string().optional(),
  mileageKm: z.number().nonnegative().optional(),
  registrationNumber: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  status: z.enum(['active', 'inactive', 'maintenance', 'retired']).optional(),
  ownerId: z.number().int().positive().optional(),
  deviceId: z.number().int().positive().optional(),
});

export type VehicleFormData = z.infer<typeof vehicleSchema>;

