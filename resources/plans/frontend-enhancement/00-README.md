# Frontend UI Enhancement — Master Plan

> **Mục tiêu**: Nâng cấp toàn bộ UI Tracking_Frontend lên chuẩn production-ready, dựa trên IVM26 reference project.
> **Reference**: `E:\anmh1205\ivm26\IVM26_Frontend\frontend_v2\src\`
> **Strategy**: INCREMENTAL — giữ code hiện tại, nâng cấp từng module, không xóa toàn bộ.

---

## ⚠️ AGENT RULES (ĐỌC TRƯỚC KHI CODE)

```
1. shadcn/ui ONLY — KHÔNG hand-roll Dropdown, Modal, Pagination, Table, Skeleton
2. recharts CHO BIỂU ĐỒ — KHÔNG ECharts, KHÔNG Chart.js
3. lucide-react CHO ICONS — KHÔNG @tabler/icons-react
4. React Hook Form + Zod CHO FORMS
5. TanStack Query CHO DATA FETCHING
6. Zustand CHO CLIENT STATE (memory-only, KHÔNG localStorage)
7. Socket.IO CHO REALTIME (KHÔNG mqtt.js)
8. nuqs CHO URL STATE (search, filters, pagination, tabs)
9. @geoman-io/leaflet-geoman-free CHO GEOFENCE EDITOR
10. ZERO PLACEHOLDER — KHÔNG "Coming Soon", "TODO", "future update"
11. THAM KHẢO IVM26 — copy pattern, KHÔNG copy-paste code. Adapt cho tracking domain
12. MOBILE RESPONSIVE — tất cả components PHẢI responsive
```

---

## 📋 Enhancement Phases

| Phase    | File                                                     | Mô tả                                               | Ước lượng | Deps       |
| -------- | -------------------------------------------------------- | --------------------------------------------------- | --------- | ---------- |
| **EH-0** | [EH-0-shared-infra.md](./EH-0-shared-infra.md)           | Shared hooks, utils, types                          | 1 ngày    | —          |
| **EH-1** | [EH-1-device-ui.md](./EH-1-device-ui.md)                 | Device Detail Modal + Device List rewrite           | 2-3 ngày  | EH-0       |
| **EH-2** | [EH-2-map-tracking.md](./EH-2-map-tracking.md)           | Map & Tracking overhaul                             | 2-3 ngày  | EH-0, EH-1 |
| **EH-3** | [EH-3-dashboard.md](./EH-3-dashboard.md)                 | Dashboard/Overview rewrite                          | 1-2 ngày  | EH-0       |
| **EH-4** | [EH-4-system-admin.md](./EH-4-system-admin.md)           | System Admin & Observability                        | 3-4 ngày  | EH-0, EH-3 |
| **EH-5** | [EH-5-remaining-modules.md](./EH-5-remaining-modules.md) | System Status, Notifications, Simulator, Statistics | 2-3 ngày  | EH-0       |

---

## 🔄 Thứ tự thực hiện

```
EH-0 (Shared Infra)
   ├──→ EH-1 (Device UI) ──→ EH-2 (Map)
   ├──→ EH-3 (Dashboard) ──→ EH-4 (System Admin)
   └──→ EH-5 (Remaining Modules)
```

- EH-0 LÀM TRƯỚC — tạo nền tảng hooks/utils
- EH-1 + EH-3 có thể chạy SONG SONG sau EH-0
- EH-2 phụ thuộc EH-1 (device components dùng chung)
- EH-4 phụ thuộc EH-3 (dashboard components dùng chung)
- EH-5 độc lập, chạy song song bất kỳ lúc nào sau EH-0

---

## 📊 Tổng kết scope

| Metric         | Giá trị          |
| -------------- | ---------------- |
| Tổng files mới | ~80+             |
| Tổng files sửa | ~20+             |
| Tổng tasks     | ~100             |
| Thời gian      | 12-16 ngày agent |

---

## 🔗 Liên kết với coding-plan gốc

Plan này **bổ sung** cho `resources/plans/cloud/` (Phase 4 + Phase 5):
- Các lỗi trong plan gốc đã được fix trực tiếp trong cloud plan files
- Plan enhance này chứa **chi tiết implementation** mà plan gốc không có
- Khi gen lại coding-plan, các fix đã nằm sẵn trong file gốc
