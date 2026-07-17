import type { ApiResponseMeta, ApiSuccessResponse } from '@/shared/contracts/api-response.contract';

export const buildSuccessResponse = <T>(
  requestId: string,
  data: T,
  meta?: ApiResponseMeta,
): ApiSuccessResponse<T> => {
  if (meta) {
    return { data, requestId, meta };
  }

  return { data, requestId };
};
