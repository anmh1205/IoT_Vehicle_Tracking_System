import * as errorCodeRepo from '@/domain/error-code/repositories/error-code-definition.repository';
import type {
  ErrorCodeDefinition,
  ErrorCodePublic,
  CreateErrorCodeInput,
  UpdateErrorCodeInput,
} from '@/domain/error-code/types/error-code.types';
import { createNotFoundError, createConflictError } from '@/shared/utils/errors.util';

const sanitizeErrorCode = (ec: ErrorCodeDefinition): ErrorCodePublic => ({
  code: ec.code,
  name: ec.name,
  nameVi: ec.name_vi,
  description: ec.description,
  category: ec.category,
  severity: ec.severity,
  isActive: ec.is_active,
  createdAt: ec.created_at.toISOString(),
  updatedAt: ec.updated_at.toISOString(),
});

export const listErrorCodes = async (): Promise<ErrorCodePublic[]> => {
  const codes = await errorCodeRepo.findAll();
  return codes.map(sanitizeErrorCode);
};

export const getErrorCode = async (code: number): Promise<ErrorCodePublic> => {
  const ec = await errorCodeRepo.findByCode(code);
  if (!ec) throw createNotFoundError('Error code not found');
  return sanitizeErrorCode(ec);
};

export const createErrorCode = async (input: CreateErrorCodeInput): Promise<ErrorCodePublic> => {
  const existing = await errorCodeRepo.findByCode(input.code);
  if (existing) {
    throw createConflictError(`Error code ${input.code} already exists`);
  }

  const ec = await errorCodeRepo.create(input);
  return sanitizeErrorCode(ec);
};

export const updateErrorCode = async (
  code: number,
  data: UpdateErrorCodeInput,
): Promise<ErrorCodePublic> => {
  const ec = await errorCodeRepo.update(code, data);
  if (!ec) throw createNotFoundError('Error code not found');
  return sanitizeErrorCode(ec);
};

export const toggleErrorCode = async (
  code: number,
  isActive: boolean,
): Promise<ErrorCodePublic> => {
  const ec = await errorCodeRepo.toggleActive(code, isActive);
  if (!ec) throw createNotFoundError('Error code not found');
  return sanitizeErrorCode(ec);
};
