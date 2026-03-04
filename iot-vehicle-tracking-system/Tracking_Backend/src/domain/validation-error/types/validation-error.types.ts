export type ValidationType =
  | 'json_parse'
  | 'missing_field'
  | 'out_of_range'
  | 'timestamp_anomaly'
  | 'schema';

export interface ValidationError {
  id: number;
  correlation_id: string | null;
  device_id: string | null;
  validation_type: ValidationType;
  field_name: string | null;
  expected_value: string | null;
  actual_value: string | null;
  payload_hash: string | null;
  payload_sample: Record<string, unknown> | null;
  server_timestamp: Date;
}

export interface ValidationErrorPublic {
  id: number;
  correlationId: string | null;
  deviceId: string | null;
  validationType: ValidationType;
  fieldName: string | null;
  expectedValue: string | null;
  actualValue: string | null;
  payloadHash: string | null;
  payloadSample: Record<string, unknown> | null;
  serverTimestamp: string;
}

export interface CreateValidationErrorInput {
  correlationId?: string;
  deviceId?: string;
  validationType: ValidationType;
  fieldName?: string;
  expectedValue?: string;
  actualValue?: string;
  payloadHash?: string;
  payloadSample?: Record<string, unknown>;
}

export interface ValidationErrorListQuery {
  deviceId?: string;
  validationType?: ValidationType;
  page?: number;
  limit?: number;
}
