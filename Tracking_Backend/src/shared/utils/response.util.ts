import type { Response } from 'express';
import type { ApiError } from '@/shared/utils/errors.util';

interface SuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    status: number;
    path: string;
    details?: unknown;
  };
  timestamp: string;
}

export const sendOk = <T>(res: Response, data: T): Response<SuccessResponse<T>> =>
  res.status(200).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });

export const sendCreated = <T>(res: Response, data: T): Response<SuccessResponse<T>> =>
  res.status(201).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });

export const sendNoContent = (res: Response): Response => res.status(204).send();

export const sendError = (res: Response, error: ApiError, path: string): Response<ErrorResponse> =>
  res.status(error.status).json({
    success: false,
    error: {
      code: (error.details?.code as string) ?? 'ERROR',
      message: error.message,
      status: error.status,
      path,
      details: error.details,
    },
    timestamp: new Date().toISOString(),
  });
