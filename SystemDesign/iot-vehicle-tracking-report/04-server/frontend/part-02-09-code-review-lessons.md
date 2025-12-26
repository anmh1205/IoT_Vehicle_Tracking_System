## PHẦN XIII.9: CODE REVIEW - BÀI HỌC TỪ EXAMPLE/FRONTEND_V2

**File này đã được tách thành các file chi tiết trong folder `part-02-09-code-review-lessons/`:**

Xem [`part-02-09-code-review-lessons/README.md`](./part-02-09-code-review-lessons/README.md) để xem danh sách đầy đủ các file.

---

### XIII.9.1 Tổng Quan

Tài liệu này tổng hợp các vấn đề, code lặp lại, và anti-patterns tìm thấy trong `Example/frontend_v2` để **tránh lặp lại** trong frontend của Vehicle Tracking System.

---

### XIII.9.2 Vấn Đề 1: Code Lặp Lại Trong HTTP Client

#### Vấn Đề

**File:** `src/lib/api/http.ts`

Có **4 hàm tương tự nhau** với logic lặp lại:

- `request()` - JSON requests
- `requestForm()` - FormData requests
- `requestBlob()` - Blob responses
- `requestText()` - Text responses

**Code lặp lại:**

```typescript
// Lặp lại trong mỗi hàm:
1. Lấy token từ authStore
2. Tạo AbortController + timeout
3. Xử lý 401 (session expired)
4. Xử lý 500 (server error)
5. Xử lý 408 (timeout)
6. Clear timeout
7. Xử lý AbortError
```

**Ví dụ:**

```typescript
// request() - lines 66-130
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  return retryRequest(async () => {
    const token =
      typeof window !== "undefined" ? useAuthStore.getState().token : null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
        ...options,
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 401) {
          notifySessionExpired();
          try {
            useAuthStore.getState().logout();
          } catch {}
        } else if (res.status >= 500) {
          notificationUtils.error("Lỗi máy chủ", "...");
        } else if (res.status === 408) {
          notificationUtils.error("Hết thời gian chờ", "...");
        }
        throw new Error(`HTTP ${res.status}`);
      }
      // ... parse response
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new TypeError("Request timeout");
      }
      throw error;
    }
  });
}

// requestForm() - lines 133-179 (TƯƠNG TỰ)
// requestBlob() - lines 181-225 (TƯƠNG TỰ)
// requestText() - lines 227-270 (TƯƠNG TỰ)
```

#### Giải Pháp

**Tạo base function chung:**

```typescript
// Base request function
async function baseRequest<T>(
  endpoint: string,
  options: RequestInit & {
    timeout?: number;
    responseType?: "json" | "blob" | "text";
    skipContentType?: boolean;
  } = {}
): Promise<T> {
  return retryRequest(async () => {
    const {
      timeout = 30000,
      responseType = "json",
      skipContentType = false,
      ...fetchOptions
    } = options;

    const token =
      typeof window !== "undefined" ? useAuthStore.getState().token : null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers: HeadersInit = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(skipContentType ? {} : { "Content-Type": "application/json" }),
        ...(fetchOptions.headers || {}),
      };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        handleErrorResponse(res);
        throw new Error(`HTTP ${res.status}`);
      }

      return await parseResponse<T>(res, responseType);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new TypeError("Request timeout");
      }
      throw error;
    }
  });
}

// Helper functions
function handleErrorResponse(res: Response): void {
  if (res.status === 401) {
    notifySessionExpired();
    try {
      useAuthStore.getState().logout();
    } catch {}
  } else if (res.status >= 500) {
    notificationUtils.error(
      "Lỗi máy chủ",
      "Máy chủ đang gặp sự cố. Vui lòng thử lại sau."
    );
  } else if (res.status === 408) {
    notificationUtils.error(
      "Hết thời gian chờ",
      "Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại."
    );
  }
}

async function parseResponse<T>(
  res: Response,
  responseType: "json" | "blob" | "text"
): Promise<T> {
  if (res.status === 204 || res.status === 205) {
    return null as T;
  }

  switch (responseType) {
    case "blob":
      return { blob: await res.blob(), headers: res.headers } as T;
    case "text":
      return res.text() as Promise<T>;
    case "json":
    default:
      const text = await res.text();
      if (!text || text.trim().length === 0) {
        return null as T;
      }
      try {
        return JSON.parse(text) as T;
      } catch (e) {
        if (e instanceof SyntaxError) {
          return null as T;
        }
        throw e;
      }
  }
}

// Wrapper functions
export const http = {
  get: <T>(endpoint: string) => baseRequest<T>(endpoint, { method: "GET" }),
  post: <T>(endpoint: string, body?: unknown) =>
    baseRequest<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown) =>
    baseRequest<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string, body?: unknown) =>
    baseRequest<T>(endpoint, {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    }),
  getBlob: (endpoint: string) =>
    baseRequest<{ blob: Blob; headers: Headers }>(endpoint, {
      responseType: "blob",
    }),
  getText: (endpoint: string) =>
    baseRequest<string>(endpoint, { responseType: "text" }),
  postForm: <T>(endpoint: string, formData: FormData) =>
    baseRequest<T>(
      endpoint,
      {
        method: "POST",
        body: formData,
        skipContentType: true,
        timeout: 60000,
      },
      2
    ), // Only retry 2 times for file uploads
};
```

