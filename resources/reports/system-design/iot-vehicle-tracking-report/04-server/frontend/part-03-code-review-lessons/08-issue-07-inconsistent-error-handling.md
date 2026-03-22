## PHẦN XIII.9.8: VẤN ĐỀ 7 - INCONSISTENT ERROR HANDLING

### XIII.9.8 Vấn Đề 7: Inconsistent Error Handling

#### Vấn Đề

**File:** `src/lib/api/device.ts`, `firmware.ts`

Một số methods có try-catch, một số không:

```typescript
// device.ts - list() - KHÔNG có try-catch
list: (params?: Device.DeviceFilter) => {
    // ...
    return http.get<any>(url).then(/* ... */);
},

// device.ts - create() - CÓ try-catch
create: async (params: Device.CreateDeviceRequest) => {
    try {
        // ...
    } catch (error) {
        // ...
    }
},
```

#### Giải Pháp

**Consistent error handling:**

- **Option 1:** Không có try-catch trong service layer → handle trong hooks
- **Option 2:** Có try-catch trong service layer → consistent pattern

**Recommendation: Option 1** (handle trong hooks)

```typescript
// Service layer - NO try-catch
export const deviceServices = {
  create: (params: Device.CreateDeviceRequest) =>
    http.post<unknown>(API.DEVICE.MANAGE, params),
};

// Hook layer - HAS try-catch + notification
export const useCreateDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deviceServices.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices", "list"] });
      notificationUtils.success("Tạo thiết bị thành công");
    },
    onError: () => {
      notificationUtils.error("Không thể tạo thiết bị mới. Vui lòng thử lại.");
    },
  });
};
```

**Lợi ích:**

- ✅ Consistent pattern
- ✅ Service layer đơn giản hơn
- ✅ Error handling tập trung ở hooks

---

