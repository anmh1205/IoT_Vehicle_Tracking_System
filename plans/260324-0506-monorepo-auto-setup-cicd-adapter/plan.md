---
title: "Monorepo auto-setup CI/CD adapter plan"
description: "Thêm lớp adapter root compose cho auto-detect, harden trigger/secret/rollback, không phá workflow UAT hiện tại."
status: pending
priority: P1
effort: 18h
branch: feature/system-coding
tags: [cicd, monorepo, github-actions, docker-compose, rollback]
created: 2026-03-24
---

# Overview
Mục tiêu: tương thích công cụ auto setup CI/CD quét root repo bằng thay đổi nhỏ, rollback dễ, giữ nguyên workflow hiện hữu theo path từng service.

## Phases
| Phase | Status | Progress | File | Dependencies |
|---|---|---:|---|---|
| 01. Baseline + guardrails | pending | 0% | [phase-01-baseline-and-guardrails.md](./phase-01-baseline-and-guardrails.md) | None |
| 02. Root adapter compose | pending | 0% | [phase-02-root-compose-adapter.md](./phase-02-root-compose-adapter.md) | 01 |
| 03. Trigger/secret hardening | pending | 0% | [phase-03-workflow-trigger-secret-hardening.md](./phase-03-workflow-trigger-secret-hardening.md) | 01, 02 |
| 04. Rollback strategy | pending | 0% | [phase-04-rollback-and-release-safety.md](./phase-04-rollback-and-release-safety.md) | 02, 03 |
| 05. Test matrix + acceptance | pending | 0% | [phase-05-test-matrix-and-acceptance.md](./phase-05-test-matrix-and-acceptance.md) | 02, 03, 04 |

## Dependency notes
- Giữ trigger `branches: [uat]` + `paths` hiện tại là hàng rào chính để tránh over-trigger.
- Adapter root phải không tự deploy, không tự build image production.
- Nếu tool auto-generate workflow mới, bắt buộc scope trigger vào file adapter + workflow file, không wildcard toàn repo.

## Definition of done
- Có root `docker-compose.yml` tối thiểu cho auto-detect.
- Không thay đổi hành vi runtime của các stack hiện tại.
- Có hardening cho trigger, secret handling, rollback runbook.
- Có test matrix + tiêu chí nghiệm thu rõ ràng, đo được.
