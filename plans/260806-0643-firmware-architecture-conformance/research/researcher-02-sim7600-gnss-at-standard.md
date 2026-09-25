# SIM7600 GNSS AT standard — chuẩn hoá về CGPS/CGPSINFO

Ngày: 2026-08-06 | Phạm vi: CHỈ ĐỌC, không sửa code.
Nguồn: vault `14-gnss-positioning-va-nmea.md`, vault `07-adapter-modem-sim7600.md`, code `modem_gnss.c`, `gnss_model.h`.

---

## 0. Kết luận sớm (điểm quan trọng nhất)

**Nhánh "PRIMARY" hiện tại nhiều khả năng đã chết trên phần cứng thật.** Code dùng `AT+CGNSPWR` + `AT+CGNSINF` — đây là họ lệnh **SIM800/SIM868/SIM7000**, không phải SIM7600 (vault 14 dòng 326-327; vault 07 dòng 1573-1574). Trên SIM7600, `AT+CGNSPWR=1` trả `ERROR` → `modem_gnss_power_on()` rơi xuống `AT+CGPS=1` (dòng 741) → đặt `s_use_cgps_query_only = true` → mọi query đi đường CGPSINFO.

Hệ quả: **bỏ CGNSINF gần như không đổi hành vi runtime**, chỉ xoá code chết và tiết kiệm 4 lệnh AT thất bại mỗi lần power-on. Đây là lập luận mạnh nhất cho quyết định, nên đưa vào commit message / thesis.

Cần verify trên hardware để chốt (xem §7 mục 4).

---

## 1. Chuỗi lệnh chuẩn SIM7600

| Bước | Lệnh | Kỳ vọng | Timeout hiện tại |
|---|---|---|---|
| Bật | `AT+CGPS=1` | `OK` | 3000 ms (`MODEM_GNSS_POWER_CMD_TIMEOUT_MS`) |
| Kiểm tra | `AT+CGPS?` | `+CGPS: 1` | 3000 ms |
| Query | `AT+CGPSINFO` | `+CGPSINFO: ...` + `OK` | 1500 ms (`MODEM_GNSS_QUERY_TIMEOUT_MS`) |
| Tắt | `AT+CGPS=0` | `OK` | 3000 ms |

Nguồn timeout tham chiếu: vault 07 §15.4 dùng 2000 ms cho `AT+CGPS=1`; vault 14 §B.2.1 khuyến nghị ~3000 ms cho lệnh power + chờ 2-3 s cho GNSS engine khởi động. Timeout hiện tại (3000 ms) hợp lệ.

**Tham số mode:** vault CHỈ ghi dạng `AT+CGPS=1` / `AT+CGPS=0`, không đề cập tham số thứ hai. Theo trí nhớ về SIMCom AT manual, cú pháp đầy đủ là `AT+CGPS=<on/off>[,<mode>]` với mode 1=standalone (mặc định), 2=UE-based, 3=UE-assisted — **SUY ĐOÁN, chưa verify vendor doc trong phiên này**. Khuyến nghị: **dùng `AT+CGPS=1` không tham số**, đúng dạng vault ghi, mode mặc định standalone là thứ dự án cần (không có SUPL server).

**Họ lệnh thứ ba:** vault 14 dòng 327 ghi "một số firmware SIM7600 đời mới còn hỗ trợ thêm `AT+CGNSSPWR` / `AT+CGNSSINFO` (hai chữ S)". Lưu ý code hiện dùng `CGNSPWR` (MỘT chữ S) — không phải họ này, mà là họ SIM800/7000. Đừng nhầm hai thứ.

---

## 2. Định dạng `+CGPSINFO` — 9 field

Nguồn: vault 07 §16.1 và bảng §16.3.

```
+CGPSINFO: <lat>,<N/S>,<lon>,<E/W>,<date>,<utc>,<alt>,<speed>,<course>
```

