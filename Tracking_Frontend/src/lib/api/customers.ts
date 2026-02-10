import { apiClient } from './client';
import type { Customer, CreateCustomerInput, UpdateCustomerInput, CustomerListQuery } from '@/types/customer.types';
import type { ApiResponse, PaginatedResponse } from '@/types';

export const customersApi = {
  list: (params?: CustomerListQuery) =>
    apiClient.get<ApiResponse<PaginatedResponse<Customer>>>('/customers', { params }),

  getById: (id: number) =>
    apiClient.get<ApiResponse<Customer>>(`/customers/${id}`),

  create: (data: CreateCustomerInput) =>
    apiClient.post<ApiResponse<Customer>>('/customers', data),

  update: (id: number, data: UpdateCustomerInput) =>
    apiClient.put<ApiResponse<Customer>>(`/customers/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/customers/${id}`),
};
