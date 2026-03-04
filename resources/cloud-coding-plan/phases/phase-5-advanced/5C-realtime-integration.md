# Phase 5C — Real-time Integration & Notification Center

> Consolidate ALL Socket.IO event handlers, NotificationCenter UI, ConnectionBanner.
> FSD: `features/notifications/`

---

## CRITICAL RULES

```
1. Socket provider already created in 4A — this phase ADDS event handlers and NotificationCenter UI
2. NotificationCenter lives in dashboard header (between Breadcrumbs and ThemeSelector)
3. Real-time patterns: Socket.IO event → invalidate query OR update Zustand store
4. Toast: sonner. Badge: shadcn. Vietnamese text.
```

---

## Task List

| ID     | Description                  | Files                                                         |
| ------ | ---------------------------- | ------------------------------------------------------------- |
| FE-140 | Notification types           | `features/notifications/types/index.ts`                       |
| FE-141 | Notification API             | `lib/api/notifications.ts`                                    |
| FE-142 | Notification hooks           | `features/notifications/hooks/*.ts`                           |
| FE-143 | NotificationBadge            | `features/notifications/components/notification-badge.tsx`    |
| FE-144 | NotificationDropdown         | `features/notifications/components/notification-dropdown.tsx` |
| FE-145 | NotificationItem             | `features/notifications/components/notification-item.tsx`     |
| FE-146 | Add to dashboard header      | Update `app/dashboard/layout.tsx`                             |
| FE-147 | Socket event catalog         | `lib/socket/event-handlers.ts`                                |
| FE-148 | ConnectionBanner integration | Already in 4A — verify placement                              |

---

## Backend API Contract

```
# Notifications
GET    /api/v1/notifications       ?page&limit&isRead
PUT    /api/v1/notifications/:id/read
PUT    /api/v1/notifications/mark-all-read
DELETE /api/v1/notifications/:id

# Socket.IO Events (complete catalog)
# Dashboard
stats:update         → Invalidate dashboard-stats query
activity:new         → Invalidate activity-feed query

# Device
device:status        → { deviceId, status, lastSeenAt } → Update devices query + map store
device:position      → { deviceId, lat, lon, speed, heading } → Update map store

# Alert
alert:new            → { id, alertType, severity, title, message } → Toast + invalidate alerts query + notification badge ++

# Export
export:progress      → { jobId, progress } → Update export progress bar
export:ready         → { jobId, url } → Toast "Xuất dữ liệu hoàn tất" + download link

# Firmware
firmware:progress    → { deploymentId, deviceId, progress } → Update deployment dashboard
firmware:complete    → { deploymentId, deviceId, success } → Invalidate firmware queries

# Geofence
geofence:enter       → { deviceId, geofenceName } → Toast warning
geofence:exit        → { deviceId, geofenceName } → Toast info

# Session
device:session_start → { deviceId, sessionId } → Invalidate device sessions
device:session_end   → { deviceId, sessionId, stats } → Invalidate device sessions

# Command
command:ack          → { commandId, status, response } → Invalidate device commands
```

---

## FE-140: Notification Types

```typescript
// features/notifications/types/index.ts
export interface Notification {
  id: number;
  type: 'alert' | 'system' | 'export' | 'firmware' | 'geofence';
  title: string;
  message: string;
  isRead: boolean;
  referenceId: number | null;
  referenceType: string | null;
  createdAt: string;
}
```

---

## FE-143–145: NotificationCenter

### NotificationBadge
```tsx
// features/notifications/components/notification-badge.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useUnreadCount } from '../hooks/use-unread-count';

export function NotificationBadge({ onClick }: { onClick: () => void }) {
  const { data: count } = useUnreadCount();
  return (
    <Button variant="ghost" size="icon" className="relative" onClick={onClick}>
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Button>
  );
}
```

### NotificationDropdown
Popover (w-80, max-h-96) with:
- Header: "Thông báo" + "Đọc tất cả" button
- ScrollArea with NotificationItem list
- Each item: type icon, title, message (truncated), relative timestamp, read/unread indicator
- Click item → navigate to reference (alert/export/firmware) + mark as read
- Footer: "Xem tất cả" link → future notifications page

### FE-146: Update Dashboard Header

Add NotificationBadge + NotificationDropdown between Breadcrumbs and ThemeSelector in `app/dashboard/layout.tsx`.

---

## FE-147: Socket Event Catalog

Consolidated handler file for reference (actual handlers live in feature-specific hooks). Each feature module registers its own Socket listeners — this file documents the complete event surface.

---

## Verification Checklist

- [ ] NotificationBadge shows unread count with red badge
- [ ] NotificationDropdown opens, shows notification list
- [ ] Click notification → navigates + marks read
- [ ] "Đọc tất cả" marks all as read, badge count resets
- [ ] alert:new Socket event → toast AND badge count ++
- [ ] export:ready Socket event → toast with download link
- [ ] geofence:enter/exit → warning/info toast
- [ ] ConnectionBanner appears on disconnect, hides on reconnect
- [ ] All text Vietnamese
