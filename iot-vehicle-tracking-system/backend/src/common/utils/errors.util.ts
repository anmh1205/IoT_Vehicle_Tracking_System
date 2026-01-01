import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../exceptions/business.exception';
import { ValidationException } from '../exceptions/validation.exception';

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly path?: string;
  public readonly traceId?: string;

  constructor(
    status: number,
    message: string,
    options?: { code?: string; details?: unknown; path?: string; traceId?: string }
  ) {
    super(message);
    this.status = status;
    this.code = options?.code ?? 'UNSPECIFIED_ERROR';
    this.details = options?.details;
    this.path = options?.path;
    this.traceId = options?.traceId;

    type StackTraceCapture = (
      targetObject: Error,
      constructorOpt: new (...args: unknown[]) => Error
    ) => void;
    const capture = (Error as ErrorConstructor & {
      captureStackTrace?: StackTraceCapture;
    }).captureStackTrace;

    if (capture) {
      capture(this, this.constructor);
    }
  }
}

export const createNotFoundError = (
  message = 'Resource not found',
  details?: unknown
): ApiError =>
  new ApiError(HttpStatus.NOT_FOUND, message, { code: 'NOT_FOUND', details });

export const createValidationError = (
  message = 'Validation failed',
  details?: unknown
): ApiError =>
  new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, message, {
    code: 'VALIDATION_ERROR',
    details,
  });

export const createUnauthorizedError = (
  message = 'Unauthorized',
  details?: unknown
): ApiError =>
  new ApiError(HttpStatus.UNAUTHORIZED, message, { code: 'UNAUTHORIZED', details });

export const createForbiddenError = (
  message = 'Forbidden',
  details?: unknown
): ApiError =>
  new ApiError(HttpStatus.FORBIDDEN, message, { code: 'FORBIDDEN', details });

