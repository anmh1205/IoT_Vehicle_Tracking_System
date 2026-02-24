# EH-0 — Shared Infrastructure & Cross-cutting Concerns

> Tạo các hooks, utils, types dùng chung cần thiết trước khi implement các module khác.
> **PHẢI LÀM TRƯỚC TẤT CẢ PHASE KHÁC**

---

## CRITICAL RULES

```
- Tất cả hooks/utils ở đây được dùng bởi NHIỀU modules
- KHÔNG duplicate logic — 1 hook dùng chung, import everywhere
- Tham khảo pattern từ IVM26: E:\anmh1205\ivm26\IVM26_Frontend\frontend_v2\src\
```

---

## Task List

| ID      | Description                                                                                | Files                                            | Ref IVM26                                    |
| ------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------- |
| EH-0-01 | Hook `useRoleAccess` — RBAC checks (canViewSystemInfo, canEditDevice, canManageUsers)      | `src/hooks/use-role-access.ts`                   | `hooks/use-role-access.ts`                   |
| EH-0-02 | Hook `useRealtimeSubscription` — generic Socket.IO event listener                          | `src/hooks/use-realtime-subscription.ts`         | `hooks/use-realtime-subscription.ts`         |
| EH-0-03 | Hook `useDeviceStatusRealtime` — derive device status from last_seen_at + request_interval | `src/hooks/use-device-status-realtime.ts`        | `hooks/use-device-status-realtime.ts`        |
| EH-0-04 | Hook `useCreateExport` — mutation hook for export jobs                                     | `src/hooks/mutations/use-create-export.ts`       | `hooks/mutations/use-create-export.ts`       |
| EH-0-05 | Utility `query-invalidation.ts` — centralized query key invalidation                       | `src/lib/utils/query-invalidation.ts`            | `lib/utils/query-invalidation.ts`            |
| EH-0-06 | Utility `notification-utils.ts` — toast wrappers (success, error, warning, info)           | `src/lib/notification.ts`                        | `lib/notification.ts`                        |
| EH-0-07 | Utility `logger.ts` — frontend logger (dev console, production silent)                     | `src/lib/utils/logger.ts`                        | `lib/utils/logger.ts`                        |
| EH-0-08 | Utility `date/format.ts` — formatTime, formatDuration, formatRelative                      | `src/lib/utils/date/format.ts`                   | `lib/utils/date/format.ts`                   |
| EH-0-09 | Component `PageContainer` — verify/upgrade to match IVM26 pattern                          | `src/components/layout/PageContainer.tsx`        | `components/layout/PageContainer.tsx`        |
| EH-0-10 | API service `export.ts` — export CRUD API                                                  | `src/lib/api/export.ts`                          | `lib/api/export.ts`                          |
| EH-0-11 | API service `device-detail.ts` — aggregate device detail API                               | `src/lib/api/device-detail.ts`                   | `lib/api/device-detail.ts`                   |
| EH-0-12 | Realtime provider upgrade — add joinDeviceRoom/leaveDeviceRoom methods                     | `src/components/providers/realtime-provider.tsx` | `components/providers/realtime-provider.tsx` |

---

## EH-0-01: useRoleAccess

```typescript
// src/hooks/use-role-access.ts
import { useAuthStore } from '@/lib/store/auth-store';

export function useRoleAccess() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'viewer';

  return {
    // View permissions
    canViewSystemInfo: role === 'root' || role === 'admin',
    canViewAllDevices: role !== 'viewer',

    // Edit permissions  
    canEditDevice: role === 'root' || role === 'admin' || role === 'operator',
    canManageUsers: role === 'root' || role === 'admin',
    canManageFirmware: role === 'root' || role === 'admin',
    canExportData: role !== 'viewer',

    // Admin permissions
    canAccessSystemAdmin: role === 'root' || role === 'admin',
    canDeleteDevice: role === 'root' || role === 'admin',

    // Raw role
    role,
    isRoot: role === 'root',
    isAdmin: role === 'admin',
  };
}
```

## EH-0-02: useRealtimeSubscription

```typescript
// src/hooks/use-realtime-subscription.ts
import { useEffect, useRef } from 'react';
import { useSocket } from '@/components/providers/socket-provider';

interface UseRealtimeSubscriptionOptions<T> {
  namespace?: string;
  event: string;
  enabled?: boolean;
  handler: (payload: T) => void;
}

export function useRealtimeSubscription<T>({
  event,
  enabled = true,
  handler,
}: UseRealtimeSubscriptionOptions<T>) {
  const socket = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket || !enabled) return;

    const listener = (payload: T) => handlerRef.current(payload);
    socket.on(event, listener);
    return () => { socket.off(event, listener); };
  }, [socket, event, enabled]);
}
```

## EH-0-05: query-invalidation.ts

```typescript
// src/lib/utils/query-invalidation.ts
import type { QueryClient } from '@tanstack/react-query';

export const queryInvalidation = {
  device: {
    all: (qc: QueryClient, deviceId?: number) => {
      qc.invalidateQueries({ queryKey: ['devices'] });
      if (deviceId) qc.invalidateQueries({ queryKey: ['device', deviceId] });
    },
    detail: (qc: QueryClient, deviceId: number) => {
      qc.invalidateQueries({ queryKey: ['device', deviceId] });
      qc.invalidateQueries({ queryKey: ['device-detail', deviceId] });
    },
    sessions: (qc: QueryClient, deviceId: number) => {
      qc.invalidateQueries({ queryKey: ['device-sessions', deviceId] });
    },
    errorCodes: (qc: QueryClient, deviceId: number) => {
      qc.invalidateQueries({ queryKey: ['device-errors', deviceId] });
    },
  },
  dashboard: {
    all: (qc: QueryClient) => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  },
  notifications: {
    all: (qc: QueryClient) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  },
};
```

## EH-0-06: notification-utils.ts

```typescript
// src/lib/notification.ts
import { toast } from 'sonner';

export const notificationUtils = {
  success: (title: string, description?: string) =>
    toast.success(title, { description }),
  error: (title: string, description?: string) =>
    toast.error(title, { description }),
  warning: (title: string, description?: string) =>
    toast.warning(title, { description }),
  info: (title: string, description?: string) =>
    toast.info(title, { description }),
  promise: <T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string }
  ) => toast.promise(promise, msgs),
};
```

---

## Verification Checklist

- [ ] `useRoleAccess` returns correct permissions per role
- [ ] `useRealtimeSubscription` subscribes/unsubscribes correctly
- [ ] `queryInvalidation.device.all()` invalidates device queries
- [ ] `notificationUtils.success()` shows toast
- [ ] `formatTime(3600)` → "1h 0m"
- [ ] All hooks import correctly from other modules
