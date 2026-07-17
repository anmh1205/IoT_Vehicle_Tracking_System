export interface ApiResponseMeta {
  [key: string]: unknown;
}

export interface ApiSuccessResponse<T> {
  data: T;
  requestId: string;
  meta?: ApiResponseMeta;
}
