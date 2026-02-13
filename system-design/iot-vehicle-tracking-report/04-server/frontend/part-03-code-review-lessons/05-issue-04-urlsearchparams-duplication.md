## PHẦN XIII.9.5: VẤN ĐỀ 4 - URLSEARCHPARAMS LOGIC LẶP LẠI

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

