/**
 * Customer API Service
 */
import { http } from './http';
import { API } from './endpoints';
import type {
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
  QueryCustomerDto,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

function buildQueryString(params?: QueryCustomerDto): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const customerServices = {
  list: async (params?: QueryCustomerDto): Promise<PaginatedResponse<Customer>> => {
    const query = buildQueryString(params);
    return http.get<PaginatedResponse<Customer>>(`${API.CUSTOMERS.LIST}${query}`);
  },

  getById: async (id: number | string): Promise<ApiResponse<Customer>> => {
    return http.get<ApiResponse<Customer>>(API.CUSTOMERS.DETAILS(id));
  },

  create: async (data: CreateCustomerDto): Promise<ApiResponse<Customer>> => {
    return http.post<ApiResponse<Customer>>(API.CUSTOMERS.CREATE, data);
  },

  update: async (id: number | string, data: UpdateCustomerDto): Promise<ApiResponse<Customer>> => {
    return http.put<ApiResponse<Customer>>(API.CUSTOMERS.UPDATE(id), data);
  },

  delete: async (id: number | string): Promise<void> => {
    await http.delete(API.CUSTOMERS.DELETE(id));
  },
};

