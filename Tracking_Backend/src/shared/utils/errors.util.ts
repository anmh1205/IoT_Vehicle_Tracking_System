export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const createValidationError = (message: string, details?: unknown) =>
  new ApiError(400, message, { code: 'VALIDATION_ERROR', details });

export const createUnauthorizedError = (message: string) =>
  new ApiError(401, message, { code: 'UNAUTHORIZED' });

export const createForbiddenError = (message: string) =>
  new ApiError(403, message, { code: 'FORBIDDEN' });

export const createNotFoundError = (message: string) =>
  new ApiError(404, message, { code: 'NOT_FOUND' });

export const createConflictError = (message: string) =>
  new ApiError(409, message, { code: 'CONFLICT' });
