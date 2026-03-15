# Phase 4: QA SEO Launch

**Priority:** Trung bình
**Status:** Pending
**Estimated effort:** 3-5 giờ

## Scope

Chạy vòng hoàn thiện cuối: QA route, performance, SEO căn bản, docs sync.

## Tasks

- Verify route `/`, `/login`, `/dashboard/*`.
- Chạy `lint`, `typecheck`, `build` cho frontend.
- Check mobile/desktop breakpoints chính.
- Soát keyboard order, landmarks, alt text, contrast.
- Tối ưu hero image nếu LCP chưa ổn.
- Soát metadata:
  - title
  - description
  - OG image basis
- Cập nhật docs nếu implementation chốt:
  - `docs/project-overview-pdr.md`
  - `docs/codebase-summary.md`
  - `docs/system-architecture.md`
  - `docs/development-roadmap.md`

## Acceptance Criteria

- Không có lỗi syntax/type/build.
- Root landing page không làm gãy flow đăng nhập hiện có.
- Asset tải đúng, không broken path.
- Copy, CTA, screenshot, alt text khớp implementation cuối.
- Docs chính được sync nếu scope đã merge.

## Unresolved Questions

- Có cần thêm sitemap/robots cho site public không, hay để phase sau?