| # | Field | Định dạng | Ví dụ |
|---|---|---|---|
| 1 | lat | `ddmm.mmmmmm` (NMEA, KHÔNG phải decimal) | `2102.192400` |
| 2 | N/S | ký tự bán cầu | `N` |
| 3 | lon | `dddmm.mmmmmm` | `10559.259000` |
| 4 | E/W | ký tự bán cầu | `E` |
| 5 | date | `ddmmyy` | `150625` |
| 6 | utc | `hhmmss.s` | `083045.0` |
| 7 | alt | mét | `12.5` |
| 8 | speed | **knots HOẶC km/h tuỳ firmware** (vault hedge nguyên văn) | `35.2` |
| 9 | course | độ, 0=Bắc | `180.0` |

**Xác nhận KHÔNG có:** số vệ tinh, HDOP/PDOP/VDOP, fix quality, fix mode 2D/3D.

**Báo hiệu chưa fix:** toàn field rỗng → `+CGPSINFO: ,,,,,,,,` (vault 07 §16.1). Không có bit fix riêng như CGNSINF.

---

## 3. Field thực sự MẤT — đối chiếu code thật

Code `modem_gnss_send_and_parse()` (`modem_gnss.c:493-585`) chỉ đọc các index sau từ CGNSINF:

| Index code | Map vào `gnss_data_t` | CGPSINFO có thay thế? |
|---|---|---|
| `fields[1]` | `fix_valid` | CÓ — suy từ field rỗng (`modem_gnss.c:437-449`) |
| `fields[2]` | `timestamp_ms` | CÓ — date+utc (`modem_gnss.c:262-306`) |
| `fields[3]` `fields[4]` | `latitude` `longitude` | CÓ — nhưng khác format (§5) |
| `fields[6]` | `speed_kmh` | CÓ — field 8, cần convert (§5) |
| `fields[7]` | `course_deg` | CÓ — field 9 |
| `fields[14]+fields[15]` | `satellites` | **KHÔNG** |

**Chỉ mất duy nhất `satellites`.** HDOP/PDOP/VDOP/altitude/fix-mode: CGNSINF có nhưng **code chưa bao giờ đọc**, và `gnss_data_t` (`gnss_model.h:34-51`) **không có trường nào** cho chúng → mất 0.

### `satellites` — vốn đã sai sẵn

Code dòng 571-573 gọi `fields[14]`/`fields[15]` là `sat_gps`/`sat_glonass`. Đối chiếu bảng field CGNSINF ở vault 14 §B.2.2 (1-based: 13=sats in use, 14=sats in view, 15+=SNR từng vệ tinh), thì index 0-based 14/15 rơi vào **vùng SNR**, không phải số vệ tinh. Theo spec SIMCom thực tế (SUY ĐOÁN, cần verify vendor doc) có thêm các trường `Reserved`, index 14/15 là `sats_in_view` + `GNSS_sats_used` → cộng lại là **đếm trùng**.

Cả hai cách đọc đều cho kết luận giống nhau: **`satellites` từ CGNSINF không phải "gps + glonass" và không đáng tin**. Thứ đang mất vốn đã hỏng — thêm một lý do củng cố quyết định bỏ.

Trên đường CGPSINFO, code đã **hardcode `satellites = 1`** (dòng 468-472) kèm comment giải thích: giữ để cloud filter `satellites > 0` vẫn chạy. Nên với hardware SIM7600, giá trị thực tế đang chạy đã là `1` rồi.

---

## 4. Phương án bù số vệ tinh

| # | Phương án | Chi phí | Đánh giá |
|---|---|---|---|
| a | Giữ `satellites = 1` như hiện tại | 0 | **Khuyến nghị.** Đã chạy sẵn. Nhưng nên sửa cho trung thực: hoặc comment rõ "sentinel, không phải số đo", hoặc đổi sang `0` + sửa luật gate phía cloud. |
| b | Bật NMEA URC qua `AT+CGPSINFOCFG=<time>,<mask>`, parse `$GPGGA` (sats used + HDOP) / `$GPGSV` (in view) / `$GPGSA` (DOP) | **Cao** | NMEA stream 1 Hz đè lên **UART dùng chung với modem** — vault 14 §B.1 cảnh báo trực tiếp. Cần đăng ký URC handler (chỉ 8 slot, vault 07 §4.2) + parser NMEA + checksum. Vi phạm YAGNI trừ khi số vệ tinh là yêu cầu sản phẩm thật. Cú pháp `CGPSINFOCFG` là **SUY ĐOÁN**, chưa có trong vault. |
| c | `AT+CGNSSINFO` (hai chữ S) — có sat count + DOP | Trung bình | Vault 14 dòng 327 ghi chỉ "một số firmware đời mới" hỗ trợ → **tái lập đúng cái dual-path fragility đang muốn xoá**. Không khuyến nghị. Có thể probe `AT+CGNSSINFO=?` một lần lúc bring-up và **chỉ log**, không branch. |

