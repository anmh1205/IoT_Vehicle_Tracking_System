## PHẦN XIII.9.10: VẤN ĐỀ 9 - TYPE SAFETY ISSUES

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

**Lợi ích:**

- ✅ Type safety
- ✅ IntelliSense tốt hơn
- ✅ Tránh runtime errors

---

