import { z } from 'zod';

export const createVehicleSchema = z.object({
  vehicleId: z
    .string()
    .min(2, 'Vehicle ID must be at least 2 characters')
    .max(50, 'Vehicle ID must not exceed 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Vehicle ID can only contain letters, numbers, dashes, and underscores',
    ),
  plateNumber: z.string().max(20).optional(),
  deviceId: z.string().max(50).optional(),
  customerId: z.number().int().positive().optional(),
  vehicleType: z.string().max(50).optional(),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  color: z.string().max(50).optional(),
  vin: z.string().max(50).optional(),
  seats: z.number().int().min(1).max(100).optional(),
  transmission: z.enum(['manual', 'automatic', 'cvt']).optional(),
  fuelType: z.enum(['gasoline', 'diesel', 'electric', 'hybrid', 'lpg']).optional(),
  mileageKm: z.number().min(0).optional(),
  registrationNumber: z.string().max(50).optional(),
  insuranceExpiry: z.string().datetime().optional(),
  iconType: z.string().max(50).optional(),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
    .optional(),
  notes: z.string().max(500).optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial().extend({
  customerId: z.union([z.number().int().positive(), z.null()]).optional(),
});

export const vehicleListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'inactive', 'maintenance', 'retired']).optional(),
  customerId: z.coerce.number().int().positive().optional(),
  customerState: z.enum(['assigned', 'unassigned']).optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['vehicleId', 'plateNumber', 'brand', 'status', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const assignDeviceSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required').max(50),
});