Vault **không đề xuất** phương án bù nào — vault chấp nhận CGPSINFO không có sat count là bình thường cho SIM7600.

---

## 5. Đơn vị & chuyển đổi — trạng thái code

| Đại lượng | CGPSINFO | Code hiện tại | Đánh giá |
|---|---|---|---|
| lat/lon | `ddmm.mmmmmm` + hemisphere | `modem_gnss_parse_nmea_degrees()` dòng 343-365: `deg = int(raw/100)`, `min = raw - deg*100`, `dec = deg + min/60`, S/W → âm | **ĐÚNG** |
| speed | knots hoặc km/h (vault hedge) | dòng 474: `atof(fields[7]) * 1.852f` — giả định **knots** | **RỦI RO — phải verify** |
| course | độ | dòng 475, đọc thẳng | ĐÚNG |
| timestamp | ddmmyy + hhmmss.s | `modem_gnss_parse_cgpsinfo_timestamp()` dòng 262-306, tính epoch thủ công tránh mktime/timezone | ĐÚNG |

**Rủi ro speed:** nếu firmware trả km/h mà code nhân 1.852 → **mọi giá trị tốc độ bị thổi phồng 1.852 lần**. Quy ước NMEA (`$GPRMC` field 7) là knots và CGPSINFO dẫn xuất từ NMEA nên knots là khả năng cao, nhưng vault không dám khẳng định. **Cách verify rẻ nhất: dự án đã có `adapter-ble-obd-nimble` — chạy xe ở 40-60 km/h, so speed GNSS với speed OBD.** Lệch ~1.85x → bỏ hệ số nhân.

Lưu ý: CGNSINF trả lat/lon **decimal degrees** (vault 14 §B.2.2 field 4/5) nên code đọc thẳng bằng `atof` (dòng 554-555) — hai đường dùng hai phép chuyển đổi khác nhau. Bỏ CGNSINF cũng xoá luôn nguồn nhầm lẫn này.

---

## 6. Ảnh hưởng contract — điểm cần kiểm

1. **`gnss_data_t.satellites`** — sau chuẩn hoá luôn là `1` (có fix) / `0` (không fix). Kiểm luật gate phía server: nếu ở đâu đó có `satellites >= 4` thì **sẽ không bao giờ pass**. Comment code dòng 460-467 nói cloud gate ở `> 0` — cần xác nhận lại bằng server code.
2. **`gnss_query_mode_t`** (`gnss_model.h:23-29`) — `GNSS_QUERY_MODE_CGNSINF` thành unreachable. **CẢNH BÁO:** nếu enum này được serialize thành số nguyên vào JSON MQTT, việc **xoá enumerator sẽ dịch `CGPSINFO` từ 2 → 1** và phá mapping phía server. An toàn: giữ nguyên giá trị enumerator, chỉ không bao giờ emit; hoặc xoá hẳn cả field (đây là thay đổi contract, cần chốt với server).
3. **Cần grep** `mqtt_publish.c` xem `satellites` và `query_mode` có nằm trong payload JSON không — **chưa verify trong phiên này** (hết ngân sách tool call).
4. HDOP / altitude / fix-mode: chưa từng có trong contract → không ảnh hưởng.

---

## 7. Việc BẮT BUỘC verify trên phần cứng trước khi merge

