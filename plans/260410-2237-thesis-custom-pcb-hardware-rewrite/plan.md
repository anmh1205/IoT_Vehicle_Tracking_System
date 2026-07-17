# Plan: Thesis custom-PCB hardware rewrite

## Mục tiêu
Sửa toàn bộ phần thesis mô tả phần cứng theo đúng thực tế: **bo mạch PCB tự thiết kế/tự tích hợp**, không diễn giải thành dạng “mua module rời rồi ghép”.

## Phạm vi file chính
- Thesis cần sửa: `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`
- Nguồn sự thật hardware:
  - `iot-vehicle-tracking-system-hardware/iot-vehicle-tracking-system-main.PrjPcb`
  - `iot-vehicle-tracking-system-hardware/Main-Schematic.SchDoc`
  - `iot-vehicle-tracking-system-hardware/Power.SchDoc`
  - `iot-vehicle-tracking-system-hardware/ESP32S3.SchDoc`
  - `iot-vehicle-tracking-system-hardware/SIM7600CE.SchDoc`
  - `iot-vehicle-tracking-system-hardware/LIS3DH.SchDoc`
  - `iot-vehicle-tracking-system-hardware/Main.PcbDoc`
  - `iot-vehicle-tracking-system-hardware/Documents/hardware-specs/iot-vehicle-tracking-system-main-netlist.NET`
  - `iot-vehicle-tracking-system-hardware/Documents/hardware-specs/index/hardware-specs-index.md`

## Nguyên tắc thực thi
1. Hardware-first truth: mọi claim trong thesis phải truy vết được về schematic/netlist/BOM.
2. Tách nghĩa “module”: module phần mềm vs khối chức năng phần cứng.
3. Không bịa thông số: số nào không có nguồn A-level thì ghi rõ giới hạn.
4. Đồng bộ text ↔ hình ↔ bảng ↔ BOM.

## Pha triển khai
- [Phase 01](./phase-01-hardware-baseline-and-evidence-matrix.md): Chốt baseline phần cứng + ma trận bằng chứng.
- [Phase 02](./phase-02-thesis-hardware-scope-mapping-and-error-catalog.md): Rà soát thesis, lập catalog lỗi và ưu tiên sửa.
- [Phase 03](./phase-03-rewrite-core-hardware-architecture-sections.md): Viết lại các phần kiến trúc/khối phần cứng trọng yếu.
- [Phase 04](./phase-04-rewrite-implementation-bom-and-test-related-hardware-sections.md): Viết lại phần triển khai chi tiết, BOM, kiểm thử liên quan hardware.
- [Phase 05](./phase-05-consistency-citation-and-final-validation.md): Soát nhất quán cuối, đối chiếu chứng cứ, khóa bản thảo.

## Deliverables
- Bản `*.tex` đã sửa toàn bộ các đoạn hardware sai hướng “module mua sẵn”.
- Bảng mapping “đoạn đã sửa ↔ nguồn chứng cứ hardware”.
- Danh sách claim còn thiếu bằng chứng (nếu có).

## Tiêu chí hoàn thành
- Không còn câu nào khiến người đọc hiểu nhầm là hệ thống ghép từ dev module rời (trừ OBD2 adapter là thiết bị ngoại vi chủ đích).
- Mọi thành phần chính (MCU, modem, IMU, power rails, RTC/flash, antenna, USIM) phản ánh đúng sơ đồ Altium/netlist.
- Caption hình và bảng BOM khớp với phần mô tả kỹ thuật.

## Rủi ro chính + giảm thiểu
- Trùng từ “module” giữa software/hardware → thêm quy ước thuật ngữ ngay đầu chương phần cứng.
- Mâu thuẫn giữa hình cũ và text mới → chạy checklist text-figure-table trước khi chốt.
- Claim hiệu năng không đủ bằng chứng đo đạc → hạ về mô tả thực nghiệm đã có hoặc ghi giới hạn rõ ràng.

## Câu hỏi mở
- Có cần đổi thống nhất thuật ngữ sang “khối phần cứng/khối chức năng” trên toàn bộ thesis (không chỉ chương 3-4) hay giữ nguyên ở phần software?
