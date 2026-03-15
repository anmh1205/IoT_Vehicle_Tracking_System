# Phase 2: Visual System And Assets

**Priority:** Cao
**Status:** Pending
**Estimated effort:** 4-6 giờ

## Scope

Chốt art direction, chụp screenshot thật, generate ảnh minh hoạ, tối ưu asset cho web.

## Tasks

- Khóa visual direction:
  - graphite/slate base
  - teal + amber accents
  - command-center / telemetry / route-line language
- Chọn font pair cho marketing route, không dùng Inter-only cho phần hero headline.
- Chụp screenshot thật:
  - `/dashboard/map`
  - `/dashboard` hoặc `/dashboard/system-status`
- Generate ảnh AI theo brief:
  - hero command center
  - mobile alert / geofence visual
  - hardware cutaway / telemetry edge visual
- Tối ưu asset:
  - raw source lưu ở `resources/design/landing-page/generated/`
  - web export lưu ở `Tracking_Frontend/public/landing/`
  - format ưu tiên WebP/AVIF

## Constraints

- Không dùng art AI thay screenshot thật.
- Không để ảnh có text render bằng AI.
- Không dùng palette tím hoặc generic SaaS gradient.
- Alt text phải mô tả đúng nội dung, không spam keyword.

## Acceptance Criteria

- Có bộ asset thống nhất style, không mỗi ảnh một hướng.
- Screenshot đủ sắc nét, crop đúng vùng proof.
- Hero asset rõ ở desktop và mobile, không nặng quá mức.
- Tất cả asset có path/output convention rõ.

## Supporting Report

- [landing-page-image-brief](./reports/landing-page-image-brief.md)

## Unresolved Questions

- Cần thêm một ảnh thiên về mobile app thật không, hay 2 screenshot web là đủ?
