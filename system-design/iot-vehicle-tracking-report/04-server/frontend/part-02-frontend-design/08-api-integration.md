## XIII.8 API Integration

### XIII.8.1 HTTP Client

```typescript
// src/lib/api/http.ts
// Dựa trên Example/frontend_v2/src/lib/api/http.ts
// - Retry logic với exponential backoff
// - Timeout handling
// - 401 auto logout
// - Error notifications
```

### XIII.8.2 API Modules

```typescript
// src/lib/api/vehicles.ts
export const vehicleApi = {
  list: (params?: VehicleListParams) => 
    http.get<VehicleListResponse>('/vehicles', { params }),
  get: (id: number) => 
    http.get<Vehicle>(`/vehicles/${id}`),
  create: (data: CreateVehicleDto) => 
    http.post<Vehicle>('/vehicles', data),
  update: (id: number, data: UpdateVehicleDto) => 
    http.put<Vehicle>(`/vehicles/${id}`, data),
  delete: (id: number) => 
    http.delete(`/vehicles/${id}`),
  getStatus: (id: number) => 
    http.get<VehicleStatus>(`/vehicles/${id}/status`),
};
```

### XIII.8.3 React Query Hooks

```typescript
// src/features/vehicles/hooks/useVehicles.ts
export function useVehicles(params?: VehicleListParams) {
  return useQuery({
    queryKey: ['vehicles', params],
    queryFn: () => vehicleApi.list(params),
  });
}

export function useVehicle(id: number) {
  return useQuery({
    queryKey: ['vehicles', id],
    queryFn: () => vehicleApi.get(id),
    enabled: !!id,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehicleApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}
```