**Lợi ích:**

- ✅ Giảm code từ ~270 lines xuống ~150 lines
- ✅ Dễ maintain (sửa 1 chỗ thay vì 4 chỗ)
- ✅ Consistent error handling
- ✅ Dễ test hơn

---

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

### XIII.9.5 Vấn Đề 4: URLSearchParams Logic Lặp Lại

#### Vấn Đề

**File:** `src/lib/api/device.ts`, `firmware.ts`

Logic tạo query string lặp lại:

```typescript
// device.ts - list()
list: (params?: Device.DeviceFilter) => {
    const query = params
        ? new URLSearchParams(
            Object.entries(params)
                .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
                .map(([k, v]) => [k, String(v)])
        ).toString()
        : '';
    const url = API.DEVICE.LIST + (query ? `?${query}` : '');
    // ...
},

// firmware.ts - assignments()
assignments: async (params?: Firmware.FirmwareFilter) => {
    const qs = new URLSearchParams();
    if (params?.device_id) qs.set('device_id', params.device_id);
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    const url = `${API.FIRMWARE.ASSIGNMENTS}${qs.toString() ? `?${qs.toString()}` : ''}`;
    // ...
},
```

#### Giải Pháp

**Tạo utility function:**

```typescript
// src/lib/utils/query-string.ts
export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

// Advanced version với filtering
export function buildQueryStringAdvanced(
  params: Record<string, unknown>,
  options: {
    filterEmpty?: boolean;
    filterNull?: boolean;
    filterUndefined?: boolean;
  } = {}
): string {
  const {
    filterEmpty = true,
    filterNull = true,
    filterUndefined = true,
  } = options;

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (filterUndefined && value === undefined) return;
    if (filterNull && value === null) return;
    if (filterEmpty && String(value).trim() === "") return;

    searchParams.append(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

// Usage
export const deviceServices = {
  list: (params?: Device.DeviceFilter) => {
    const url = API.DEVICE.LIST + buildQueryStringAdvanced(params || {});
    return http.get<any>(url).then(/* ... */);
  },
};
```

**Lợi ích:**

