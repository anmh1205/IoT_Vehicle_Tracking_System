---
title: "Hardware power/pinout re-baseline plan"
description: "Re-baseline schematic, docs, and firmware around SIM7600CE-T + LIS3DH + 18650 1S with strict validation gates."
status: in_progress
priority: P1
effort: 11h
branch: feature/system-coding
tags: [hardware, firmware, schematic, sim7600, lis3dh, power]
created: 2026-03-06
---

# Implementation Plan Overview

## Scope lock
- Keep execution order exactly 7 phases (user-provided order).
- Runtime modem target: **SIM7600CE-T** only.
- IMU lock: **LIS3DH**.
- Backup battery lock: **18650 1S**.
- Prioritize new schematic assets in `resources/reports/thesis-chapters/assets/schematic/`.

## Baseline mismatches to close
- Modem UART/PWRKEY mismatch between docs and firmware pin map.
- Legacy battery docs still mention `21700`/`2S`.
- LVD semantic conflict (`GPIO level meaning` vs table/logic text).

## Phase map
| Phase | Goal | Effort | File |
|---|---|---:|---|
| 01 | Freeze component manifest + schematic baseline | 1.5h | [phase-01](./phase-01-freeze-component-manifest-and-schematic-baseline.md) |
| 02 | Catalog datasheets + source-of-truth links | 1.5h | [phase-02](./phase-02-catalog-datasheets-and-source-of-truth.md) |
| 03 | Verify pinout + power interfaces | 2h | [phase-03](./phase-03-verify-pinout-and-power-interface-consistency.md) |
| 04 | Update hardware/firmware reports baseline | 2h | [phase-04](./phase-04-update-hardware-and-firmware-documentation-baseline.md) |
| 05 | Patch firmware for proven mismatches | 2h | [phase-05](./phase-05-patch-firmware-for-proven-modem-and-lvd-mismatches.md) |
| 06 | Add final pinout connection matrix | 1h | [phase-06](./phase-06-create-final-pinout-connection-matrix-and-signoff.md) |
| 07 | Build + consistency checks + review close | 1h | [phase-07](./phase-07-run-build-consistency-review-and-final-baseline-lock.md) |

## Dependencies
- P01 blocks P02-P07.
- P02 blocks P03-P06 (citation-first).
- P03 blocks P04-P05.
- P04 + P05 block P06.
- P06 blocks P07.

## Validation gates
- **G1 Manifest Gate:** component list fixed to SIM7600CE-T + LIS3DH + 18650 1S.
- **G2 Datasheet Gate:** every critical parameter has authoritative citation path.
- **G3 Interface Gate:** modem UART/PWRKEY/LVD semantics consistent across schematic+docs+firmware.
- **G4 Docs Gate:** no active section contains 21700/2S baseline unless marked historical.
- **G5 Firmware Gate:** compile passes and no pin macro contradiction.
- **G6 Matrix Gate:** single final pinout matrix accepted.
- **G7 Close Gate:** reviewer sign-off + changelog note complete.

## Acceptance
- One coherent baseline across schematic assets, report docs, and firmware pins/logic.
- No unresolved critical mismatch remains.
