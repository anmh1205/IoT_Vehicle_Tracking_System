/**
 * Common Types - CORRECTED based on REVIEW_CORRECTIONS.md
 */

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  timestamp: string;  // Backend always includes timestamp
}

// Standard API response wrapper - Backend TransformInterceptor wraps ALL responses
export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;  // Backend always adds timestamp
    [key: string]: any; // May have additional meta fields
  };
}

// Paginated API response
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// Query parameters for list endpoints
export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Date range filter
export interface DateRange {
  startDate: string;
  endDate: string;
}

// API Error response - matches backend HttpExceptionFilter
export interface ApiError {
  error: {
    code: string;
    message: string;
    status: number;
    path: string;
    details?: any;
    traceId: string;
  };
  timestamp: string;
}

// Base entity with audit fields
export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
}

// Status enum
export type StatusType = 'active' | 'inactive' | 'pending' | 'deleted';

