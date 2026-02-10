import { apiClient } from './client';
import type { Trip, CreateTripInput, UpdateTripInput, TripListQuery } from '@/types/trip.types';
import type { ApiResponse, PaginatedResponse } from '@/types';

export const tripsApi = {
  list: (params?: TripListQuery) =>
    apiClient.get<ApiResponse<PaginatedResponse<Trip>>>('/trips', { params }),

  getById: (id: number) =>
    apiClient.get<ApiResponse<Trip>>(`/trips/${id}`),

  create: (data: CreateTripInput) =>
    apiClient.post<ApiResponse<Trip>>('/trips', data),

  update: (id: number, data: UpdateTripInput) =>
    apiClient.put<ApiResponse<Trip>>(`/trips/${id}`, data),

  startTrip: (id: number) =>
    apiClient.patch<ApiResponse<Trip>>(`/trips/${id}/start`),

  endTrip: (id: number) =>
    apiClient.patch<ApiResponse<Trip>>(`/trips/${id}/end`),
};
