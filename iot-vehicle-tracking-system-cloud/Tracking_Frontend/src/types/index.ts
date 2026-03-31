export interface NavItem {
  title: string;
  url: string;
  icon?: any;
  items?: NavItem[];
}

export interface ApiEnvelope<T> {
  data: T;
  requestId: string;
  meta?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface SelectOption {
  label: string;
  value: string;
}
