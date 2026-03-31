---
title: "Landing + Login Split Page"
description: "Kế hoạch thiết kế và triển khai trang /login dạng split: landing trái, form phải, giữ nguyên auth contract."
status: pending
priority: P2
effort: 8h
branch: feature/cicd
tags: [frontend, login, ux, auth]
created: 2026-03-31
---

## Mục tiêu
Thiết kế lại `/login` theo layout 2 cột: panel landing bên trái + form login bên phải, tối ưu UX nhưng không đổi luồng auth API/token/session hiện có.

## Scope guard (YAGNI/KISS/DRY)
- Chỉ làm trong `Tracking_Frontend` và chỉ cho route `/login`.
- Không đổi contract backend (`/auth/login`, `/auth/refresh`, token handling).
- Không mở rộng sang signup/forgot-password/SSO/multi-step auth.
- Ưu tiên sửa file hiện có, tránh tách file mới nếu chưa cần.

## Phases
1. [phase-01-scope-ui-baseline-lock.md](./phase-01-scope-ui-baseline-lock.md) — chốt scope + baseline UI hiện trạng.
2. [phase-02-build-split-layout-shell.md](./phase-02-build-split-layout-shell.md) — dựng shell 2 cột landing/login.
3. [phase-03-integrate-login-form-ux-polish.md](./phase-03-integrate-login-form-ux-polish.md) — đưa form hiện tại vào shell mới, polish responsive/a11y.
4. [phase-04-qa-release-kpi-observability.md](./phase-04-qa-release-kpi-observability.md) — quality gate + đo KPI sau release.

## Dependencies
- P2 blocked by P1, P3 blocked by P2, P4 blocked by P3.
- Phụ thuộc design copy ngắn cho panel trái (headline/subtext/cta text).

## KPI sau release (đo trong 7-14 ngày)
- Login success rate (frontend observed) >= 96%.
- Median time-to-submit (mở `/login` -> bấm submit) giảm >= 15% so baseline.
- Bounce rate tại `/login` giảm >= 10%.
- Error banner rate (network/5xx) không tăng > 2% so baseline.
- CLS/LCP tại `/login` giữ trong ngưỡng: CLS < 0.1, LCP < 2.5s (p75).

## Deliverables
- Plan + phase docs đủ chi tiết để implement ngay.
- Danh sách file tác động rõ ràng, không mơ hồ.
- Checklist done/risk cho từng phase.
