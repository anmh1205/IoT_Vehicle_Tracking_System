export interface NavItem {
  title: string;
  url: string;
  icon?: any;
  items?: NavItem[];
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  timestamp: string;
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