1. `AT+CGPS=1` → `OK`; `AT+CGPS?` → ghi lại **chuỗi trả về chính xác** (`+CGPS: 1` hay `+CGPS: 1,1`). Code dùng `strstr(response, "+CGPS: 1")` — khớp cả hai dạng, an toàn, nhưng cần xác nhận.
2. `AT+CGPSINFO` **khi chưa fix** → đếm số dấu phẩy, xác nhận `field_count >= 4` (điều kiện parse ở dòng 431).
3. `AT+CGPSINFO` **khi đã fix** → ghi lại chuỗi thô; **đối chiếu field 8 với speed OBD** để chốt knots vs km/h (§5).
4. `AT+CGNSPWR=1` và `AT+CGNSINF` → xác nhận trả `ERROR` trên đúng module này. Đây là bằng chứng chốt cho §0.
5. `AT+CGPS=0` → đo độ trễ phản hồi, xác nhận 3000 ms đủ.
6. Đo TTFF cold start thực tế (vault 07 §17.2: 30-120 s) — xem §8 câu hỏi 1.

---

## 8. Câu hỏi chưa giải quyết

1. **Nghi ngờ bug độc lập, cần điều tra riêng:** `MODEM_GNSS_NO_FIX_RECOVER_THRESHOLD = 10` (dòng 40). Nếu query chạy 1 Hz thì recovery power-cycle GNSS sau ~10 s no-fix — **nằm sâu bên trong cửa sổ cold TTFF 30-120 s**, có thể khiến module không bao giờ fix được khi khởi động lạnh (cooldown 180 s giới hạn tần suất nhưng không loại bỏ vấn đề). Chưa đọc caller nên chưa biết cadence thật. Cần xác định nhịp gọi `modem_gnss_get_location()`.
2. `satellites = 1` nên giữ nguyên (an toàn cho cloud filter) hay đổi `0` cho trung thực? Phụ thuộc luật gate phía server — **cần quyết định của user**.
3. `query_mode` có nằm trong payload MQTT không? Quyết định giữ enum hay xoá field phụ thuộc câu này.
4. Có yêu cầu sản phẩm nào thực sự cần số vệ tinh / HDOP không? Nếu không → chốt phương án 4(a), đóng hẳn hướng NMEA URC.

---

## 9. Danh sách xoá cụ thể (tham chiếu cho phase implement)

- `modem_gnss_send_and_parse()` — dòng 493-585
- `modem_gnss_parse_timestamp()` — dòng 101-152 (chết sau khi bỏ CGNSINF)
- Static: `s_cgnsinf_fail_streak`, `s_use_cgps_query_only`, `s_cgnsinf_backoff_until_ms`
- Macro: `MODEM_GNSS_QUERY_PRIMARY_BACKOFF_FAIL_THRESHOLD`, `MODEM_GNSS_QUERY_PRIMARY_BACKOFF_COOLDOWN_MS`
- `modem_gnss_power_on()`: 4 nhánh CGNSPWR (dòng 690-737) → chỉ giữ probe `AT+CGPS?` + `AT+CGPS=1`
- `modem_gnss_power_off()`: bỏ `AT+CGNSPWR=0` (dòng 776), dùng thẳng `AT+CGPS=0`
- Đổi tên log `gnss_fallback_*` → `gnss_query_*` (không còn "fallback" khi chỉ còn một đường)

---

Status: DONE_WITH_CONCERNS
Summary: Vault xác nhận dứt khoát CGPS/CGPSINFO là họ lệnh đúng của SIM7600; nhánh CGNSINF hiện tại thuộc họ SIM800/7000 nên nhiều khả năng đã chết sẵn trên hardware, và trường `satellites` duy nhất bị mất thì vốn đã đọc sai index từ đầu.
Concerns: (1) Giả định speed = knots trong code chưa được kiểm chứng — sai thì tốc độ lệch 1.852x, phải đối chiếu với OBD. (2) Xoá enumerator `GNSS_QUERY_MODE_CGNSINF` có thể dịch giá trị số và phá mapping server nếu enum được serialize — chưa kiểm được payload MQTT. (3) Phát hiện thêm nghi ngờ bug ngoài phạm vi: ngưỡng no-fix recovery 10 lần có thể cắt ngang cold start TTFF.
