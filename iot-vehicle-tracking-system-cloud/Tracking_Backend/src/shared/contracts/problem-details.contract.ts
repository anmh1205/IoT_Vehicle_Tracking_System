export interface ValidationErrorItem {
  field: string;
  message: string;
  code: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  requestId: string;
  errors?: ValidationErrorItem[];
}
