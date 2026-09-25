# Phase 05 — P1 GNSS chuẩn hoá CGPS/CGPSINFO + satellites=0

**Status:** pending | **Priority:** P1 | **Effort:** 4h | **Depends:** — (độc lập hoàn toàn; có thể chạy song song 03/04/06)

## Context links

- Audit mục #22, #23, #24: `plans/reports/audit-260806-0643-firmware-vs-vault-standard.md`
- Researcher-02: `research/researcher-02-sim7600-gnss-at-standard.md` (§0 kết luận, §3 field mất, §4 satellites, §6 contract, §9 danh sách xoá)
- Quyết định user #4: bỏ CGNSINF/CGNSPWR (họ SIM800/7000), `satellites`→0, `query_mode` serialize thành string nên xoá enumerator CGNSINF an toàn, đổi label `"cgpsinfo_fallback"` → `"cgpsinfo"` (đồng bộ server).

## Overview

Nhánh GNSS "PRIMARY" hiện dùng `AT+CGNSPWR` + `AT+CGNSINF` — họ lệnh SIM800/SIM868/SIM7000, KHÔNG phải SIM7600. Trên SIM7600, `AT+CGNSPWR=1` trả `ERROR` → code rơi xuống `AT+CGPS=1` + `CGPSINFO` và bật `s_use_cgps_query_only`. **Bỏ CGNSINF gần như không đổi hành vi runtime** — chỉ xoá code chết + 4 lệnh AT thất bại mỗi lần power-on.

`satellites`: trên đường CGPSINFO đang hardcode `1` (`modem_gnss.c:468-472`). Đổi sang `0` (trung thực — không đo được số vệ tinh qua CGPSINFO). Server KHÔNG gate `satellites` → an toàn (kiểm lại trong step verify).

`query_mode` serialize thành STRING (`data_formatter.c:424`) không phải số → xoá enumerator `GNSS_QUERY_MODE_CGNSINF` an toàn về giá trị. Nhưng đổi label `"cgpsinfo_fallback"` → `"cgpsinfo"` để đồng bộ server.

**Đã làm một phần qua diff (giữ):** safe_atof/atoi, GNSS mutex, soft retry 2.

## Key Insights

- **Danh sách xoá cụ thể** (researcher-02 §9):
  - `modem_gnss_send_and_parse()` — dòng 493-585 (đường CGNSINF)
  - `modem_gnss_parse_timestamp()` — dòng 101-152 (chết sau khi bỏ CGNSINF)
  - Static: `s_cgnsinf_fail_streak`, `s_use_cgps_query_only`, `s_cgnsinf_backoff_until_ms`
  - Macro: `MODEM_GNSS_QUERY_PRIMARY_BACKOFF_FAIL_THRESHOLD`, `MODEM_GNSS_QUERY_PRIMARY_BACKOFF_COOLDOWN_MS`
  - `modem_gnss_power_on()`: 4 nhánh CGNSPWR (690-737) → chỉ giữ probe `AT+CGPS?` + `AT+CGPS=1`
  - `modem_gnss_power_off()`: bỏ `AT+CGNSPWR=0` (776), dùng thẳng `AT+CGPS=0`
  - Đổi tên log `gnss_fallback_*` → `gnss_query_*`
- `gnss_data_t` (`shared-kernel/include/gnss_model.h:34-51`) giữ nguyên field `query_mode` — chỉ bỏ 1 enumerator khỏi enum.
- `satellites` là `uint8_t` — đổi gán `1` → `0`.

## Requirements

- **Functional:** GNSS chỉ dùng CGPS/CGPSINFO; `satellites=0` khi không fix; label `"cgpsinfo"`.
- **Non-functional:** Build pass; xoá code chết (CGNSINF) sạch; server đồng bộ label.
- **Contract:** `query_mode` vẫn nằm trong payload diag (data_formatter.c:424) với giá trị `"cgpsinfo"`/`"unknown"`.

## Architecture

Chỉ đơn giản hoá `modem_gnss.c` (bỏ nhánh chết) + sửa label ở `data_formatter.c` + bỏ enumerator ở `gnss_model.h`. Không đổi kiến trúc component.

