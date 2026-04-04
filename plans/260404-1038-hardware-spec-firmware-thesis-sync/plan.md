---
title: "Hardware spec firmware thesis sync plan"
description: "Đồng bộ firmware và thesis theo hardware spec mới từ PDF + netlist, rồi tái tạo assets nhất quán."
status: pending
priority: P2
effort: 18h
branch: feature/cicd
tags: [hardware-spec, firmware, thesis, assets, sync]
created: 2026-04-04
---

# Plan Overview

Mục tiêu: chốt baseline phần cứng mới, lập kế hoạch cập nhật firmware, cập nhật thesis markdown, và regenerate assets để nội dung + hình thống nhất.

## Scope
- In scope: `iot-vehicle-tracking-system-firmware`, thesis markdown final draft, pipeline render figure thesis.
- Out of scope: thay đổi BOM/PCB gốc, thêm feature runtime mới ngoài mapping phần cứng đã có.

## Phases
| Phase | File | Status | Progress | Effort | Dependency |
|---|---|---|---:|---:|---|
| 01 Hardware baseline and gap freeze | [phase-01-hardware-baseline-and-gap-freeze.md](./phase-01-hardware-baseline-and-gap-freeze.md) | pending | 0% | 3h | none |
| 02 Firmware alignment with netlist | [phase-02-firmware-alignment-with-netlist.md](./phase-02-firmware-alignment-with-netlist.md) | pending | 0% | 4h | Phase 01 |
| 03 Thesis content and figure source sync | [phase-03-thesis-content-and-figure-source-sync.md](./phase-03-thesis-content-and-figure-source-sync.md) | pending | 0% | 4h | Phase 01 |
| 04 Regenerate assets and consistency validation | [phase-04-regenerate-assets-and-consistency-validation.md](./phase-04-regenerate-assets-and-consistency-validation.md) | pending | 0% | 3h | Phase 02, 03 |
| 05 Review docs and release readiness | [phase-05-review-docs-and-release-readiness.md](./phase-05-review-docs-and-release-readiness.md) | pending | 0% | 4h | Phase 04 |

## Key dependencies
- Inputs cố định: 2 research reports + 1 scout report trong plan dir hiện tại.
- Canonical naming cần chốt trước khi sửa firmware/thesis: `SIM7600E` vs `SIM7600CE(-T)`, `LIS3DSH` vs `LIS3DH compatibility`.
- Figure pipeline phụ thuộc `generate-thesis-report-figures.mjs` và `thesis-mermaid-diagrams.mjs`.

## Delivery checkpoints
- CP1: có bảng gap freeze (hardware ↔ firmware ↔ thesis).
- CP2: kế hoạch chỉnh firmware theo file-level, không over-engineer.
- CP3: kế hoạch chỉnh thesis + nguồn figure theo cùng thuật ngữ.
- CP4: kế hoạch regenerate + validate tất cả asset bị ảnh hưởng.
- CP5: checklist release-readiness + rủi ro còn lại.

## Done criteria
- Có đầy đủ 5 phase docs, mỗi phase có steps, todo, success criteria, risk mitigation.
- Danh sách file cần sửa rõ ràng, không mơ hồ, bám YAGNI/KISS/DRY.
- Có danh sách câu hỏi mở để unblock implementation.

## Validation Log

### Session 1 — 2026-04-04
**Trigger:** Initial validation ngay sau khi tạo `/plan:hard`.
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Tên modem canonical cho đợt sync này là gì?
   - Options: SIM7600E (Recommended) | SIM7600CE-T | SIM7600CE
   - **Answer:** SIM7600CE-T
   - **Rationale:** Tên canonical ảnh hưởng trực tiếp naming trong firmware comment, thesis narrative, caption figure, và tránh drift giữa các miền.

2. **[Assumptions]** Với IMU (netlist: LIS3DSH), bạn muốn chiến lược firmware nào?
   - Options: Compat-first (Recommended) | Migrate full LIS3DSH | Giữ nguyên LIS3DH
   - **Answer:** Migrate full LIS3DSH
   - **Rationale:** Quyết định này đổi phạm vi từ “compatibility note” sang migrate thật ở tầng driver/naming/register để khớp hardware baseline.

3. **[Scope]** Phạm vi cập nhật modem control lines trong firmware nên ở mức nào?
   - Options: Chỉ line đã xác thực (Recommended) | Triển khai full ngay | Chỉ UART + PWRKEY
   - **Answer:** Triển khai full ngay
   - **Rationale:** Mở rộng phạm vi firmware phase: không dừng ở UART/PWRKEY mà bao phủ RESET/DTR/STATUS/NET-LIGHT theo plan.

4. **[Tradeoffs]** Bạn muốn đồng bộ thesis và assets theo cách nào?
   - Options: Draft + mirror + impacted-only (Recommended) | Chỉ draft + impacted-only | Draft + full-regenerate
   - **Answer:** Draft + mirror + impacted-only (Recommended)
   - **Rationale:** Cân bằng rủi ro/chất lượng: giữ draft và bản mirror đồng bộ nhưng chỉ regenerate nhóm hình bị ảnh hưởng để giảm blast radius.

#### Confirmed Decisions
- Canonical modem name: SIM7600CE-T — dùng xuyên suốt firmware/thesis/assets.
- IMU strategy: migrate full LIS3DSH — không giữ naming LIS3DH ở runtime path chính.
- Modem control scope: triển khai full ngay — bao phủ đầy đủ control lines theo mapping.
- Thesis sync mode: draft + mirror + impacted-only — đồng bộ 2 bản markdown, render chọn lọc.

#### Action Items
- [ ] Cập nhật phase files để phản ánh 4 quyết định đã chốt trong validation session này.
- [ ] Giữ danh sách blocker mapping GPIO cụ thể cho control lines nếu còn mơ hồ sau khi implement.

#### Impact on Phases
- Phase 01: khóa canonical modem = `SIM7600CE-T`, loại phương án naming trung gian.
- Phase 02: đổi strategy IMU sang migrate full LIS3DSH; mở scope modem control lines thành full implementation.
- Phase 03: bắt buộc sync cả `...readability-draft.md` và `...hoan-chinh.md`, nhưng chỉ regenerate figure impacted.
- Phase 04: giữ regenerate phạm vi impacted-only, thêm check mirror consistency giữa 2 markdown bản final.
- Phase 05: review gate phải xác nhận đầy đủ 4 quyết định đã được phản ánh trong diff thực tế.