- ✅ DRY (Don't Repeat Yourself)
- ✅ Consistent query string building
- ✅ Dễ test và maintain

---

### XIII.9.6 Vấn Đề 5: File Download Logic Lặp Lại

#### Vấn Đề

**File:** `src/lib/api/export.ts`

Có **2 functions** download file với logic tương tự:

- `downloadBase64File()` - Download từ base64
- `downloadExport()` - Download từ blob

**Code lặp lại:**

```typescript
// downloadBase64File() - lines 10-45
const url = window.URL.createObjectURL(blob);
const link = document.createElement("a");
link.href = url;
link.download = fileName;
link.style.display = "none";
document.body.appendChild(link);
link.click();
setTimeout(() => {
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}, 100);

// downloadExport() - lines 116-123 (TƯƠNG TỰ)
const url = window.URL.createObjectURL(blob);
const link = document.createElement("a");
link.href = url;
link.download = fileName;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
window.URL.revokeObjectURL(url);
```

#### Giải Pháp

**Tạo utility function chung:**

```typescript
// src/lib/utils/file-download.ts
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
}

export function downloadBase64(base64Data: string, fileName: string): void {
  // Validate and clean base64
  let cleanBase64 = base64Data;
  if (base64Data.includes(",")) {
    cleanBase64 = base64Data.split(",")[1];
  }

  // Convert to blob
  const byteCharacters = atob(cleanBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  downloadBlob(blob, fileName);
}

// Usage
export const exportServices = {
  createExport: async (context: Export.ExportConfigInput) => {
    const response = await http.post<Export.ExportResponse>(
      "/exports",
      context
    );

    if (response.kind === "buffer" && response.data) {
      const fileName = response.fileName?.endsWith(".xlsx")
        ? response.fileName
        : `${response.fileName}.xlsx`;
      downloadBase64(response.data, fileName);
      notificationUtils.success("Xuất file thành công");
    }

    return response;
  },

  downloadExport: async (token: string) => {
    const { blob, headers } = await http.getBlob(`/exports/download/${token}`);
    const fileName = extractFileNameFromHeaders(headers) || "export.xlsx";
    downloadBlob(blob, fileName);
    notificationUtils.success("Tải file thành công");
  },
};
```

**Lợi ích:**

- ✅ DRY
- ✅ Reusable
- ✅ Consistent behavior

---

### XIII.9.7 Vấn Đề 6: Duplicate Utils Files

#### Vấn Đề

**Files:**

- `src/lib/utils/device-status.ts`
- `src/lib/utils/device/status.ts` (có thể duplicate)

Cần kiểm tra xem có duplicate logic không.

#### Giải Pháp

**Consolidate utils:**

- Tổ chức utils theo domain (device, date, format, etc.)
- Tránh duplicate files
- Sử dụng barrel exports (`index.ts`)

```typescript
// src/lib/utils/device/index.ts
export * from "./status";
export * from "./runtime";
export * from "./aggregation";

// src/lib/utils/index.ts
export * from "./device";
export * from "./date";
export * from "./format";
```

---

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

---

### XIII.9.9 Vấn Đề 8: Magic Numbers và Hardcoded Values

#### Vấn Đề

**File:** `src/lib/api/http.ts`

Magic numbers và hardcoded values:

```typescript
setTimeout(() => controller.abort(), 30000); // Magic number
setTimeout(() => controller.abort(), 60000); // Magic number (file uploads)
const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
```

#### Giải Pháp

**Tạo constants:**

```typescript
// src/lib/constants/api.ts
export const API_TIMEOUTS = {
  DEFAULT: 30000, // 30 seconds
  FILE_UPLOAD: 60000, // 60 seconds
  EXPORT: 120000, // 2 minutes
} as const;

export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000, // 1 second
  MAX_DELAY: 10000, // 10 seconds
} as const;

// Usage
const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUTS.DEFAULT);
```

---

### XIII.9.10 Vấn Đề 9: Type Safety Issues

#### Vấn Đề

**File:** `src/lib/api/device.ts`

Sử dụng `any` type:

```typescript
list: (params?: Device.DeviceFilter) => {
    // ...
    return http.get<any>(url)  // ❌ any type
        .then(rawResponse => {
            const raw = rawResponse.devices ?? rawResponse.data?.devices ?? [];
            // ...
        });
},
```

#### Giải Pháp

**Define proper types:**

```typescript
// src/types/api/device.d.ts
export namespace Device {
    export interface DeviceListResponse {
        devices: DeviceDto[];
        meta?: {
            total: number;
            page: number;
            pageSize: number;
        };
    }
}

// Usage
list: (params?: Device.DeviceFilter) => {
    const url = API.DEVICE.LIST + buildQueryString(params || {});
    return http.get<Device.DeviceListResponse>(url)
        .then(response => {
            const devices = response.devices ?? [];
            return devices.map(/* ... */);
        });
},
```

---

### XIII.9.11 Tổng Kết và Khuyến Nghị

#### Checklist cho Frontend Mới

**✅ HTTP Client:**

- [ ] Tạo base request function (tránh code lặp)
- [ ] Centralized error handling
- [ ] Timeout constants
- [ ] Retry logic với exponential backoff

**✅ API Services:**

- [ ] NO try-catch trong service layer
- [ ] NO notifications trong service layer
- [ ] Proper TypeScript types (không dùng `any`)
- [ ] Query string builder utility
- [ ] Consistent response mapping

**✅ Hooks:**

- [ ] Notifications trong `onSuccess`/`onError`
- [ ] Query invalidation helpers
- [ ] Consistent mutation patterns
- [ ] Error handling trong hooks

**✅ Utils:**

- [ ] File download utilities
- [ ] Query string builders
- [ ] Date/time formatters
- [ ] Barrel exports (`index.ts`)

**✅ Constants:**

- [ ] API timeouts
- [ ] Retry configs
- [ ] Error messages (nếu cần)
- [ ] Query keys (centralized)

**✅ Code Organization:**

- [ ] Feature-based structure
- [ ] No duplicate utils
- [ ] Consistent naming conventions
- [ ] Proper TypeScript types

---

### XIII.9.12 Best Practices

1. **Separation of Concerns:**

   - Service layer: API calls only
   - Hook layer: State management + notifications
   - Component layer: UI only

2. **DRY Principle:**

   - Extract common logic to utilities
   - Use helper functions
   - Avoid code duplication

3. **Type Safety:**

   - Avoid `any` types
   - Define proper interfaces
   - Use TypeScript strictly

4. **Error Handling:**

   - Consistent error handling pattern
   - User-friendly error messages
   - Proper error logging

5. **Code Organization:**
   - Feature-based structure
   - Barrel exports
   - Clear file naming

---

**Lưu ý:** Tài liệu này dựa trên code review của `Example/frontend_v2`. Áp dụng các bài học này vào frontend mới để tránh lặp lại các vấn đề tương tự.
