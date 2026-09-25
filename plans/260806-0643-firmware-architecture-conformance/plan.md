---
title: "Firmware Architecture Conformance — đưa ESP32-S3 về chuẩn vault build-from-scratch"
description: "DI thuần qua ports, sửa P0 race + logic bug, chuẩn hoá GNSS, tách god function, naming — giữ build pass."
status: pending
priority: P0
effort: 72h (9 phase, tổng ước lượng)
branch: main
tags: [firmware, esp32-s3, architecture, di, ports, gnss, refactor, audit]
created: 2026-08-06
---

# Firmware Architecture Conformance Plan

**Mục tiêu:** Đưa firmware về chuẩn vault build-from-scratch: app-core + domain gọi qua `const tracker_runtime_ports_t *` (tham số hàm, không global/setter), domain data-only (trừ `domain-connectivity` ngoại lệ), bỏ include adapter khỏi app-core. Xử lý P0 (race, logic bug) TRƯỚC refactor.
**Ràng buộc:** Build hiện PASS. Mỗi phase phải giữ build pass + hành vi tương đương trừ khi cố ý đổi (GNSS satellites, label).
**Không làm:** Git secret purge (user quyết), không ép mọi file <200 dòng (chỉ tách hàm >150), không thêm phức tạp (YAGNI-KISS-DRY).

## Nguồn & quyết định đã chốt

- Chuẩn DI: `research/researcher-01-vault-di-ports-standard.md` (vault MÂU THUẪN 6/8 port → phase 06 chốt độc lập, không copy mù).
- Chuẩn GNSS: `research/researcher-02-sim7600-gnss-at-standard.md` (CGPS/CGPSINFO; CGNSINF = họ SIM800/7000 đã chết).
- Vi phạm dependency + quy mô: `scout/scout-01-dependency-di-map.md` (121 call-site, ~35 field port thiếu).
- Bugs/quality/config: `scout/scout-02-bugs-quality-config.md` (ĐÃ CÓ — hoàn thành sau khi plan khởi tạo; tích hợp N1/E2/B/N3/D2 vào phase 01/02/08).
- Plan cũ `plans/260722-fix-cleanup-mess-audit/` KHÔNG dùng; phần chưa làm gộp vào đây.
- Report tổng: `plans/reports/audit-260806-0643-firmware-vs-vault-standard.md`.

## Bảng phase

| # | Phase | Ước lượng | Phụ thuộc | Status |
|---|---|---|---|---|
| 01 | P0 Thread safety: queue hoá OBD callback ↔ FSM + UAF ble_obd_ctx (E2) | 4h | — | pending |
| 02 | P0 Logic bug: timestamp fake-fresh + N1 deadlock GNSS_LOCK + B leak satellites + GNSS verify (gated) | 5h | — | pending |
| 03 | P1 Move `telemetry_counters` → shared-kernel | 2h | — | pending |
| 04 | P1 Move HTTP-over-AT domain-ota → adapter-modem | 6h | — | pending |
| 05 | P1 GNSS chuẩn hoá CGPS/CGPSINFO + satellites=0 | 4h | — | pending |
| 06 | P1 Port design: chốt chữ ký, +3 port, move type, siết validate | 8h | — | pending |
| 07 | P1 DI migrate: đảo 121 call-site (6 module) | 24h | 06 | pending |
| 08 | P2 God function: tách 5 hàm >150 dòng + N3 field-level fallback | 12h | 07 | pending |
| 09 | P2 Naming + cleanup | 7h | 07 | pending |
| | **TỔNG** | **72h** | | |

## Thứ tự thực hiện & lý do

```
01 (P0 race) ─┐
02 (P0 logic) ─┤  rủi ro cao trước, phạm vi nhỏ
             ├── 06 (port design) ──> 07 (DI migrate) ──> 08 (god fn) ──> 09 (naming)
03 (move counters) ─┤
04 (move HTTP) ─────┼── độc lập nhau + với 06 → có thể song song trước 07
05 (GNSS) ──────────┘  độc lập hoàn toàn
```

- **01, 02 độc lập** với refactor → làm trước để P0 không chồng lên biến động DI.
- **03, 04, 05 độc lập** với nhau và với 06 → có thể chạy song song (file ownership rõ: telemetry_counters, domain-ota, modem_gnss).
- **06 TRƯỚC 07** (chữ ký port phải chốt trước khi migrate). **07 TRƯỚC 08, 09** (god function tách trên code đã đi qua port; rename đụng CMake + mọi include nên làm cuối).

## Success criteria

- [ ] Build pass toàn repo sau MỖI phase (`idf.py build` trong firmware root).
- [ ] 0 data race OBD callback ↔ FSM (payload qua FreeRTOS queue, FSM là chủ duy nhất của `s_telemetry`); 0 UAF `ble_obd_ctx_t` (E2).
- [ ] 0 fake-fresh timestamp khi GNSS không fix; 0 leak `satellites` khi mất fix (B).
- [ ] 0 deadlock GNSS_LOCK (N1 — xoá mutex, 1 task FSM).
- [ ] app-core + domain (trừ domain-connectivity) KHÔNG còn `#include` header adapter; CMake REQUIRES tương ứng gỡ sạch.
- [ ] Registry đủ 8+3 port, `static const`, validate fail-fast 100% field; truyền qua tham số hàm.
- [ ] GNSS chỉ dùng CGPS/CGPSINFO; `satellites=0` khi không fix; label `"cgpsinfo"` đồng bộ server.
- [ ] 5 hàm >150 dòng được tách (kèm N3 field-level fallback); 4 file kebab-case đổi snake_case; 0 include chết.
- [ ] Hành vi tương đương (trừ các thay đổi cố ý ở trên).

## Rủi ro chính

1. **DI migrate (07)** đụng 6 file app-core, 121 call-site — rủi ro cao nhất. Giảm bằng: làm từ module ít call-site (publish 5) → nhiều (wake_prelude 46), mỗi bước con build + verify.
2. **Move type persist (06)** trước port hoá config_store — nếu đảo thứ tự, port phụ thuộc adapter header (cấm).
3. **GNSS (05)** thay đổi hành vi có chủ đích — rollback: giữ nguyên cũ nếu server chưa sẵn sàng nhận `satellites=0`/label mới. Verify server trước khi merge.
4. **Move HTTP-over-AT (04)** đổi ranh giới component — nếu bỏ sót chuỗi AT trong domain-ota, cần grep `AT+` toàn domain-ota để không sót.
