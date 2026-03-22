# Phase 3: Frontend Implementation

**Priority:** Cao
**Status:** Pending
**Estimated effort:** 1-1.5 ngày

## Scope

Build landing page ở `/`, giữ nguyên dashboard/login, chia component gọn để maintain.

## Tasks

- Thay `src/app/page.tsx` từ redirect sang render landing page.
- Tạo marketing sections dưới `src/features/marketing/`:
  - header
  - hero
  - outcomes
  - feature grid
  - product proof
  - architecture flow
  - final CTA/footer
- Dùng server component mặc định; chỉ client hóa phần thật sự cần animation/interaction.
- Thêm token/style riêng nếu cần ở `globals.css` hoặc `theme.css`.
- Gắn asset đã tối ưu từ `public/landing/`.
- Thêm metadata page-level: title, description, open graph basis.
- Đảm bảo semantic section, heading order, skip-link flow không vỡ.

## Suggested File Map

- `src/app/page.tsx`
- `src/features/marketing/components/marketing-header.tsx`
- `src/features/marketing/components/marketing-hero.tsx`
- `src/features/marketing/components/marketing-feature-grid.tsx`
- `src/features/marketing/components/marketing-proof.tsx`
- `src/features/marketing/components/marketing-architecture.tsx`
- `src/features/marketing/components/marketing-final-cta.tsx`
- `src/features/marketing/data/landing-content.ts`

## Acceptance Criteria

- Root route render ổn trên mobile/desktop.
- Header luôn có CTA đăng nhập rõ.
- Screenshot và ảnh AI hòa cùng một visual system.
- Không làm ảnh hưởng dashboard route tree hiện có.
- Mỗi file mới giữ nhỏ, focused, dễ đọc.

## Unresolved Questions

- Có cần thêm section FAQ ngắn không, hay giữ landing page gọn?
