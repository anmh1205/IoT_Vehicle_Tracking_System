import type { ValidationErrorItem } from '@/shared/contracts/problem-details.contract';

export interface ApiErrorDetails {
  code?: string;
  errors?: ValidationErrorItem[];
  [key: string]: unknown;
}

export interface ApiError extends Error {
  status: number;
  details?: ApiErrorDetails;
}

export const createApiError = (
  status: number,
  message: string,
  details?: ApiErrorDetails,
): ApiError => {
  const error = new Error(message) as ApiError;
  error.name = 'ApiError';
  error.status = status;
  error.details = details;
  return error;
};

export const isApiError = (value: unknown): value is ApiError => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ApiError>;
  return (
    candidate.name === 'ApiError' &&
    typeof candidate.message === 'string' &&
    typeof candidate.status === 'number'
  );
};

const normalizeValidationErrors = (details?: unknown): ValidationErrorItem[] | undefined => {
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return undefined;
  }

  const entries = Object.entries(details as Record<string, unknown>);
  const errors: ValidationErrorItem[] = [];

  for (const [field, raw] of entries) {
    if (!Array.isArray(raw)) {
      continue;
    }

    for (const item of raw) {
      const message = typeof item === 'string' ? item : 'Invalid value';
      errors.push({ field, message, code: 'VALIDATION_ERROR' });
    }
  }

  return errors.length > 0 ? errors : undefined;
};

export const createValidationError = (message: string, details?: unknown) =>
  createApiError(400, message, {
    code: 'VALIDATION_ERROR',
    errors: normalizeValidationErrors(details),
  });

export const createUnauthorizedError = (message: string) =>
  createApiError(401, message, { code: 'UNAUTHORIZED' });

export const createForbiddenError = (message: string) =>
  createApiError(403, message, { code: 'FORBIDDEN' });

export const createNotFoundError = (message: string) =>
  createApiError(404, message, { code: 'NOT_FOUND' });

export const createConflictError = (message: string) =>
  createApiError(409, message, { code: 'CONFLICT' });
