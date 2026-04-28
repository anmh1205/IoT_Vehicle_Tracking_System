import { z } from 'zod';

const centerSourceSchema = z.enum(['vehicle_position', 'map_pick']);
const alertModeSchema = z.enum([
  'transition_only',
  'transition_and_recovery',
  'periodic_while_outside',
  'silent',
]);

const boundarySelectionSchema = z.object({
  provider: z.string().trim().min(1).optional(),
  unitCode: z.string().trim().min(1),
});

export const listZoneBoundariesQuerySchema = z.object({
  query: z.string().trim().max(100).optional(),
  level: z.enum(['province', 'district', 'ward']).optional(),
  parentCode: z.string().trim().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const resolveZoneBoundariesSchema = z.object({
  selections: z.array(boundarySelectionSchema).min(1).max(100),
});

const circleZoneSchema = z
  .object({
    zoneType: z.literal('circle'),
    centerSource: centerSourceSchema,
    circleCenterLatitude: z.number().min(-90).max(90).optional(),
    circleCenterLongitude: z.number().min(-180).max(180).optional(),
    radiusMeters: z.number().int().min(100).max(2_000_000),
    alertMode: alertModeSchema.optional(),
    cooldownSec: z.number().int().min(0).max(86_400).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.centerSource !== 'map_pick') {
      return;
    }

    if (value.circleCenterLatitude === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['circleCenterLatitude'],
        message: 'circleCenterLatitude is required when centerSource is map_pick',
      });
    }
    if (value.circleCenterLongitude === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['circleCenterLongitude'],
        message: 'circleCenterLongitude is required when centerSource is map_pick',
      });
    }
  });

const administrativeBoundaryZoneSchema = z.object({
  zoneType: z.literal('administrative_boundary'),
  boundarySelections: z.array(boundarySelectionSchema).min(1).max(100),
  alertMode: alertModeSchema.optional(),
  cooldownSec: z.number().int().min(0).max(86_400).optional(),
});

export const upsertVehicleZoneSchema = z.union([
  circleZoneSchema,
  administrativeBoundaryZoneSchema,
]);
