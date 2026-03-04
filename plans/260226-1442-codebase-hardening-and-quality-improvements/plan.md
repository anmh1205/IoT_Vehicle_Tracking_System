---
title: "Codebase hardening and quality improvements"
description: "Kế hoạch 5 pha để xử lý lỗ hổng bảo mật, ổn định realtime và nâng chất lượng maintainability toàn stack."
status: completed
priority: P1
effort: 13d
branch: feature/coding
tags: [security, reliability, auth, mqtt, infra, quality]
created: 2026-02-26
---

# Plan overview

Mục tiêu: xử lý findings đã có, không mở rộng scope, ưu tiên risk cao trước (YAGNI/KISS/DRY).

## Phases & progress

| Phase | File | Focus | Status | Effort |
|---|---|---|---|---|
| 01 | [Critical security fixes](./phase-01-critical-security-fixes.md) | AuthZ backend, password flow, metrics exposure | completed | 3d |
| 02 | [Auth and session hardening](./phase-02-auth-and-session-hardening.md) | Frontend token boundary, refresh flow, redirect safety, RBAC page guard | completed | 3d |
| 03 | [Realtime and MQTT reliability](./phase-03-realtime-and-mqtt-reliability.md) | MQTT listener shutdown/TLS, bridge auth parity, event-path reliability | completed | 3d |
| 04 | [Mobile and infra config hardening](./phase-04-mobile-and-infra-config-hardening.md) | Flutter defaults, notification service duplication, EMQX/docker hygiene | completed | 2d |
| 05 | [Type safety and maintainability](./phase-05-type-safety-and-maintainability.md) | `any` hotspots, image policy, guardrails, consistency | completed | 2d |

## Dependency order

- Phase 01 blocks 02/03/04/05 for policy baselines.
- Phase 02 and 03 can run song song after 01.
- Phase 04 can run after 01.
- Phase 05 runs last để chuẩn hóa toàn cục sau hardening.

## Delivery checkpoints

1. Security hotfix checklist signed off (backend + bridge + infra).
2. Auth/session behavior stable across SSR/CSR/mobile.
3. Realtime pipeline resilient under reconnect/shutdown.
4. Build/test/lint + smoke pass, docs cập nhật theo change.

## Non-goals

- Không redesign kiến trúc lớn.
- Không thêm feature business mới.
- Không thay protocol/device payload spec nếu chưa bắt buộc.

## Unresolved questions

- Có yêu cầu downtime-free rollout cho EMQX credential/TLS rotate không?
- Có policy bắt buộc cho password reset (email OTP/link) trong sprint này không?