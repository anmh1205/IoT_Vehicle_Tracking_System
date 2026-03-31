import type { Response } from 'express';
import type { ApiError } from '@/shared/utils/errors.util';
import type { ApiResponseMeta, ApiSuccessResponse } from '@/shared/contracts/api-response.contract';
import type { ProblemDetails } from '@/shared/contracts/problem-details.contract';
import { buildSuccessResponse } from '@/shared/serializers/success-response.serializer';
import { serializeApiError } from '@/shared/serializers/problem-details.serializer';

const getRequestIdFromResponse = (res: Response): string => {
  const headerValue = res.getHeader('X-Request-ID');
  if (typeof headerValue === 'string' && headerValue.length > 0) {
    return headerValue;
  }

  if (Array.isArray(headerValue) && headerValue.length > 0) {
    return String(headerValue[0]);
  }

  return 'unknown';
};

export const sendOk = <T>(
  res: Response,
  data: T,
  meta?: ApiResponseMeta,
): Response<ApiSuccessResponse<T>> => {
  const requestId = getRequestIdFromResponse(res);
  return res.status(200).json(buildSuccessResponse(requestId, data, meta));
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  meta?: ApiResponseMeta,
): Response<ApiSuccessResponse<T>> => {
  const requestId = getRequestIdFromResponse(res);
  return res.status(201).json(buildSuccessResponse(requestId, data, meta));
};

export const sendAccepted = <T>(
  res: Response,
  data: T,
  meta?: ApiResponseMeta,
): Response<ApiSuccessResponse<T>> => {
  const requestId = getRequestIdFromResponse(res);
  return res.status(202).json(buildSuccessResponse(requestId, data, meta));
};

export const sendNoContent = (res: Response): Response => res.status(204).send();

export const sendError = (res: Response, error: ApiError, path: string): Response<ProblemDetails> => {
  const requestId = getRequestIdFromResponse(res);
  const payload = serializeApiError(error, path, requestId);
  res.type('application/problem+json');
  return res.status(error.status).json(payload);
};
