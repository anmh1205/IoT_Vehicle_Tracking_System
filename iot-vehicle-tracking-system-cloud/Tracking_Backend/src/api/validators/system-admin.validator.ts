import { z } from 'zod';

const vmResourceSchema = z.enum([
  'datasource',
  'query-template',
  'rule',
  'tenant',
  'retention',
  'access',
]);

const vmValueSchema = z.any();

const optionalString = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

export const metricsQuerySchema = z.object({
  query: z.string().trim().min(1, 'query is required').max(2000),
  time: optionalString,
});

export const logsQuerySchema = z.object({
  query: optionalString,
  limit: z.coerce.number().int().positive().max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const queryTablePathSchema = z.object({
  table: z.string().trim().min(1).max(128),
});

export const queryTableQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(10_000).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: optionalString,
  from: optionalString,
  to: optionalString,
});

export const listVmSettingsQuerySchema = z.object({
  resource: vmResourceSchema.optional(),
});

export const createVmSettingBodySchema = z.object({
  key: z.string().trim().min(1).max(100),
  value: vmValueSchema,
  description: z.string().trim().min(1).max(500).optional(),
  groupName: z.string().trim().min(1).max(50).optional(),
  isPublic: z.boolean().optional(),
  resource: vmResourceSchema.optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

export const updateVmSettingBodySchema = z.object({
  value: vmValueSchema,
  expectedRevision: z.number().int().positive(),
  resource: vmResourceSchema.optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

export const deleteVmSettingQuerySchema = z.object({
  expectedRevision: z.coerce.number().int().positive(),
  resource: vmResourceSchema.optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

export const activateVmSettingBodySchema = z.object({
  expectedRevision: z.number().int().positive(),
  resource: vmResourceSchema.optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

export const rollbackVmSettingBodySchema = z.object({
  targetRevision: z.number().int().positive(),
  expectedRevision: z.number().int().positive(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

export const validateVmSettingBodySchema = z.object({
  resource: vmResourceSchema.optional(),
});

export const vmSettingPathSchema = z.object({
  key: z.string().trim().min(1).max(100),
});

export const vmSettingRevisionsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type MetricsQueryInput = z.infer<typeof metricsQuerySchema>;
export type LogsQueryInput = z.infer<typeof logsQuerySchema>;
export type QueryTablePathInput = z.infer<typeof queryTablePathSchema>;
export type QueryTableQueryInput = z.infer<typeof queryTableQuerySchema>;
export type ListVmSettingsQueryInput = z.infer<typeof listVmSettingsQuerySchema>;
export type CreateVmSettingBodyInput = z.infer<typeof createVmSettingBodySchema>;
export type UpdateVmSettingBodyInput = z.infer<typeof updateVmSettingBodySchema>;
export type DeleteVmSettingQueryInput = z.infer<typeof deleteVmSettingQuerySchema>;
export type ActivateVmSettingBodyInput = z.infer<typeof activateVmSettingBodySchema>;
export type RollbackVmSettingBodyInput = z.infer<typeof rollbackVmSettingBodySchema>;
export type ValidateVmSettingBodyInput = z.infer<typeof validateVmSettingBodySchema>;
export type VmSettingPathInput = z.infer<typeof vmSettingPathSchema>;
export type VmSettingRevisionsQueryInput = z.infer<typeof vmSettingRevisionsQuerySchema>;
