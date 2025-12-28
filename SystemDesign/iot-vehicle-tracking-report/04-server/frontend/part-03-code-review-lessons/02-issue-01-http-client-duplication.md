## PHẦN XIII.9.2: VẤN ĐỀ 1 - CODE LẶP LẠI TRONG HTTP CLIENT

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

