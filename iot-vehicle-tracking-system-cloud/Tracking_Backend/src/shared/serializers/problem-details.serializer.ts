import type { ProblemDetails, ValidationErrorItem } from '@/shared/contracts/problem-details.contract';
import type { ApiError } from '@/shared/utils/errors.util';
import { isApiError } from '@/shared/utils/errors.util';

const PROBLEM_TYPE_BASE = 'https://api.tracking.local/problems';

const toValidationErrors = (raw: unknown): ValidationErrorItem[] | undefined => {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const parsed = raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const candidate = item as Record<string, unknown>;
      const field = typeof candidate.field === 'string' ? candidate.field : 'unknown';
      const message = typeof candidate.message === 'string' ? candidate.message : 'Invalid value';
      const code = typeof candidate.code === 'string' ? candidate.code : 'VALIDATION_ERROR';
      return { field, message, code };
    });

  return parsed.length > 0 ? parsed : undefined;
};

const toProblemType = (code: string): string => `${PROBLEM_TYPE_BASE}/${code.toLowerCase()}`;

const toInstance = (path: string, requestId: string): string => `${path}#${requestId}`;

const normalizeCode = (error: ApiError): string => {
  const rawCode = error.details?.code;
  if (typeof rawCode === 'string' && rawCode.length > 0) {
    return rawCode;
  }

  if (error.status >= 500) {
    return 'INTERNAL_ERROR';
  }

  return 'ERROR';
};

export const serializeApiError = (error: ApiError, path: string, requestId: string): ProblemDetails => {
  const code = normalizeCode(error);
  const errors = toValidationErrors(error.details?.errors);

  return {
    type: toProblemType(code),
    title: error.name || 'ApiError',
    status: error.status,
    detail: error.message,
    instance: toInstance(path, requestId),
    code,
    requestId,
    ...(errors ? { errors } : {}),
  };
};

export const serializeUnknownError = (path: string, requestId: string): ProblemDetails => ({
  type: toProblemType('INTERNAL_ERROR'),
  title: 'InternalServerError',
  status: 500,
  detail: 'An unexpected error occurred',
  instance: toInstance(path, requestId),
  code: 'INTERNAL_ERROR',
  requestId,
});

export const serializeProblem = (error: unknown, path: string, requestId: string): ProblemDetails =>
  isApiError(error) ? serializeApiError(error, path, requestId) : serializeUnknownError(path, requestId);
