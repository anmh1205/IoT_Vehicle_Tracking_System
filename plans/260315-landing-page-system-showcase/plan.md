# Landing Page System Showcase Plan

**Date:** 2026-03-15
**Branch:** feature/system-coding
**Status:** Planning

## Context

- `iot-vehicle-tracking-system/Tracking_Frontend/src/app/page.tsx` đang redirect thẳng `/` sang `/dashboard`.
- Hệ thống đã có nhiều năng lực thật để đưa lên landing page: bản đồ realtime, cảnh báo, chuyến đi, geofence, nhiên liệu, bảo trì, xuất dữ liệu, firmware, trạng thái hệ thống, mobile shell.
- UI hiện tại mạnh về dashboard vận hành, nhưng thiếu lớp public-facing để giới thiệu sản phẩm.
- Yêu cầu có ảnh minh hoạ, nhưng phần tăng trust nên ưu tiên screenshot thật từ dashboard, không dùng art AI thay toàn bộ.

## Goals

- Tạo landing page public ở route `/`.
- Giữ nguyên hành vi `/login` và `/dashboard/*`.
- Định vị sản phẩm cho đội vận hành xe, logistics, doanh nghiệp quản lý đội xe nội bộ.
- Kết hợp screenshot thật + ảnh minh hoạ generate + motion nhẹ.
- Bám chuẩn hiện tại: responsive, semantic, keyboard-friendly, dễ maintain.

## Non-goals

- Không làm lại dashboard authenticated.
- Không thêm CMS, form funnel phức tạp, analytics stack mới.
- Không bịa testimonial, logo khách hàng, KPI chưa có số liệu thật.
- Không kéo thêm animation library nặng nếu CSS đủ.

## Default Audience

- Quản lý đội xe
- Điều phối vận hành
- Đơn vị logistics
- Doanh nghiệp có xe công tác/giao nhận

## Proposed Experience

| Section | Mục tiêu | Nội dung chính | Nguồn proof |
|--------|-----------|----------------|-------------|
| Hero | Chốt giá trị trong 5 giây | Theo dõi xe realtime, cảnh báo tức thời, quản trị tập trung | 1 AI hero visual + CTA |
| Outcome strip | Nói rõ lợi ích vận hành | Giảm mù vị trí, phản ứng nhanh, quản lý nhiên liệu/bảo trì | Copy ngắn, icon |
| Feature grid | Cho thấy breadth của hệ thống | Bản đồ, cảnh báo, geofence, chuyến đi, nhiên liệu, firmware, export | Mix icon + UI snippets |
| Product proof | Tăng trust | Screenshot dashboard map, tổng quan, system status | Screenshot thật |
| System flow | Giải thích kiến trúc | Thiết bị IoT -> MQTT/EMQX -> Backend -> Dashboard/Mobile -> Observability | SVG/diagram tự dựng |
| Mobile/alerts | Nhấn mạnh giám sát di động | Nhận cảnh báo, kiểm tra trạng thái nhanh trên mobile | 1 AI mobile visual hoặc screenshot thật |
| Final CTA | Chốt hành động | Đăng nhập, xem tính năng, liên hệ demo nếu cần | CTA rõ ràng |

## Visual Direction

- Tone: command center hiện đại, industrial, tin cậy hơn là flashy.
- Palette đề xuất: graphite, slate, teal, amber, off-white. Tránh tím.
- Typography đề xuất: `Archivo`/`Archivo Expanded` cho heading, `IBM Plex Sans` cho body.
- Background: grid mờ, topographic lines, radar glow, route lines.
- Motion: section reveal, pulse trên route/map nodes, hover tinh gọn.
- Layout: hero đậm, xen kẽ dark/light section để tránh một khối nặng.

## Asset Strategy

- 2 screenshot thật từ dashboard:
  - `/dashboard/map`
  - `/dashboard` hoặc `/dashboard/system-status`
- 3 ảnh AI generate:
  - hero command center
  - mobile alerts / geofence handoff
  - hardware device cutaway hoặc telemetry edge visual
