---
title: "UAT CI/CD end-to-end activation plan"
description: "Activate and validate end-to-end UAT pipelines from GitHub Actions to VPS with strict gates and rollback."
status: in-progress
priority: P2
effort: "3d"
branch: feature/cicd
tags: [cicd, uat, github-actions, vps]
created: 2026-04-07
---

# UAT CI/CD End-to-End Activation

## Scope
- Mục tiêu: bật vận hành E2E UAT CI/CD an toàn, ít gián đoạn cho `main`.
- Đã harden workflow UAT cho backend/postgresql/emqx/grafana/mobile và cập nhật deploy gate script; còn chờ pilot/verify trên VPS.
- Không triển khai code tính năng mới; chỉ rollout, verify, gate, rollback runbook.

## Phase roadmap

| Phase | Status | Progress | Output |
|---|---|---:|---|
| [Phase 01 - Branch and workflow activation](./phase-01-branch-and-workflow-activation.md) | pending | 0% | Chuẩn hóa nhánh `uat`, visibility workflow, guardrails tối thiểu |
| [Phase 02 - GitHub Actions validation and sequenced rollout](./phase-02-github-actions-validation-and-sequenced-rollout.md) | in-progress | 85% | Rollout tuần tự workflow + gate run-level |
| [Phase 03 - VPS deploy verification and observability gates](./phase-03-vps-deploy-verification-and-observability-gates.md) | in-progress | 75% | Verify theo service, pass/fail rõ ràng, Go/No-Go |
| [Phase 04 - Rollback drill and Go/No-Go](./phase-04-rollback-drill-and-go-no-go.md) | pending | 0% | Drill rollback image/config + quyết định release |

## Service rollout order (fixed)
1. `postgresql`
2. `emqx`
3. `backend`
4. `mqtt-bridge`
5. `frontend`
6. `grafana`

Mobile build/release: chạy độc lập, không chặn gate runtime chain trên.

## Branch strategy (minimal disruption)
- `main`: giữ vai trò default + review + source of truth.
- `uat`: branch deploy runtime; chỉ nhận thay đổi đã duyệt từ `main` qua PR/cherry-pick có kiểm soát.
- Bảo vệ `uat`: required checks + cấm force push + chỉ deploy workflow cho `uat`.

## Dependencies
- GitHub secrets deploy đã có.
- VPS đã có Traefik + Uptime Kuma; app stack chưa chạy (phù hợp rollout từ đầu).
- Workflows `*-uat.yml` đã tồn tại local, cần xuất hiện trên default branch (`main`) để GitHub nhận diện đầy đủ.

## Exit criteria
- Workflow UAT critical hiển thị và chạy được bằng `gh`.
- Mỗi service đạt pass criteria trong 1 chu kỳ deploy hoàn chỉnh.
- Rollback drill pass 1 lần, MTTR nằm trong ngưỡng team chấp nhận.

## Validation Log

### Session 1 — 2026-04-07
**Trigger:** Initial plan validation trước khi triển khai.
**Questions asked:** 4

#### Questions & Answers

1. **[Risk]** Khi workflow UAT fail liên tiếp, ngưỡng nào sẽ tự freeze deploy lane?
   - Options: A) 3 lần (Recommended) | B) 2 lần | C) Không auto-freeze
   - **Answer:** 3 lần (Recommended)
   - **Rationale:** Tránh freeze quá nhạy do nhiễu tạm thời nhưng vẫn đủ chặt để chặn lỗi lặp phát tán.

2. **[Architecture]** Health endpoint chuẩn để gate backend trên VPS là gì?
   - Options: A) /health (Recommended) | B) /api/health | C) Bắt buộc cả hai
   - **Answer:** /health (Recommended)
   - **Rationale:** Đồng bộ với workflow backend hiện tại, giảm ambiguity trong gate runtime.

3. **[Architecture/Risk]** Gate readiness cho EMQX nên theo cách nào?
   - Options: A) HTTP health + auth (Recommended) | B) Docker running only | C) MQTT connect test
   - **Answer:** HTTP health + auth (Recommended)
   - **Rationale:** Running-state không đủ chứng minh sẵn sàng; cần check endpoint quản trị có auth.

4. **[Tradeoff]** Pin release cho rollback UAT nên dùng chuẩn nào?
   - Options: A) Immutable digest (Recommended) | B) Tag uat | C) Hybrid digest+tag
   - **Answer:** Immutable digest (Recommended)
   - **Rationale:** Loại bỏ drift của mutable tag, rollback deterministic hơn.

#### Confirmed Decisions
- Freeze threshold: 3 failures liên tiếp — cân bằng ổn định và an toàn vận hành.
- Backend health gate: `/health` — một chuẩn duy nhất cho runtime check.
- EMQX readiness: HTTP health + auth — tránh false pass.
- Release pinning: immutable digest — rollback chính xác.

#### Action Items
- [x] Cập nhật policy freeze threshold trong phase 02.
- [x] Chuẩn hóa backend health gate `/health` và EMQX gate có auth trong phase 03.
- [x] Chốt immutable digest strategy trong phase 04.

#### Impact on Phases
- Phase 02: chốt auto-freeze khi fail liên tiếp = 3.
- Phase 03: backend dùng `/health`; EMQX gate bắt buộc HTTP health + auth.
- Phase 04: rollback chuẩn theo immutable digest, không dùng mutable tag làm chuẩn chính.
