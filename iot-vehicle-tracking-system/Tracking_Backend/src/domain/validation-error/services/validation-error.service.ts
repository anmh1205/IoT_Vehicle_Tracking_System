import * as validationErrorRepo from '@/domain/validation-error/repositories/validation-error.repository';
import { logger } from '@/infrastructure/logger';
import type {
  ValidationError,
  ValidationErrorPublic,
  CreateValidationErrorInput,
  ValidationErrorListQuery,
} from '@/domain/validation-error/types/validation-error.types';

const toPublic = (row: ValidationError): ValidationErrorPublic => ({
  id: row.id,
  correlationId: row.correlation_id,
  deviceId: row.device_id,
  validationType: row.validation_type,
  fieldName: row.field_name,
  expectedValue: row.expected_value,
  actualValue: row.actual_value,
  payloadHash: row.payload_hash,
  payloadSample: row.payload_sample,
  serverTimestamp: row.server_timestamp.toISOString(),
});

export const recordValidationError = async (
  input: CreateValidationErrorInput,
): Promise<ValidationErrorPublic> => {
  const row = await validationErrorRepo.insert(input);
  logger.warn(`Validation error recorded: type=${input.validationType} device=${input.deviceId ?? 'unknown'}`);
  return toPublic(row);
};

export const getValidationErrors = async (
  query: ValidationErrorListQuery,
): Promise<{ data: ValidationErrorPublic[]; total: number; page: number; limit: number }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const { errors, total } = await validationErrorRepo.findByDeviceId(query);

  return {
    data: errors.map(toPublic),
    total,
    page,
    limit,
  };
};
