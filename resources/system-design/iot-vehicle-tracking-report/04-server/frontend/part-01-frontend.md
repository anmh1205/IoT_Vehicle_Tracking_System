## PHẦN XII: THIẾT KẾ FRONTEND (GIAO DIỆN NGƯỜI DÙNG)

**Chi tiết thiết kế và implementation plan:** [`part-02-frontend-design/README.md`](./part-02-frontend-design/README.md)

---

### XII.1 Tổng Quan

Frontend là giao diện web/mobile để người dùng tương tác với hệ thống tracking, xem vị trí xe, nhận cảnh báo, và quản lý phương tiện.

**Tech Stack:** Next.js 16+ (App Router) + React 19 + TypeScript + Tailwind CSS v4

**UI Framework:** shadcn/ui (Radix UI + Tailwind CSS)

**Inspiration:** Dựa trên cấu trúc và design patterns từ `Example/frontend_v2`

---

### XII.2 Các Chức Năng Chính

1. **Dashboard**: Hiển thị tổng quan về tất cả phương tiện
2. **Theo dõi real-time**: Xem vị trí xe trên bản đồ (WebSocket)
3. **Quản lý phương tiện**: Thêm, sửa, xóa thông tin xe
4. **Quản lý khách hàng**: CRUD customers, verification
5. **Quản lý chuyến đi**: Xem trips, route visualization
6. **Cảnh báo**: Xem và xử lý các cảnh báo (chuyển động bất thường, pin yếu, v.v.)
7. **Vi phạm**: Quản lý violations (speeding, etc.)
8. **Thiết bị**: Quản lý devices, configuration
9. **Vùng địa lý**: Quản lý geofences
10. **Bảo trì**: Quản lý maintenance records
11. **Thông báo**: Cấu hình Telegram + Email notifications
12. **[Phase 2] Đặt xe**: Booking management

---

### XII.3 Công Nghệ

- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI)
- **State Management**: Zustand (client), TanStack Query (server)
- **Forms**: React Hook Form + Zod
- **Bản đồ**: Leaflet + React Leaflet
- **Charts**: Recharts, Chart.js
- **Real-time**: Socket.io Client
- **Icons**: Lucide React, Tabler Icons

---

### XII.4 Kiến Trúc

```
Frontend (Next.js)
    ├─ HTTP/REST API ──→ Backend API Server (NestJS)
    │                           ↓
    │                    PostgreSQL + InfluxDB
    │                           ↓
    └─ WebSocket ──→ Backend API Server ──→ EMQX MQTT Broker
                                                    ↓
                                            IoT Trackers
```

---

### XII.5 Theme & Design

**Color Scheme:**
- Light/Dark theme support
- CSS Variables (oklch color space)
- Status colors (active, inactive, maintenance, etc.)
- Chart colors

**UI Patterns:**
- Sidebar navigation (collapsible)
- Header với breadcrumbs
- Data tables với sorting/filtering
- Cards với statistics
- Real-time map với markers
- Forms với validation
- Toast notifications

**Responsive:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

### XII.6 Chi Tiết Thiết Kế

Xem folder [`part-02-frontend-design/`](./part-02-frontend-design/) để biết:
- Cấu trúc thư mục chi tiết
- Tech stack đầy đủ
- Theme & màu sắc
- UI/UX patterns
- Navigation structure
- Key pages & features
- API integration
- Realtime integration
- Implementation phases

