# Implementation Plan: Frontend UX Fixes

## Overview

Plan fix tổng hợp 30 vấn đề frontend: lỗi tính năng (missing action buttons, silent failures, unsafe batch operations), vấn đề UX (unclear text, missing confirmations), và thiếu sót data flow (scattered query invalidation, stale data). Ưu tiên foundation tasks trước (query invalidation helper), sau đó fix từng component.

## Tasks

- [ ] 1. Extend queryInvalidation with alerts namespace
  - Add `queryInvalidation.alerts.all()` that invalidates: `['alerts']`, fuzzy `alerts-summary`, `['device-obd-alerts']`, `['dashboard-recent-alerts']`
  - Add `queryInvalidation.alerts.list()`, `.deviceScoped(qc, deviceId)`, `.summary()`
  - Update `queryInvalidation.notifications.all()` to also invalidate `['notification-stats']`
  - File: `src/lib/utils/query-invalidation.ts`
  - Requirements: 9.1, 9.2

- [ ] 2. Add action buttons to AlertDetailModal
  - Add "Xác nhận", "Giải quyết", "Bỏ qua" buttons in modal footer
  - Buttons disabled when pending, hidden when alert.status === 'resolved'
  - onSuccess: queryInvalidation.alerts.all() + success toast
  - onError: error toast with API message
  - File: `src/features/alerts/components/alert-detail-modal.tsx`
  - Requirements: 1.1, 1.2, 1.3, 1.4

- [ ] 3. Add action buttons to WorkspaceAlertsSection
  - Add "Xác nhận" (when active) and "Giải quyết" (when not resolved) buttons per card
  - Use queryInvalidation.alerts.all() + .deviceScoped() on success
  - Add onError toast handlers
  - File: `src/features/devices/components/device-detail-modal/workspace-alerts-section.tsx`
  - Requirements: 3.1, 3.2

- [ ] 4. Add action column to ErrorCodesTab
  - Add "Hành động" column with "Đánh dấu đã xử lý" button for unresolved codes
  - Add badge "OBD DTC" vs "System" based on error name pattern
  - Invalidate device-errors query on success + toast
  - File: `src/features/devices/components/device-detail-modal/error-codes-tab.tsx`
  - Requirements: 2.1, 2.2, 2.3

- [ ] 5. Refactor bulk alert actions to use Promise.allSettled
  - Replace `selected.forEach((id) => mutation.mutate(id))` with Promise.allSettled batch
  - Add batchPending state that disables both bulk buttons during entire operation
  - Show aggregated toast: success for all-pass, warning for partial failure
  - Clear selection + queryInvalidation.alerts.all() on settle
  - File: `src/app/dashboard/alerts/page.tsx`
  - Requirements: 4.1, 4.2, 4.3, 4.4

- [ ] 6. Add optimistic update for alert resolve
  - onMutate: cancel queries, snapshot, remove row optimistically
  - onError: rollback from snapshot + error toast
  - onSettled: queryInvalidation.alerts.all()
  - File: `src/app/dashboard/alerts/page.tsx`
  - Requirements: 10.1, 10.2, 10.3

- [ ] 7. Add try/catch to SettingsTab onSubmit
  - Wrap entire onSubmit in try/catch
  - Track nameUpdateSucceeded flag for partial save detection
  - If name OK but settings fail: warning toast explaining partial save
  - If name fails: error toast + abort
  - File: `src/features/devices/components/device-detail-modal/settings-tab.tsx`
  - Requirements: 5.1, 5.2, 5.3

- [ ] 8. Add confirm dialog for notification delete
  - Add deleteTarget state and ConfirmDialog component
  - "Ẩn" button sets deleteTarget instead of calling mutate directly
  - Dialog confirms before calling deleteMutation.mutate(id)
  - File: `src/features/notifications/components/notification-list.tsx`
  - Requirements: 6.1, 6.2, 6.3

- [ ] 9. Add onError handlers to notification mutations
  - markReadMutation (list): onError toast "Không thể đánh dấu đã đọc"
  - deleteMutation (list): onError toast "Không thể ẩn thông báo"
  - markAllMutation (dropdown): onError toast "Không thể đánh dấu tất cả đã đọc"
  - markReadMutation (dropdown): onError handler
  - Files: `src/features/notifications/components/notification-list.tsx`, `notification-dropdown.tsx`
  - Requirements: 7.1, 7.2, 7.3

- [ ] 10. Fix notification dropdown text clarity
  - Change "Đánh dấu tất cả" to "Đánh dấu tất cả đã đọc"
  - File: `src/features/notifications/components/notification-dropdown.tsx`
  - Requirements: 8.1

- [ ] 11. Migrate all alert mutations to centralized queryInvalidation
  - Replace scattered queryClient.invalidateQueries calls in AlertsPage
  - Ensure AlertDetailModal uses queryInvalidation.alerts.all()
  - Ensure WorkspaceAlertsSection uses queryInvalidation.alerts.deviceScoped()
  - Files: `src/app/dashboard/alerts/page.tsx`, alert-detail-modal.tsx, workspace-alerts-section.tsx
  - Requirements: 9.3

- [ ] 12. Minor UX improvements
  - Commands tab: update empty state to "Lịch sử lệnh điều khiển" with clearer description
  - Verify alert modal map section already has EmptyState placeholder (no change needed)
  - Ensure device modal header badges have flex-wrap for mobile responsiveness
  - Files: commands-tab.tsx, alert-detail-modal.tsx
  - Requirements: 11.1, 12.1, 13.1

## Task Dependency Graph

```json
{
  "waves": [
    [1, 4, 7, 8, 9, 10, 12],
    [2, 3, 5],
    [6, 11]
  ]
}
```

## Notes

- Task 1 là foundation — phải hoàn thành trước Tasks 2, 3, 5, 6, 11
- Tasks 4, 7, 8, 9, 10, 12 có thể thực hiện song song và độc lập
- Task 6 (optimistic update) nên làm sau Task 5 (batch refactor) vì cùng file
- Task 11 nên làm cuối cùng sau khi Tasks 2, 3 đã implement actions
- Tất cả file paths relative to `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/`
