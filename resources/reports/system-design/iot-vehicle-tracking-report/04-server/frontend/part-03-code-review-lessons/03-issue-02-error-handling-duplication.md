## PHẦN XIII.9.3: VẤN ĐỀ 2 - ERROR HANDLING LẶP LẠI TRONG API SERVICES

### XIII.9.3 Vấn Đề 2: Error Handling Lặp Lại Trong API Services

#### Vấn Đề

**File:** `src/lib/api/device.ts`, `firmware.ts`, `export.ts`

Mỗi API service method đều có **try-catch + notification** lặp lại:

```typescript
// device.ts - create()
create: async (params: Device.CreateDeviceRequest) => {
    try {
        const result = await http.post<unknown>(API.DEVICE.MANAGE, params);
        notificationUtils.success(
            'Tạo thiết bị thành công',
            `Thiết bị ${params.device_name} đã được tạo thành công`
        );
        return result;
    } catch (error) {
        notificationUtils.error(
            'Lỗi tạo thiết bị',
            'Không thể tạo thiết bị mới. Vui lòng thử lại.'
        );
        throw error;
    }
},

// firmware.ts - upload()
upload: async (file: File, firmwareName?: string, version?: string) => {
    try {
        // ... code
        notificationUtils.success(
            'Tải lên firmware thành công',
            `Firmware ${firmwareName || file.name} đã được tải lên thành công`
        );
        return result;
    } catch (error) {
        notificationUtils.error(
            'Lỗi tải lên firmware',
            'Không thể tải lên firmware. Vui lòng kiểm tra file và thử lại.'
        );
        throw error;
    }
},
```

**Thống kê:**

- 74 lần sử dụng `notificationUtils.success/error` trong codebase
- Mỗi API method đều có try-catch riêng
- Notification messages hardcode trong service layer

#### Giải Pháp

**Option 1: Wrapper function cho API calls**

```typescript
// src/lib/api/utils.ts
export function withNotification<T>(
  apiCall: () => Promise<T>,
  messages: {
    success: string | ((data: T) => string);
    error: string;
  }
): Promise<T> {
  return apiCall()
    .then((data) => {
      const message =
        typeof messages.success === "function"
          ? messages.success(data)
          : messages.success;
      notificationUtils.success(message);
      return data;
    })
    .catch((error) => {
      notificationUtils.error(messages.error);
      throw error;
    });
}

// Usage
export const deviceServices = {
  create: (params: Device.CreateDeviceRequest) =>
    withNotification(() => http.post<unknown>(API.DEVICE.MANAGE, params), {
      success: `Thiết bị ${params.device_name} đã được tạo thành công`,
      error: "Không thể tạo thiết bị mới. Vui lòng thử lại.",
    }),
};
```

**Option 2: Move notifications to hooks (RECOMMENDED)**

```typescript
// ❌ BAD: Notification trong service
export const deviceServices = {
  create: async (params: Device.CreateDeviceRequest) => {
    try {
      const result = await http.post<unknown>(API.DEVICE.MANAGE, params);
      notificationUtils.success("Tạo thiết bị thành công");
      return result;
    } catch (error) {
      notificationUtils.error("Lỗi tạo thiết bị");
      throw error;
    }
  },
};

// ✅ GOOD: Notification trong hook
export const deviceServices = {
  create: (params: Device.CreateDeviceRequest) =>
    http.post<unknown>(API.DEVICE.MANAGE, params),
};

// Hook
export const useCreateDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deviceServices.create,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["devices", "list"] });
      notificationUtils.success(
        `Thiết bị ${variables.device_name} đã được tạo thành công`
      );
    },
    onError: () => {
      notificationUtils.error("Không thể tạo thiết bị mới. Vui lòng thử lại.");
    },
  });
};
```

**Lợi ích:**

- ✅ Separation of concerns: Service chỉ làm API calls
- ✅ Reusable: Có thể dùng service mà không cần notification
- ✅ Testable: Dễ test service layer
- ✅ Flexible: Có thể customize notification per use case

---

