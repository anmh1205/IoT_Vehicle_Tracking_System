export interface ApiError extends Error {
  status: number;
  details?: Record<string, unknown>;
}

export const createApiError = (
  status: number,
  message: string,
  details?: Record<string, unknown>,
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

export const createValidationError = (message: string, details?: unknown) =>
  createApiError(400, message, { code: 'VALIDATION_ERROR', details });

export const createUnauthorizedError = (message: string) =>
  createApiError(401, message, { code: 'UNAUTHORIZED' });

export const createForbiddenError = (message: string) =>
  createApiError(403, message, { code: 'FORBIDDEN' });

export const createNotFoundError = (message: string) =>
  createApiError(404, message, { code: 'NOT_FOUND' });

export const createConflictError = (message: string) =>
  createApiError(409, message, { code: 'CONFLICT' });
