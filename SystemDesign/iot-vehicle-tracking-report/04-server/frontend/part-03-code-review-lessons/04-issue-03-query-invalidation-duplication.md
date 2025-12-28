## PHẦN XIII.9.4: VẤN ĐỀ 3 - QUERY INVALIDATION LẶP LẠI

### XIII.9.4 Vấn Đề 3: Query Invalidation Lặp Lại

#### Vấn Đề

**File:** `src/hooks/mutations/useDeviceUpdate.ts`, `useDeviceSettings.ts`

Query invalidation logic lặp lại trong nhiều hooks:

```typescript
// useDeviceUpdate.ts
onSuccess: (data, variables) => {
    queryClient.invalidateQueries({ queryKey: ['devices', 'list'] });
    queryClient.invalidateQueries({ queryKey: ['device', variables.deviceId, 'detail'] });
    queryClient.invalidateQueries({ queryKey: ['device', variables.deviceId, 'sessions'] });
    // ...
},

// useDeviceSettings.ts
onSuccess: (data, variables) => {
    queryClient.invalidateQueries({ queryKey: ['device', variables.deviceId] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    // ...
},
```

**Thống kê:**

- 48 lần sử dụng `queryClient.invalidateQueries` trong codebase
- Logic invalidation lặp lại nhiều nơi

#### Giải Pháp

**Tạo helper functions cho query invalidation:**

```typescript
// src/lib/query/invalidation.ts
export const queryInvalidation = {
  // Device queries
  device: {
    list: (queryClient: QueryClient) =>
      queryClient.invalidateQueries({ queryKey: ["devices", "list"] }),

    detail: (queryClient: QueryClient, deviceId: string) =>
      queryClient.invalidateQueries({
        queryKey: ["device", deviceId, "detail"],
      }),

    sessions: (queryClient: QueryClient, deviceId: string) =>
      queryClient.invalidateQueries({
        queryKey: ["device", deviceId, "sessions"],
      }),

    all: (queryClient: QueryClient, deviceId: string) => {
      queryInvalidation.device.list(queryClient);
      queryInvalidation.device.detail(queryClient, deviceId);
      queryInvalidation.device.sessions(queryClient, deviceId);
    },
  },

  // Dashboard queries
  dashboard: {
    stats: (queryClient: QueryClient) =>
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] }),
  },
};

// Usage
export const useDeviceUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      deviceId: string;
      updates: Device.UpdateDeviceRequest;
    }) => deviceServices.update(data.deviceId, data.updates),
    onSuccess: (data, variables) => {
      queryInvalidation.device.all(queryClient, variables.deviceId);

      if (
        variables.updates.device_id &&
        variables.updates.device_id !== variables.deviceId
      ) {
        queryInvalidation.device.all(queryClient, variables.updates.device_id);
      }
    },
  });
};
```

**Lợi ích:**

- ✅ Centralized invalidation logic
- ✅ Consistent invalidation patterns
- ✅ Dễ maintain và refactor
- ✅ Tránh missing invalidations

---