- 1 sơ đồ SVG architecture, không generate bằng AI để giữ rõ nghĩa.
- Brief prompt chi tiết: `reports/landing-page-image-brief.md`

## Copy Direction

- Ngôn ngữ chính: tiếng Việt.
- Giọng điệu: B2B, rõ, ngắn, thực dụng.
- Tránh claim mơ hồ như "AI tối ưu toàn diện", "chuyển đổi số đột phá".
- Mọi bullet phải map về tính năng đang có trong codebase.

## Phases Overview

| Phase | Focus | Priority | File |
|------|-------|----------|------|
| 1 | Positioning, sitemap, copy skeleton | Cao | [phase-01-positioning-and-content](./phase-01-positioning-and-content.md) |
| 2 | Visual system, screenshots, AI image generation | Cao | [phase-02-visual-system-and-assets](./phase-02-visual-system-and-assets.md) |
| 3 | Frontend build at `/` | Cao | [phase-03-frontend-implementation](./phase-03-frontend-implementation.md) |
| 4 | QA, SEO, perf, docs sync | Trung bình | [phase-04-qa-seo-launch](./phase-04-qa-seo-launch.md) |

## Suggested File Targets

- `iot-vehicle-tracking-system/Tracking_Frontend/src/app/page.tsx`
- `iot-vehicle-tracking-system/Tracking_Frontend/src/app/layout.tsx`
- `iot-vehicle-tracking-system/Tracking_Frontend/src/app/globals.css`
- `iot-vehicle-tracking-system/Tracking_Frontend/src/app/theme.css`
- `iot-vehicle-tracking-system/Tracking_Frontend/src/features/marketing/*`
- `iot-vehicle-tracking-system/Tracking_Frontend/public/landing/*`
- `docs/project-overview-pdr.md`
- `docs/codebase-summary.md`
- `docs/system-architecture.md`
- `docs/development-roadmap.md`

## Implementation Notes

- `page.tsx` không còn redirect; đổi sang server component render landing page.
- Tách section thành component nhỏ dưới `src/features/marketing/`, mỗi file < 200 dòng.
- CTA chính mặc định: `/login`.
- CTA phụ mặc định: anchor xuống section tính năng hoặc proof.
- Reuse token/theme hiện có khi hợp lý; thêm token riêng cho marketing nếu cần, không phá dashboard.
- Nếu screenshot thật cần login, chụp bằng account seed nội bộ; nếu chưa có, dùng placeholder frame ở vòng đầu rồi thay bằng capture thật trước khi chốt.

## Risks

- Đổi root route có thể làm người dùng quen vào `/` thấy thay đổi flow.
- Lạm dụng ảnh AI làm giảm độ tin cậy.
- Hero quá nặng ảnh có thể kéo LCP xấu.
- Copy lan man vì hệ thống có nhiều module.

## Mitigations

- Giữ CTA `Đăng nhập` nổi bật ngay hero/header.
- Dùng screenshot thật cho section proof, AI chỉ làm atmosphere/support.
- Convert asset sang WebP/AVIF, lazy-load dưới fold.
- Giới hạn landing page còn 6-7 section, không nhồi full module list.

## Success Criteria

- `/` hiển thị landing page public, không redirect.
- `/login` và `/dashboard/*` không regression.
- Nội dung phản ánh đúng tính năng đang có trong repo.
- Mobile/desktop đều đọc tốt, keyboard reach tốt, alt text đầy đủ.
- Hero asset tối ưu, không làm page cảm giác nặng.
- Có ít nhất 2 screenshot thật + 2-3 ảnh minh hoạ generate đã thống nhất style.

## Estimated Effort

- Planning/copy: 0.5 ngày
- Asset pipeline: 0.5-1 ngày
- Frontend build: 1-1.5 ngày
- QA/docs polish: 0.5 ngày
- Tổng: 2.5-3.5 ngày làm việc

## Unresolved Questions

- Có thêm CTA `Yêu cầu demo`/`Liên hệ` không, hay chỉ giữ `Đăng nhập`?
- Có sẵn tài khoản seed để chụp screenshot thật chưa?
- Hero ưu tiên dark-first hoàn toàn, hay dark hero + light body sections?