## Related code files

- **Sửa:** `adapter-modem-sim7600-at/src/modem_gnss.c` (bỏ CGNSINF/CGNSPWR, satellites=0, log rename)
- **Sửa:** `shared-kernel/include/gnss_model.h` (bỏ `GNSS_QUERY_MODE_CGNSINF`)
- **Sửa:** `contracts-device-cloud/src/data_formatter.c` (label `"cgpsinfo_fallback"` → `"cgpsinfo"`, bỏ case CGNSINF)
- **Kiểm:** server gate `satellites` (xác nhận không `>= N`)

## Implementation Steps

1. `modem_gnss.c` — xoá `modem_gnss_send_and_parse()` (493-585) và `modem_gnss_parse_timestamp()` (101-152); mọi call trỏ sang đường CGPSINFO.
2. Xoá static `s_cgnsinf_fail_streak`, `s_use_cgps_query_only`, `s_cgnsinf_backoff_until_ms` + 2 macro backoff.
3. `modem_gnss_power_on()` — bỏ 4 nhánh CGNSPWR, chỉ giữ: probe `AT+CGPS?` (check `+CGPS: 1`), nếu chưa on → `AT+CGPS=1`, set `s_gnss_powered`.
4. `modem_gnss_power_off()` — bỏ `AT+CGNSPWR=0`, dùng thẳng `AT+CGPS=0`.
5. Đường CGPSINFO: gán `data->satellites = 0;` (thay `1`), `data->query_mode = GNSS_QUERY_MODE_CGPSINFO;`.
6. `gnss_model.h` — xoá `GNSS_QUERY_MODE_CGNSINF` (giữ `UNKNOWN=0`, `CGPSINFO`).
7. `data_formatter.c` — case `GNSS_QUERY_MODE_CGNSINF` xoá; label `"cgpsinfo_fallback"` → `"cgpsinfo"`.
8. Đổi log `gnss_fallback_*` → `gnss_query_*` (grep toàn file).
9. Kiểm server: grep code server `satellites` — nếu có luật gate `satellites >= N` thì KHÔNG merge (báo user). Nếu chỉ `> 0` → cũng phải sửa vì giờ `0` khi không fix (nhưng không fix thì `fix_valid=false` nên data không dùng).
10. Build:
    ```
    cd iot-vehicle-tracking-system-firmware
    idf.py build
    ```

## Todo list

- [ ] Xoá CGNSINF parse + timestamp parser chết
- [ ] Xoá static + macro backoff CGNSINF
- [ ] power_on chỉ còn CGPS?/CGPS=1
- [ ] power_off dùng CGPS=0
- [ ] satellites=0 + query_mode=CGPSINFO
- [ ] Bỏ enumerator CGNSINF khỏi gnss_model.h
- [ ] Đổi label cgpsinfo_fallback → cgpsinfo
- [ ] Log rename gnss_fallback_* → gnss_query_*
- [ ] Kiểm server gate satellites
- [ ] Build pass

## Success Criteria

- [ ] Build pass.
- [ ] Grep `CGNSINF|CGNSPWR` trong firmware = 0 (trừ comment giải thích nếu giữ).
- [ ] `satellites` = 0 khi không fix; label `"cgpsinfo"` trong payload diag.
- [ ] Server đã đồng bộ label (hoặc có note chờ server).

## Risk & Rollback

- **Risk:** Server chưa đồng bộ label → diag hiển thị sai `query_mode`. Giảm: merge firmware + server cùng lúc; ghi rõ breaking change.
- **Risk:** `satellites=0` làm filter phía server chặn dữ liệu — kiểm step 9 trước khi merge.
- **Rollback:** Phần xoá CGNSINF là xoá code chết (hành vi runtime gần như không đổi) — nếu cần quay lại, revert commit. Phần satellites/label là thay đổi có chủ đích — revert riêng.

## Security Considerations

- Không liên quan bảo mật; AT command ít hơn (4 lệnh thất bại biến mất) giảm nhiễu UART.

## Next steps

- Cập nhật report audit #22-24 thành ĐÃ SỬA. Phase 06 (port design) độc lập — có thể song song.