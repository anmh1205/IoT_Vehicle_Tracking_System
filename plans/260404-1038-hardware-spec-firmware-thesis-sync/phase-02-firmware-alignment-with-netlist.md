# Phase 02 — Firmware alignment with netlist

## Context links
- Baseline gate: `./phase-01-hardware-baseline-and-gap-freeze.md`
- Scout targets: `./scout/scout-01-firmware-thesis-target-files.md`
- Research references: `./research/researcher-01-pcb-pdf-analysis.md`, `./research/researcher-02-netlist-analysis.md`

## Overview
- Priority: P1
- Status: pending
- Description: Lập kế hoạch cập nhật firmware naming/mapping/sequencing theo netlist đã freeze, không mở rộng feature runtime.

## Key Insights
- `imu_lis3dh.*` có nguy cơ lệch model thực tế `LIS3DSH`.
- Modem control có nhiều line nhưng pin-map API hiện chưa mô hình hóa rõ.
- Phần rủi ro lớn nhất là pulse/polarity cho `PWR-KEY` và `RESET`.

## Requirements
<!-- Updated: Validation Session 1 - full IMU migration + full control lines -->
- Functional:
  - Cập nhật pin-map và naming để phản ánh hardware freeze với modem canonical `SIM7600CE-T`.
  - Migrate đầy đủ IMU runtime path sang `LIS3DSH` (naming + register handling + references liên quan).
  - Chuẩn hóa init sequence modem theo rail + control timing assumptions đã xác nhận.
  - Triển khai đầy đủ modem control lines trong scope phase này (`PWR-KEY`, `RESET`, `SIM-DTR`, `STATUS`, `NET-LIGHT`) theo mapping khả dụng.
- Non-functional:
  - KISS: chỉ sửa mapping/sequence liên quan hardware sync.
  - DRY: gom hằng số timing/modem signal vào nơi trung tâm, tránh lặp.
  - Không đổi API công khai nếu chưa cần.

## Architecture
- Layer tác động:
  - `pin_map.h` làm source-of-truth cho signal mapping.
  - `modem_lte` + `modem_at` dùng pin-map + timing constants.
  - `power_mgr` và `state_machine` chỉ nhận thay đổi tối thiểu để giữ backward compatibility.
- Data flow: boot -> power_mgr -> modem_lte init -> modem_at checks -> state_machine transitions.

## Related code files
- Modify:
  - `iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
  - `iot-vehicle-tracking-system-firmware/main/src/imu_lis3dh.c`
  - `iot-vehicle-tracking-system-firmware/main/inc/imu_lis3dh.h`
  - `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
  - `iot-vehicle-tracking-system-firmware/main/inc/modem_lte.h`
  - `iot-vehicle-tracking-system-firmware/main/src/modem_at.c`
  - `iot-vehicle-tracking-system-firmware/main/inc/modem_at.h`
  - `iot-vehicle-tracking-system-firmware/main/src/power_mgr.c`
  - `iot-vehicle-tracking-system-firmware/main/inc/power_mgr.h`
  - `iot-vehicle-tracking-system-firmware/main/src/state_machine.c`
  - `iot-vehicle-tracking-system-firmware/main/CMakeLists.txt` (nếu cần rename file symbol/include)
- Create: none (trừ khi compile bắt buộc tách module).
- Delete: none.

## Implementation Steps
1. Rà pin-map hiện tại so với baseline freeze, gắn nhãn mismatch.
2. Chốt strategy IMU: rename-only hay register-compatibility patch (theo evidence Phase 01).
3. Chuẩn hóa modem control abstraction cho `PWR-KEY/RESET/DTR/STATUS/NET-LIGHT`.
4. Áp timing constants rõ ràng, tránh magic numbers phân tán.
5. Kiểm tra compile path và include path nếu đổi naming symbol/file.
6. Chuẩn bị test checklist build + smoke (không test fake).

## Todo list
- [ ] Mapping lại pin constants theo baseline.
- [ ] Chốt và ghi rõ quyết định LIS3DH vs LIS3DSH trong code comments.
- [ ] Đồng bộ modem init/power sequence theo assumptions đã xác nhận.
- [ ] Dọn duplicate constants liên quan modem timing.
- [ ] Định nghĩa tiêu chí compile-pass và boot-log-pass.

## Success Criteria
- Không còn mismatch high-confidence giữa firmware mapping và baseline.
- Build firmware pass sau thay đổi mapping/naming.
- Sequence modem documented rõ, không còn magic timing rải rác.
- Không phát sinh feature ngoài phạm vi sync.

## Risk Assessment
- Risk: đổi naming IMU gây vỡ include/ABI nội bộ.
  - Mitigation: dùng transition alias ngắn hạn trong cùng file khi cần, rồi cleanup một lượt.
- Risk: sai polarity/timing modem làm fail attach mạng.
  - Mitigation: thêm checklist verify theo trạng thái `STATUS/NET-LIGHT` và AT response.
- Risk: lan sửa quá nhiều file.
  - Mitigation: giới hạn đúng danh sách file đã chỉ định.

## Security Considerations
- Không thêm endpoint/network flow mới.
- Đảm bảo không log dữ liệu nhạy cảm SIM trong debug output khi chỉnh modem path.

## Next steps
- Hand-off output sang Phase 04 để validate consistency với thesis assets.
- Cập nhật danh sách thay đổi thực tế cho Phase 05 review/changelog gate.
