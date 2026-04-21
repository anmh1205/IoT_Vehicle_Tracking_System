# Research Report: IVM26 firmware frontend patterns

## Executive Summary
IVM26 `frontend_v2` dùng cấu trúc firmware page khá rõ: 1 trang trung tâm, 3 khối chính theo thứ tự `stats -> list -> assignment log`, và 1 flow gán firmware riêng cho thiết bị. Pattern này tốt cho IA vì dồn mọi hành động firmware vào 1 entrypoint, giảm lạc hướng.

Điểm mạnh: progressive disclosure hợp lý, loading/empty/error states có hiện diện, destructive actions bị nhốt trong dialog xác nhận. Điểm yếu: status lifecycle còn rời rạc, một số nhãn và mode đang lẫn `stable/fixed`, có chỗ dùng `any`, và submit flow chưa khóa chặt khi lỗi/đang pending.

## Research Methodology
- Scope: firmware / ota pages, components, hooks, services in `frontend_v2`
- Sources: 5 files read + file discovery via grep
- Key terms: firmware, ota, assignment, status, loading, empty, error, primary action, secondary action
- Date: 2026-04-20

## Key Findings

### 1) IA / hierarchy
- `src/app/dashboard/firmware/page.tsx:31-169` là entrypoint duy nhất cho firmware.
- Page order: stats -> list -> assignment -> logs.
- This is clean hierarchy: overview first, then management, then audit trail.
- Good for firmware ops because users see health before action.

### 2) Progressive disclosure
- `firmware-list.tsx:167-433` shows table first, then upload dialog, then delete confirmation dialog.
- Upload is drag/drop entry, then modal asks metadata.
- Delete is one-step destructive confirmation.
- `firmware-assignment.tsx:110-249` keeps device table compact; details only exposed in confirm dialog.

### 3) Status lifecycle
- `firmware-assignment.tsx:153-168` and `firmware-assignments-log.tsx:63-124` expose `stable/fixed` mode and operational status.
- `firmware-list.tsx:238-253` maps `is_active` to `Stable` badge, others to `Fixed`.
- `firmware-stats.tsx:12-52` summarizes stable count/version/size.
- Lifecycle intent is clear: uploaded -> active/stable -> assigned -> logged.
- But lifecycle model is not fully normalized; same concept appears as `is_active`, `is_stable`, `stable`, `fixed`.

### 4) Loading / empty / error
- List has explicit loading skeleton, empty state, error box: `firmware-list.tsx:213-221`.
- Assignment logs have loading skeleton and empty state: `firmware-assignments-log.tsx:46-50`, `97-100`.
- Device table has empty state: `firmware-assignment.tsx:131-136`.
- This is good baseline; no silent failure.

### 5) Primary vs secondary actions
- Primary actions: upload, confirm assign, set stable.
- Secondary actions: search, cancel, close dialogs, delete.
- `firmware-list.tsx:264-285` makes “Đặt stable” visible only for non-stable rows, which reduces noise.
- `firmware-assignment.tsx:171-190` uses select as input, then confirm dialog as gate.
- Good separation, but delete icon-only button is weaker discoverability.

## Fit vs current project
### Phù hợp
- 1-page hub + section stack is good if current project already has dashboard cards/tables.
- Dialog-gated destructive actions fit current repo’s admin-heavy flows.
- Skeleton + empty + error triad is reusable for current firmware pages.
- Badge-driven status works well for current device/OTA dashboards.

### Không phù hợp / nên tránh
- Don’t copy mode naming as-is if current project wants a stricter OTA model; `stable/fixed` is semantically mixed.
- Avoid `any`/dual-state ambiguity for status lifecycle.
- Don’t rely on icon-only destructive action if current UX needs clearer affordance.
- Don’t keep post-action invalidation scattered; current repo should centralize query refresh if possible.

## Concrete recommendations for current project
1. Keep page skeleton: Stats -> List -> Assignment -> Logs.
2. Normalize firmware lifecycle enum early: `draft/uploaded/stable/assigned/failed/rolled_back` if current backend supports it.
3. Use one shared empty/error component for firmware tables.
4. Keep confirm dialog for assign/delete; no inline destructive action.
5. Split status chips from action buttons; avoid mixing signal and control.
6. If current project has OTA rollout phases, add a dedicated progress card above logs, not inside row tables.

## File refs
- `frontend_v2/src/app/dashboard/firmware/page.tsx:31-169`
- `frontend_v2/src/features/firmware/components/firmware-list.tsx:31-433`
- `frontend_v2/src/features/firmware/components/firmware-stats.tsx:11-55`
- `frontend_v2/src/features/firmware/components/firmware-assignment.tsx:33-249`
- `frontend_v2/src/features/firmware/components/firmware-assignments-log.tsx:32-136`

## Unresolved questions
- Current project firmware lifecycle enum is what exactly?
- OTA rollout needs per-device progress or only command-level status?
- Should current project favor list-first or stats-first hierarchy?
- Do we need a reusable empty/error component already existing in current repo?
