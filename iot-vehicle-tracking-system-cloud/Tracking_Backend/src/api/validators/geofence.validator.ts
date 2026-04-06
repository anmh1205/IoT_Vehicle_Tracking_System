import { z } from 'zod';

const policyTypeSchema = z.enum(['ADMIN_BOUNDARY', 'RADIUS', 'DISTANCE_QUOTA']);
const policyStatusSchema = z.enum(['draft', 'active', 'paused', 'disabled']);

const parseBooleanQuery = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === 0 || value === '0') {
    return false;
  }
  return value;
}, z.boolean().optional());

export const createGeofenceSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(200, 'Name must not exceed 200 characters'),
  geofenceType: z.enum(['circle', 'polygon', 'rectangle']).optional(),
  centerLatitude: z.number().min(-90).max(90).optional(),
  centerLongitude: z.number().min(-180).max(180).optional(),
  radiusMeters: z.number().min(1).max(1000000).optional(),
  coordinates: z.unknown().optional(),
  triggerOn: z.enum(['enter', 'exit', 'both']).optional(),
  notifyEmail: z.boolean().optional(),
  notifyPush: z.boolean().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
    .optional(),
  description: z.string().max(500).optional(),
});

export const updateGeofenceSchema = createGeofenceSchema.partial().extend({
  isActive: z.boolean().optional(),
  displayHidden: z.boolean().optional(),
});

export const geofenceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isActive: parseBooleanQuery,
  geofenceType: z.enum(['circle', 'polygon', 'rectangle']).optional(),
  search: z.string().max(100).optional(),
});

export const assignVehicleToGeofenceSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required').max(50),
});

const vehiclePolicyBaseSchema = z.object({
  vehicleId: z.string().min(1).max(50),
  policyType: policyTypeSchema,
  status: policyStatusSchema.optional(),
  params: z.record(z.unknown()),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
});

const validateEffectiveWindow = (
  value: { effectiveFrom?: string; effectiveTo?: string },
  ctx: z.RefinementCtx,
): void => {
  if (!value.effectiveFrom || !value.effectiveTo) return;

  const from = new Date(value.effectiveFrom).getTime();
  const to = new Date(value.effectiveTo).getTime();
  if (from >= to) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['effectiveTo'],
      message: 'effectiveTo must be later than effectiveFrom',
    });
  }
};

export const createVehiclePolicySchema = vehiclePolicyBaseSchema.superRefine(validateEffectiveWindow);

export const updateVehiclePolicySchema = vehiclePolicyBaseSchema
  .omit({ vehicleId: true, policyType: true })
  .partial()
  .superRefine(validateEffectiveWindow);

export const vehiclePolicyListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  vehicleId: z.string().max(50).optional(),
  policyType: policyTypeSchema.optional(),
  status: policyStatusSchema.optional(),
});

export const policyViolationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  vehicleId: z.string().max(50).optional(),
  policyType: policyTypeSchema.optional(),
  status: z.enum(['open', 'acknowledged', 'resolved']).optional(),
  acknowledged: parseBooleanQuery,
});
