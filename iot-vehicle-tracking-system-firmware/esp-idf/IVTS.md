# IVTS firmware — hướng dẫn viết từng component (M2–M12)

Nov 22, 2026 · @anmh1205

Tài liệu này ghi lại thiết kế M2–M12. Thay đổi giao thức, quản lý phiên và kiểm thử
của bản đối chiếu nằm ở mục **Đối chiếu firmware tham chiếu** trong [README](../README.md).

## 0. Cách đọc tài liệu và những gì đã chốt

Toàn bộ cây `ivts-firmware` trong tài liệu này đã build sạch bằng **ESP-IDF v6.1.1 cho esp32s3** (IDF bật `-Werror`, 0 warning) và **5.700 check host test** pass dưới ASan + UBSan. Phần I/O (UART, I2C, SD, BLE, sleep) mới chứng minh được "build pass", **chưa chạy trên board**. Mỗi phần kết thúc bằng mục "Kiểm chứng" tách rõ hai việc đó.

Mỗi phần theo thứ tự: vấn đề → cơ chế IDF/phần cứng → quyết định và lý do → code → kiểm chứng. Code trong doc là bản đã build. Header public in đầy đủ; file cài đặt dài thì in phần khó, phần còn lại nằm trong bản zip đầy đủ gửi kèm trong chat (cùng commit với doc).

### Trạng thái kiểm chứng

| Hạng mục                                                          | Cách kiểm                                                                          | Kết quả                                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Module thuần (core, AT parser/engine, GNSS parse, ELM327, OBD PID) | `tools/host_test.sh`: gcc 13, `-Werror -Wconversion`, ASan + UBSan, 16 file test | 5.700 pass, 0 fail                                                     |
| Layout record offline queue                                         | CRC tính độc lập bằng Python `struct.pack` + `zlib.crc32`                   | Khớp `0xAAC96EC4`                                                   |
| Cả firmware                                                        | `idf.py build`, IDF v6.1.1, toolchain esp-15.2.0, target esp32s3                   | Pass, app 0xA8EE0 B (44% partition 1.5 MB dùng hết, 56% còn trống) |
| `sizeof` trên Xtensa                                             | `xtensa-esp32s3-elf-nm -S`                                                         | event 40 B, telemetry 304 B, config 422 B, gnss 24 B, giống host      |
| Luật layer                                                         | `tools/check_layers.sh` + đột biến (cố tình thêm include sai)                | 10/10 ok; đột biến bị bắt đúng luật                            |
| `check_layers.ps1`                                                | Chưa chạy (môi trường không có PowerShell)                                    | Cùng luật với bản `.sh`                                          |
| Mọi thứ đụng phần cứng                                        | —                                                                                   | Chưa chạy. Danh sách đo ở phần 11                                |

### Bốn quyết định D1–D4

|    | Quyết định                                                                                                       | Lý do                                                                                                                                                    | Điều chỉnh so với đề xuất ban đầu                                                                                                                                                                                                           |
| -- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 | `board` có task nhỏ (prio 2, stack 3072): nhận notify từ ISR IMU, lấy mẫu ADC định kỳ                    | ISR không được gọi sink. Repo gốc **không có chân ignition riêng**: ignition suy từ áp nguồn xe qua ADC, nên chỉ IMU là ngắt thật | Bus I2C có mutex trong `board_os.c` vì task board và `board_time_*` (gọi từ app) cùng dùng                                                                                                                                                |
| D2 | Event báo `CMD_PENDING{len}`. Modem giữ FIFO bốn lệnh, app rút bằng `modem_cmd_take()` | Giữ payload OTA ngoài queue sự kiện chung | SIM7600 tự PUBACK; app trả `commands/ack` và lưu 32 lệnh thành công gần nhất trong NVS. |
| D3 | JSON reader tự viết trong `ivts-core/payload` (kiểu jsmn, không malloc, giới hạn token/độ sâu/độ dài) | Command là dữ liệu từ ngoài; host test được; không kéo cJSON vào app                                                                           | Lỗi trả **số âm** (`-IVTS_ERR_*`) để không lẫn với số token                                                                                                                                                                        |
| D4 | `ota.h` định nghĩa `ota_source_t {open, read, close}`; `app_init.c` nối `modem_http_*` vào             | `ota` và `modem` là hai component I/O, không được gọi nhau                                                                                     | `modem_http_*` là RPC chặn: chỉ task `ota` gọi; modem task trả lời qua semaphore                                                                                                                                                           |

### Phát hiện khi đối chiếu repo gốc với tài liệu

Đây là những chỗ ảnh hưởng thiết kế, tìm ra khi đọc header IDF 6.1.1, AT manual SIM7600 và datasheet:

- **LIS3DSH INT1 nối GPIO36**, tức chân vật lý 41 của ESP32-S3 theo netlist PCB. GPIO36 thuộc nhóm GPIO số dành cho light sleep. `esp_sleep_enable_ext0_wakeup` ghi rõ ESP32-S3 chỉ có RTC GPIO 0–21. Deep sleep **không thể** thức theo motion trên board này. FSM chọn light sleep khi cần cảnh báo trộm (`deep_wake_on_motion = false`). Muốn deep sleep + motion phải đi lại dây INT sang GPIO ≤ 21.
- **`AT+CGNSINF` / `AT+CGNSPWR` là lệnh của SIM7000/SIM7080**, không có trong AT manual SIM7600. Trên SIM7600, nhánh "primary" của repo gốc luôn hỏng rồi rơi về `CGPSINFO`. Bản mới dùng `AT+CGNSSINFO` (manual 17.2.21), fallback `AT+CGPSINFO` (17.2.2).
- **Nhánh LIS3DSH của repo gốc ghi thanh ghi LIS3DH** (`INT1_CFG`/`INT1_THS` ở 30h–33h). Datasheet LIS3DSH không có các thanh ghi đó; ngắt motion phải lập trình state machine SM1 (40h–5Fh). Có thể đó là lý do gốc ghi "imu wakeup when hardware proof is available".
- **`esp_sleep_get_wakeup_cause()` đã deprecated ở IDF 6.1**: dùng `esp_sleep_get_wakeup_causes()` (bitmap).
- **IDF 6.1 đi kèm mbedTLS 4.1.1**: `mbedtls_sha256_*` không còn; SHA-256 cho OTA dùng PSA (`psa_hash_*`). IDF tự gọi `psa_crypto_init()` lúc boot.
- **GPIO34/35 (PWRKEY/RESET modem)**: trên module có octal PSRAM, GPIO33–37 bị PSRAM chiếm. Kiểm module của board (N16R8 hay N16).
- **IDF 6.1 build với `-Werror=format-truncation`**: mọi `snprintf` ghép chuỗi từ struct phải kiểm giá trị trả về, nếu không build fail. Đó cũng là thói quen đúng: lệnh AT bị cắt (credential, APN) tệ hơn không gửi.

### Ma trận layer

| Component     | `REQUIRES` (lộ ra header public) | `PRIV_REQUIRES`                                              | Task                         |
| ------------- | ----------------------------------- | -------------------------------------------------------------- | ---------------------------- |
| `ivts-core` | —                                  | —                                                             | không                       |
| `board`     | `ivts-core`                       | `esp_driver_i2c esp_driver_gpio esp_adc esp_pm esp_timer`    | `board`                    |
| `storage`   | `ivts-core`                       | `nvs_flash fatfs sdmmc esp_driver_sdmmc vfs esp_timer`       | `storage`                  |
| `modem`     | `ivts-core`                       | `esp_driver_uart esp_driver_gpio esp_pm esp_timer`           | `modem`                    |
| `obd`       | `ivts-core`                       | `bt esp_timer`                                               | `obd` (+ host task NimBLE) |
| `ota`       | `ivts-core`                       | `app_update esp_app_format esp_partition mbedtls esp_timer`  | `ota` (khi tải)           |
| `app`       | —                                  | `ivts-core board storage modem obd ota esp_timer esp_system` | `app`                      |
| `main`      | —                                  | `app`                                                        | `main` (thoát ngay)       |

Header public của component I/O chỉ include `ivts-core`, không lộ kiểu IDF (`esp_err_t`, `QueueHandle_t`). Đổi được adapter mà không ai phải biên dịch lại theo IDF; đồng thời `check_layers` luật 9 canh điều này.

IDF 6.1 vẫn cho mọi component dùng nhóm "common requirements" (`freertos`, `log`, `esp_rom`...) mà không cần khai `REQUIRES`, nên `#include "esp_log.h"` trong `ivts-core` vẫn build pass. CMake không giữ được ranh giới này; script phải giữ.

### `tools/check_layers.ps1`

Mười luật. Bản `check_layers.sh` cùng luật đã chạy và bắt đúng ba đột biến (include `esp_log.h` vào core, include `storage/storage.h` vào modem, `esp_restart()` trong ota).

| #  | Luật                                                                                                                                           | Vì sao                                                    |
| -- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1  | `ivts-core/CMakeLists.txt` không có `REQUIRES`                                                                                            | core build được trên host                              |
| 2  | `ivts-core` không include `esp_`, `freertos/`, `driver/`, `sdkconfig`, `nvs`, `hal/`, `soc/`, `host/`, `nimble/`, `psa/` | như trên; CMake không chặn được common requirements |
| 3  | `ivts-core` không include header component khác                                                                                             | core là đáy của đồ thị                              |
| 4  | CMake của component I/O không nhắc tên component I/O khác                                                                                  | ma trận: I/O không gọi nhau                             |
| 5  | Source component I/O không include header của nhau                                                                                            | như trên, ở mức code                                   |
| 6  | `main` chỉ `PRIV_REQUIRES app`                                                                                                             | main chỉ khởi động                                     |
| 7a | `esp_*_sleep_start` / `esp_sleep_enable*` chỉ ở `board_power.c`                                                                         | một chỗ quyết nguồn thức                              |
| 7b | `esp_restart();` chỉ ở `app`                                                                                                              | vòng đời thuộc composition root                        |
| 8  | File thuần ngoài core (`at_parser`, `at_engine`, `gnss_parse`, `elm327`, `obd_pid`) không include IDF                              | để `host_test.sh` biên dịch được                  |
| 9  | Header public của component I/O không include IDF                                                                                             | API độc lập IDF                                         |

```powershell
# tools/check_layers.ps1 — chạy: pwsh tools/check_layers.ps1   (exit 0 = toàn ok)
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

$IO = @('board','storage','modem','obd','ota')
$ForbidIdf = '#include\s*[<"](esp_|freertos/|driver/|sdkconfig|nvs|hal/|soc/|host/|nimble/|psa/)'
$Pure = @(
  'components/modem/src/at_parser.c','components/modem/src/at_parser.h',
  'components/modem/src/at_engine.c','components/modem/src/at_engine.h',
  'components/modem/src/gnss_parse.c','components/modem/src/gnss_parse.h',
  'components/obd/src/elm327.c','components/obd/src/elm327.h',
  'components/obd/src/obd_pid.c','components/obd/src/obd_pid.h')
$script:fail = $false

function Check([string]$name, $hits) {
  $hits = @($hits | Where-Object { $_ })
  if ($hits.Count -eq 0) { Write-Host "ok   $name" }
  else { Write-Host "FAIL $name" -ForegroundColor Red; $hits | ForEach-Object { Write-Host "     $_" }; $script:fail = $true }
}
function Grep([string]$pattern, [string[]]$paths) {
  Get-ChildItem -Path $paths -Recurse -File -Include *.c,*.h,CMakeLists.txt -ErrorAction SilentlyContinue |
    Select-String -Pattern $pattern | ForEach-Object { "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" }
}

Check '1 ivts-core không REQUIRES' (Select-String -Path components/ivts-core/CMakeLists.txt -Pattern 'REQUIRES')
Check '2 ivts-core không include IDF' (Grep $ForbidIdf @('components/ivts-core'))
Check '3 ivts-core không include component khác' (Grep '#include\s*"(board|storage|modem|obd|ota|app)/' @('components/ivts-core'))

$r4 = foreach ($c in $IO) {
  $txt = Get-Content "components/$c/CMakeLists.txt" -Raw
  $deps = [regex]::Matches($txt, '\b(board|storage|modem|obd|ota|app)\b') | ForEach-Object Value | Where-Object { $_ -ne $c }
  if ($deps) { "$c -> $($deps -join ',')" }
}
Check '4 component I/O không phụ thuộc nhau (CMake)' $r4

$r5 = foreach ($c in $IO) {
  $others = ($IO + 'app' | Where-Object { $_ -ne $c }) -join '|'
  Grep "#include\s*`"($others)/" @("components/$c")
}
Check '5 component I/O không include header của nhau' $r5

Check '6 main chỉ PRIV_REQUIRES app' (Select-String -Path main/CMakeLists.txt -Pattern 'PRIV_REQUIRES' |
  Where-Object { $_.Line -notmatch 'PRIV_REQUIRES\s+app\s*\)?\s*$' } | ForEach-Object Line)
Check '7a esp_sleep_* chỉ ở board_power.c' (Grep 'esp_(deep|light)_sleep_start|esp_sleep_enable' @('components','main') |
  Where-Object { $_ -notmatch 'board[\\/]src[\\/]board_power\.c' })
Check '7b esp_restart chỉ ở app' (Grep '^[^*/]*esp_restart\(\);' @('components','main') |
  Where-Object { $_ -notmatch 'components[\\/]app[\\/]' })
Check '8 file thuần không include IDF' (Select-String -Path $Pure -Pattern $ForbidIdf | ForEach-Object { "$($_.Path):$($_.LineNumber)" })
Check '9 header public không lộ IDF' (Grep $ForbidIdf @('components/board/include','components/storage/include',
  'components/modem/include','components/obd/include','components/ota/include','components/app/include'))

if ($script:fail) { exit 1 } else { exit 0 }
```

Luật 7b ban đầu báo nhầm một dòng comment trong `ota.h` ("rồi mới esp\_restart()"). Regex hiện tại chỉ bắt dòng không bắt đầu bằng `*` hay `/`. Grep theo text luôn có kiểu báo nhầm này; muốn chắc hơn thì chạy trên output `-E` của preprocessor.

## 1. M2 — `ivts-core`: base, model, event

`ivts-core` là C11 thuần: không `REQUIRES`, không state toàn cục ghi được, không task. Mọi hàm gọi được từ task nào cũng được, nên cả component không cần mutex. Hướng include trong core: `base` ← `model` ← `event` ← (`payload`, `fsm`, `ota`). `model/*.h` chỉ include `base` (repo gốc làm ngược: `telemetry_model.h` include `fsm_types.h`).

Phần này là bản cuối của những gì đã gửi trong chat trước, có ba thay đổi: `event.h` có danh sách type đầy đủ (thêm dần theo milestone), thêm `base/civil.h` (ngày giờ UTC ↔ Unix ms, dùng chung cho GNSS và DS3231M), `host_test.sh` biên dịch cả các file thuần nằm ngoài core.

### Cây và CMake

```cmake
# components/ivts-core/CMakeLists.txt — liệt kê tường minh, không GLOB (GLOB chỉ quét lại khi reconfigure)
idf_component_register(
    SRCS
        "src/base/err.c" "src/base/str.c" "src/base/backoff.c" "src/base/crc32.c" "src/base/civil.c"
        "src/model/config.c" "src/model/record.c"
        "src/event/event.c"
        "src/payload/json_writer.c" "src/payload/json_reader.c" "src/payload/payload.c"
        "src/fsm/axes.c" "src/fsm/fsm.c"
        "src/ota/contract.c" "src/ota/confirm.c"
    INCLUDE_DIRS "include"
)
```

CMake trên đã gồm file của M7–M11. Khi đang ở M2 thì chỉ liệt kê `base/*`, `model/config.c`, `event/event.c`.

### `base/err.h`, `base/time.h`, `base/str.h`

```c
// include/ivts_core/base/err.h
#pragma once
typedef enum {
    IVTS_OK = 0,
    IVTS_ERR_FAIL, IVTS_ERR_INVALID_ARG, IVTS_ERR_INVALID_STATE, IVTS_ERR_TIMEOUT,
    IVTS_ERR_NOT_FOUND, IVTS_ERR_FULL, IVTS_ERR_IO, IVTS_ERR_CRC, IVTS_ERR_VERSION,
    IVTS_ERR_COUNT       /* sentinel: chỉ để test duyệt hết enum */
} ivts_err_t;
const char *ivts_err_name(ivts_err_t e);   /* không bao giờ NULL */
```

```c
// src/base/err.c — cố ý KHÔNG có `default:` để -Wswitch báo khi thêm enum mà quên tên
const char *ivts_err_name(ivts_err_t e)
{
    switch (e) {
    case IVTS_OK:                return "IVTS_OK";
    case IVTS_ERR_FAIL:          return "IVTS_ERR_FAIL";
    case IVTS_ERR_INVALID_ARG:   return "IVTS_ERR_INVALID_ARG";
    case IVTS_ERR_INVALID_STATE: return "IVTS_ERR_INVALID_STATE";
    case IVTS_ERR_TIMEOUT:       return "IVTS_ERR_TIMEOUT";
    case IVTS_ERR_NOT_FOUND:     return "IVTS_ERR_NOT_FOUND";
    case IVTS_ERR_FULL:          return "IVTS_ERR_FULL";
    case IVTS_ERR_IO:            return "IVTS_ERR_IO";
    case IVTS_ERR_CRC:           return "IVTS_ERR_CRC";
    case IVTS_ERR_VERSION:       return "IVTS_ERR_VERSION";
    case IVTS_ERR_COUNT:         break;
    }
    return "IVTS_ERR_UNKNOWN";
}
```

Không dùng chung giá trị với `esp_err_t`. Mỗi component có một `static inline xxx_err(esp_err_t)` trong `*_priv.h` để chuyển ở biên (ví dụ `board_err()` ở phần 3).

```c
// include/ivts_core/base/time.h
typedef uint64_t ivts_ms_t;   /* đơn điệu từ boot. KHÔNG lưu vào NVS/RTC/record */
static inline ivts_ms_t ivts_elapsed(ivts_ms_t now, ivts_ms_t since)
{
    return (now >= since) ? (now - since) : 0u;    /* since ở tương lai (retry_at) -> 0, không underflow */
}
```

```c
// src/base/str.c
ivts_err_t ivts_str_copy(char *dst, size_t cap, const char *src)
{
    if (dst == NULL || cap == 0u) { return IVTS_ERR_INVALID_ARG; }
    if (src == NULL) { dst[0] = '\0'; return IVTS_ERR_INVALID_ARG; }
    size_t n = strlen(src);
    if (n < cap) { memcpy(dst, src, n + 1u); return IVTS_OK; }
    memcpy(dst, src, cap - 1u);          /* cắt, chừa chỗ cho NUL */
    dst[cap - 1u] = '\0';
    return IVTS_ERR_FULL;                /* caller biết bị cắt: device_id cắt = cloud từ chối mà không ai biết vì sao */
}

int ivts_clamp_int(int v, int lo, int hi)
{
    if (lo > hi) { int t = lo; lo = hi; hi = t; }
    return (v < lo) ? lo : (v > hi) ? hi : v;
}
```

### `base/crc32` và `base/backoff`

```c
// src/base/crc32.c — CRC-32 tương thích zlib, bitwise (không bảng)
uint32_t ivts_crc32(uint32_t seed, const void *data, size_t len)
{
    const uint8_t *p = (const uint8_t *)data;
    uint32_t crc = ~seed;                /* đảo đầu vào: cho phép ghép đoạn */
    while (len-- > 0u) {
        crc ^= *p++;
        for (int bit = 0; bit < 8; bit++) {
            uint32_t mask = 0u - (crc & 1u);
            crc = (crc >> 1) ^ (0xEDB88320u & mask);
        }
    }
    return ~crc;                         /* đảo đầu ra */
}
```

```c
// src/base/backoff.c — hàm thuần; attempt/retry_at là field của FSM gọi nó (modem_lte, obd)
uint32_t ivts_backoff_ms(const ivts_backoff_t *p, uint32_t attempt, uint32_t seed)
{
    if (p == NULL) { return 1u; }
    uint64_t base = (p->base_ms != 0u) ? (uint64_t)p->base_ms : 1u;
    uint64_t max  = ((uint64_t)p->max_ms < base) ? base : (uint64_t)p->max_ms;
    uint32_t shift = (attempt < 31u) ? attempt : 31u;        /* dịch >= độ rộng kiểu là UB */
    uint64_t curve = base << shift;                          /* < 2^63, không tràn */
    if (curve > max) { curve = max; }
    /* Jitter cộng SAU khi cap: repo gốc cap cả jitter nên cả đội xe retry đúng một mốc (thundering herd). */
    uint64_t total = curve + ((uint64_t)seed % ((uint64_t)p->jitter_ms + 1u));
    return (total > UINT32_MAX) ? UINT32_MAX : (uint32_t)total;
}
```

### `base/civil` (mới)

GNSS trả `ddmmyy` + `hhmmss.s`, DS3231M lưu BCD. Cả hai cần UTC ↔ Unix ms. Không dùng `mktime`: nó phụ thuộc `TZ`, và `time_t` của host khác target. Thuật toán `days_from_civil`/`civil_from_days` (Howard Hinnant, public domain) chỉ dùng số nguyên.

```c
// include/ivts_core/base/civil.h
typedef struct { uint16_t year; uint8_t month, day, hour, min, sec; uint16_t ms; } ivts_civil_t;
/* INVALID_ARG nếu ngoài 1970..2099 hoặc ngày không tồn tại (31/4, 29/2 năm thường) */
ivts_err_t ivts_civil_to_unix_ms(const ivts_civil_t *c, uint64_t *out);
void ivts_unix_ms_to_civil(uint64_t unix_ms, ivts_civil_t *c);
```

```c
// src/base/civil.c (phần lõi)
static int64_t days_from_civil(int64_t y, unsigned m, unsigned d)
{
    y -= (m <= 2u) ? 1 : 0;
    int64_t era = (y >= 0 ? y : y - 399) / 400;
    unsigned yoe = (unsigned)(y - era * 400);
    unsigned mp = (m > 2u) ? m - 3u : m + 9u;
    unsigned doy = (153u * mp + 2u) / 5u + d - 1u;
    unsigned doe = yoe * 365u + yoe / 4u - yoe / 100u + doy;
    return era * 146097 + (int64_t)doe - 719468;
}
```

Test khứ hồi mọi ngày từ 1970 tới 2099 (47.482 ngày): `unix -> civil -> unix` phải ra đúng số ban đầu.

### `model/config`

Hằng MIN/MAX/default lấy từ `runtime_config.h` và `app_config_defaults.c` của repo gốc. `ivts_config_defaults()` chỉ điền số và cờ. `device_id`, `auth_token`, `mqtt_host`, `apn`, `mqtt_port` để trống; `app_init.c` điền từ Kconfig. Hệ quả cố ý: defaults đơn thuần là config **không hợp lệ** (fail closed: chưa provision thì không nói chuyện với cloud).

| field                         | MIN   | MAX   | default   |
| ----------------------------- | ----- | ----- | --------- |
| `tracking_interval_s`       | 1     | 3600  | 1         |
| `heartbeat_interval_s`      | 60    | 65535 | 120       |
| `alarm_interval_s`          | 1     | 60    | 3         |
| `ignition_off_hold_ms`      | 1000  | 60000 | 15000     |
| `alarm_timeout_s`           | 30    | 3600  | 300       |
| `ota_min_battery_mv`        | 3300  | 4500  | 3850      |
| `ignition_adc_threshold_mv` | 11000 | 15000 | 13000     |
| `mqtt_port`                 | 1     | 65535 | (Kconfig) |

```c
// include/ivts_core/model/config.h (phần API)
typedef struct {
    char     device_id[32], auth_token[128], mqtt_host[64], mqtt_username[32], mqtt_password[64], apn[64];
    char     obd_ble_addr[18];                    /* rỗng = tự dò */
    uint16_t mqtt_port, heartbeat_interval_s, tracking_interval_s, alarm_interval_s,
             ignition_off_hold_ms, alarm_timeout_s, ota_min_battery_mv, ignition_adc_threshold_mv;
    bool     sleep_enabled, imu_wakeup_enabled, command_subscribe_enabled;
} ivts_config_t;

typedef struct { uint8_t field; uint8_t reason; } ivts_cfg_issue_t;   /* reason: EMPTY / TOO_LOW / TOO_HIGH / BAD_FORMAT */
void   ivts_config_defaults(ivts_config_t *c);
/* Ghi tối đa cap lỗi; trả TỔNG số lỗi (có thể > cap). 0 = hợp lệ. */
size_t ivts_config_validate(const ivts_config_t *c, ivts_cfg_issue_t *out, size_t cap);
```

Ba chi tiết trong `config.c`:

- Kiểm NUL bằng `memchr(buf, '\0', sizeof buf)` trước mọi `strlen`. Blob từ NVS có CRC đúng vẫn có thể thiếu NUL nếu firmware ghi sai.
- `add_issue()` luôn tăng bộ đếm kể cả khi hết chỗ ghi, nên caller phân biệt "đủ chỗ" với "bị cắt".
- `defaults()` `memset` cả struct trước khi gán: M5 tính CRC trên blob, padding rác làm CRC đổi giữa các lần chạy.

### `model/gnss.h`, `obd.h`, `telemetry.h`

- `ivts_gnss_t`: fixed-point (`lat_e7`, `lon_e7`, `speed_cm_s`, `course_deg_x10`), `src` = `NONE/FULL/APPROX` (`FULL` = có số vệ tinh từng hệ, `APPROX` = không có). Bỏ `double` của gốc vì S3 tính `double` bằng phần mềm và so sánh bit/CRC trong test chỉ ổn với số nguyên.
- `ivts_obd_sample_t` có `valid_mask` (`IVTS_OBD_HAS_RPM`...). Bằng chứng cần nó: gốc gán `obd_rpm = 0` làm "chưa có dữ liệu" (`state_obd_runtime.c:346`) rồi lại dùng `obd_rpm == 0` làm điều kiện (`state_wake_prelude.c:386`).
- `ivts_dtc_list_t` có thêm cờ `truncated` khi xe báo nhiều hơn 8 mã.
- `ivts_telemetry_t` dùng `vehicle_mv`/`device_mv` (bỏ `float`), `ivts_ecu_state_t` thay chuỗi `obd_ecu_state[24]` (5 nhãn của `ble_obd.c` gốc: unknown/disconnected/live/stopped/no\_data), bỏ `bool ignition` trùng với trục ignition.

### `event/event.h` (bản cuối)

```c
#define IVTS_EVENT_MAX_SIZE 64u

typedef enum {
    IVTS_EV_NONE = 0,
    IVTS_EV_LINK_STATE,      /* modem: mạng / broker lên xuống          (M6, M7) */
    IVTS_EV_GNSS_FIX,        /* modem: một mẫu GNSS                     (M6) */
    IVTS_EV_MQTT_ACK,        /* modem: kết quả publish QoS1              (M7) */
    IVTS_EV_CMD_PENDING,     /* modem: hàng đợi có command (D2)         (M7) */
    IVTS_EV_STORE_RESULT,    /* storage: kết quả LỖI của một yêu cầu    (M5) */
    IVTS_EV_QUEUE_READY,     /* storage: ô peek của offline queue đầy   (M8) */
    IVTS_EV_CONFIG_CORRUPT,  /* storage: blob config hỏng, đã dùng default (M5) */
    IVTS_EV_OBD_LINK,        /* obd: BLE/ELM327 lên xuống               (M9) */
    IVTS_EV_OBD_SAMPLE,      /* obd: một mẫu PID                        (M9) */
    IVTS_EV_OBD_DIAG_READY,  /* obd: readiness/DTC mới, lấy bằng obd_diag_copy() (M9) */
    IVTS_EV_POWER_SAMPLE,    /* board: mV nguồn xe / pin                (M4) */
    IVTS_EV_MOTION_IRQ,      /* board: IMU vượt ngưỡng                  (M4) */
    IVTS_EV_OTA_PROGRESS,    /* ota: tiến độ / kết quả                  (M11) */
    IVTS_EV_COUNT
} ivts_event_type_t;

typedef struct {
    uint8_t   type;      /* uint8_t, không enum trần: kích thước không phụ thuộc cỡ enum của compiler */
    ivts_ms_t ts_ms;
    union {
        struct { uint8_t link; int32_t err; }                  link_state;
        ivts_gnss_t                                            gnss;
        struct { uint32_t tx_id; uint8_t ok; int16_t err; }    mqtt_ack;
        struct { uint16_t len; }                               cmd_pending;
        struct { uint8_t op; int32_t err; }                    store_result;
        struct { uint32_t pending; }                           queue_ready;
        struct { int32_t err; }                                config_corrupt;
        struct { uint8_t connected; uint8_t elm_ready; uint8_t ecu; } obd_link;
        ivts_obd_sample_t                                      obd_sample;
        struct { uint16_t vehicle_mv; uint16_t device_mv; }    power;
        struct { uint8_t pin_level; }                          motion_irq;
        struct { uint8_t phase; uint8_t pct; int32_t err; }    ota_progress;
    } u;
} ivts_event_t;

_Static_assert(sizeof(ivts_event_t) <= IVTS_EVENT_MAX_SIZE, "ivts_event_t vuot ngan sach kich thuoc");

/* Non-blocking, copy theo giá trị, gọi từ task (KHÔNG từ ISR). Trả IVTS_ERR_FULL khi queue đầy. */
typedef ivts_err_t (*ivts_sink_fn)(void *ctx, const ivts_event_t *ev);
typedef struct { ivts_sink_fn fn; void *ctx; } ivts_sink_t;
static inline ivts_err_t ivts_sink_emit(const ivts_sink_t *s, const ivts_event_t *ev);
```

Nguồn nào dùng mẫu "ô + thông báo" thay vì nhét dữ liệu vào event: command (D2), bản ghi offline queue (`QUEUE_READY` + `storage_queue_peek_copy`), readiness/DTC (`OBD_DIAG_READY` + `obd_diag_copy`). Cùng một lý do: dữ liệu lớn hiếm gặp không được làm phình mọi item của queue app (32 item × 40 B = 1,25 KB).

### `tools/host_test.sh`

```bash
#!/usr/bin/env bash
# tools/host_test.sh [pattern]   — vd: ./tools/host_test.sh gnss
set -euo pipefail
cd "$(dirname "$0")/.."
CORE=components/ivts-core
OUT="$(mktemp -d)"; trap 'rm -rf "$OUT"' EXIT

# File "thuần" nằm ngoài ivts-core: được test trên host vì không include IDF (check_layers luật 8).
PURE_EXTRA=(
  components/modem/src/at_parser.c components/modem/src/at_engine.c components/modem/src/gnss_parse.c
  components/obd/src/elm327.c components/obd/src/obd_pid.c
)
CFLAGS=(-std=c11 -pedantic -Wall -Wextra -Werror -Wconversion -Wshadow
        -Wstrict-prototypes -Wmissing-prototypes
        -fsanitize=address,undefined -fno-sanitize-recover=all -g
        -I"$CORE/include" -Icomponents/modem/src -Icomponents/obd/src -Itests/host)

mapfile -t SRCS < <(find "$CORE/src" -name '*.c' | sort)
SRCS+=("${PURE_EXTRA[@]}")
fail=0
for t in tests/host/test_${1:-*}.c; do
    name="$(basename "$t" .c)"; echo "== $name"
    gcc "${CFLAGS[@]}" "$t" "${SRCS[@]}" -o "$OUT/$name"
    "$OUT/$name" || fail=1
done
exit $fail
```

`-fno-sanitize-recover=all` là bắt buộc: thiếu nó UBSan chỉ in cảnh báo rồi vẫn thoát 0. `minitest.h` giữ nguyên như bản trước (`CHECK`, `CHECK_EQ_U64`, `CHECK_STR`, `TEST_REPORT`).

### Kiểm chứng

- `./tools/host_test.sh base backoff config event civil`: `test_backoff` 5.024, `test_base` 97, `test_config` 52, `test_event` 112, `test_civil` 10 check, toàn pass.
- Hai đột biến đã thử: cap lại jitter như gốc thì `test_backoff` fail ở dòng "attempt 1000, seed 500 → 60500"; bỏ chặn `shift` thì UBSan báo `shift exponent 1000 is too large for 64-bit type`.
- Golden CRC32: `"123456789"` → `0xCBF43926`, 4 byte 0 → `0x2144DF1C` (đối chiếu `zlib.crc32`).

## 2. M3 — Composition root: `main`, `app_os.c`, `app_init.c`, Kconfig

`app` là component duy nhất biết mọi component khác. Nó tạo queue sự kiện, khởi tạo từng component theo thứ tự, đưa cho mỗi component cùng một `ivts_sink_t` và các số cấu hình (chân GPIO, APN, chu kỳ), rồi nối cổng D4. Component I/O không include nhau; chân `BOARD_PIN_*` nằm ở `board.h` nhưng chỉ `app_init.c` đọc và chép sang `modem_cfg_t`, `storage_cfg_t`.

### Luồng sự kiện

Mọi dữ liệu đi về app qua **một** queue (32 × `ivts_event_t`). Chiều ngược, app gọi hàm public của component; các hàm đó copy yêu cầu vào queue riêng của component rồi trả về ngay. Kết quả lại đi về bằng event. Không ai chờ ai, trừ hai ngoại lệ có chủ đích: `modem_http_*` (task ota chặn chờ modem) và các hàm NVS của storage (đồng bộ vì NVS thread-safe và hiếm gọi).

### `main/main.c`

```c
// main/CMakeLists.txt: idf_component_register(SRCS "main.c" PRIV_REQUIRES app)
#include "app/app.h"

void app_main(void)
{
    app_start();      /* trả về ngay; công việc nằm trong task "app" */
}
```

Vì `app_main` thoát ngay, `CONFIG_ESP_MAIN_TASK_STACK_SIZE` hạ về 4096 (gốc 12288). Stack lớn chuyển sang task `app`, nơi thật sự dựng payload. Project CMake đặt `set(COMPONENTS main)` để chỉ build cây phụ thuộc của `main`.

### `app_os.c`: queue, sink, task, bộ đếm drop

```c
#define APP_QUEUE_LEN   32
#define APP_TASK_PRIO   5
#define APP_TASK_STACK  6144

static QueueHandle_t s_q;
static volatile uint32_t s_drops;

static ivts_err_t sink_fn(void *ctx, const ivts_event_t *ev)
{
    (void)ctx;
    if (xQueueSend(s_q, ev, 0) == pdTRUE) {      /* timeout 0: component bị chặn vì app chậm là sai thiết kế */
        return IVTS_OK;
    }
    s_drops++;      /* nhiều task cùng tăng: sai số đếm chấp nhận được, đây chỉ là chẩn đoán */
    return IVTS_ERR_FULL;
}

bool app_os_init(void)        { s_q = xQueueCreate(APP_QUEUE_LEN, sizeof(ivts_event_t)); return s_q != NULL; }
ivts_sink_t app_sink(void)    { return (ivts_sink_t){ .fn = sink_fn, .ctx = NULL }; }
bool app_os_receive(ivts_event_t *ev, uint32_t timeout_ms)
{
    return xQueueReceive(s_q, ev, pdMS_TO_TICKS(timeout_ms)) == pdTRUE;
}
bool app_os_start_task(void (*fn)(void *))
{
    return xTaskCreate(fn, "app", APP_TASK_STACK, NULL, APP_TASK_PRIO, NULL) == pdPASS;
}
```

Sink gọi từ task của component (board, storage, modem, obd, ota), không từ ISR và không từ callback NimBLE. `xQueueSend` không dùng được trong ISR (phải là `xQueueSendFromISR`), đó là gốc của luật "callback không gọi từ ISR" và quyết định D1.

### Bảng task

| task        | prio | stack (B) | sở hữu                                                 | tạo ở          |
| ----------- | ---- | --------- | -------------------------------------------------------- | ---------------- |
| `modem`   | 6    | 6144      | UART1, SIM7600, ô publish/command                       | `modem_os.c`   |
| `app`     | 5    | 6144      | queue sự kiện, FSM, snapshot telemetry, buffer payload | `app_os.c`     |
| `obd`     | 4    | 4096      | phiên ELM327 (host task NimBLE do stack tạo)           | `obd_os.c`     |
| `storage` | 3    | 5120      | SD/FATFS, offline queue                                  | `storage_os.c` |
| `ota`     | 3    | 6144      | chỉ tồn tại khi đang tải                            | `ota_os.c`     |
| `board`   | 2    | 3072      | IMU IRQ, lấy mẫu ADC                                   | `board_os.c`   |

`modem` cao nhất: buffer RX UART 4 KB ở 115200 baud đầy sau khoảng 0,36 s, task phải rút kịp khi SIM7600 đổ URC dài. `board` thấp nhất: mẫu ADC trễ vài trăm ms không ảnh hưởng ignition (debounce 1,5 s). Số stack là điểm xuất phát; phần 11 đo high-water rồi chỉnh.

### `app_init.c`: thứ tự và chính sách lỗi

Thứ tự: **queue → board → storage → modem → obd → ota → task app**.

- Queue trước tiên: storage có thể phát `CONFIG_CORRUPT`/`STORE_RESULT` ngay trong lúc init.
- Board trước storage: `board_power_capture_wake()` phải đọc nguyên nhân thức sớm.
- Storage trước modem: modem cần APN, broker, device\_id từ config đã nạp.
- Storage trước obd: `nimble_port_init()` dùng NVS.
- App task cuối cùng: không xử lý sự kiện khi còn component chưa init. Sự kiện phát sớm nằm chờ trong queue.

| Lỗi                                     | Mức     | Xử lý                                         |
| ---------------------------------------- | -------- | ----------------------------------------------- |
| Không tạo được queue                | FATAL    | restart sau 10 s                                |
| `board_init` (I2C, ADC)                | FATAL    | không ADC = không ignition                    |
| NVS (`storage_init`)                   | FATAL    | không có config                               |
| `modem_init` (UART, task)              | FATAL    | thiết bị vô dụng nếu không có modem      |
| SD mount                                 | DEGRADED | không log SD, không offline queue             |
| IMU / RTC                                | DEGRADED | không cảnh báo motion / giờ không tin cậy |
| OBD (NimBLE)                             | DEGRADED | telemetry không có OBD                        |
| Config không hợp lệ (chưa provision) | DEGRADED | không bật link cloud; vẫn ghi offline queue  |

Restart sau 10 s khi FATAL có thể thành vòng lặp boot. Với image mới từ OTA, vòng lặp đó do rollback bắt (phần 10). Với image đã confirm, vòng lặp là lỗi phần cứng; log trên UART là nơi xem.

```c
/* Thuộc app_init.c: bọc modem_http_* vào ota_source_t (D4) */
static ivts_err_t src_open(void *ctx, const char *url, uint32_t *size, int *st) { (void)ctx; return modem_http_open(url, size, st); }
static ivts_err_t src_read(void *ctx, uint32_t off, uint8_t *b, size_t n, size_t *got) { (void)ctx; return modem_http_read(off, b, n, got); }
static void src_close(void *ctx) { (void)ctx; modem_http_close(); }

bool app_init_all(void)
{
    if (!app_os_init()) { ESP_LOGE(APP_TAG, "queue"); return false; }
    ivts_sink_t sink = app_sink();

    board_cfg_t bc = {
        .sink = sink, .power_sample_ms = CONFIG_IVTS_POWER_SAMPLE_MS,
        .imu_threshold = CONFIG_IVTS_IMU_THRESHOLD, .imu_enabled = true,
        .task_prio = PRIO_BOARD, .task_stack = 3072,
    };
    ivts_err_t e = board_init(&bc);
    if (e != IVTS_OK) { ESP_LOGE(APP_TAG, "board: %s", ivts_err_name(e)); return false; }

    storage_cfg_t sc = {
        .sink = sink,
#if CONFIG_IVTS_SD_ENABLE
        .sd_enabled = true,
        .log_file_max_bytes = CONFIG_IVTS_SD_LOG_FILE_MAX, .log_quota_bytes = CONFIG_IVTS_SD_LOG_QUOTA,
        .queue_segment_bytes = CONFIG_IVTS_QUEUE_SEGMENT_BYTES, .queue_max_segments = CONFIG_IVTS_QUEUE_MAX_SEGMENTS,
#endif
        .pin_clk = BOARD_PIN_SD_CLK, .pin_cmd = BOARD_PIN_SD_CMD, .pin_d0 = BOARD_PIN_SD_D0,
        .pin_d1 = BOARD_PIN_SD_D1, .pin_d2 = BOARD_PIN_SD_D2, .pin_d3 = BOARD_PIN_SD_D3, .pin_cd = BOARD_PIN_SD_CD,
        .task_prio = PRIO_STORAGE, .task_stack = 5120, .req_queue_len = 16,
    };
    e = storage_init(&sc);
    if (e != IVTS_OK) { ESP_LOGE(APP_TAG, "storage: %s", ivts_err_name(e)); return false; }

    (void)storage_config_load(&g_app.cfg);       /* hỏng -> defaults + CONFIG_CORRUPT đã vào queue */
    fill_deploy_defaults(&g_app.cfg);            /* ô trống lấy từ Kconfig; NVS thắng Kconfig */
    size_t bad = ivts_config_validate(&g_app.cfg, NULL, 0);
    app_apply_config();                          /* config -> ivts_axes_cfg_t + ivts_fsm_cfg_t */

    /* boot_id: thức từ deep sleep thì giữ (RTC ctx hợp lệ), boot nguội thì lấy số mới từ NVS. */
    uint32_t seq = 0;
    if (!app_rtc_ctx_load(&g_app.boot_id, &seq)) {
        if (storage_boot_id_next(&g_app.boot_id) != IVTS_OK) { g_app.boot_id = 0; }
        app_rtc_ctx_save(g_app.boot_id, 0, 0);
    }

    bool provisioned = (bad == 0u);
    modem_cfg_t mc = {
        .sink = sink, .uart_num = BOARD_MODEM_UART_NUM, .pin_tx = BOARD_PIN_MODEM_TX, .pin_rx = BOARD_PIN_MODEM_RX,
        .pin_pwrkey = BOARD_PIN_MODEM_PWRKEY, .pin_reset = BOARD_PIN_MODEM_RESET, .pwrkey_inverted = true,
        .baud = BOARD_MODEM_BAUD, .mqtt_port = g_app.cfg.mqtt_port, .gnss_period_s = CONFIG_IVTS_GNSS_PERIOD_S,
        .task_prio = PRIO_MODEM, .task_stack = 6144,
    };
    /* ... copy apn / host / user / pass / device_id bằng ivts_str_copy ... */
    if (ivts_str_copy(mc.client_id, sizeof mc.client_id, g_app.cfg.device_id) != IVTS_OK) {
        ESP_LOGE(APP_TAG, "device_id > %u ký tự, không làm MQTT client id được", (unsigned)MODEM_CLIENT_ID_MAX);
        provisioned = false;
    }
    if (!provisioned) { (void)ivts_str_copy(mc.client_id, sizeof mc.client_id, "unprovisioned"); }
    e = modem_init(&mc);
    if (e != IVTS_OK) { ESP_LOGE(APP_TAG, "modem: %s", ivts_err_name(e)); return false; }
    if (provisioned) { (void)modem_set_link(true); }

    obd_cfg_t oc = { .sink = sink, .poll_ms = CONFIG_IVTS_OBD_POLL_MS, .diag_period_s = 60,
                     .task_prio = PRIO_OBD, .task_stack = 4096 };
    (void)ivts_str_copy(oc.target_addr, sizeof oc.target_addr, g_app.cfg.obd_ble_addr);
    if (obd_init(&oc) != IVTS_OK) { ESP_LOGW(APP_TAG, "obd init lỗi: chạy không OBD"); }

    ota_cfg_t tc = { .sink = sink, .src = { .open = src_open, .read = src_read, .close = src_close, .ctx = NULL },
                     .task_prio = PRIO_OTA, .task_stack = 6144 };
    (void)ota_init(&tc);
    /* ... kiểm image PENDING_VERIFY: xem phần 10 ... */
    return true;
}
```

Một ràng buộc mới tìm ra ở đây: `AT+CMQTTACCQ` chỉ nhận clientID **1–23 byte** (AT manual MQTT SIM7600), trong khi `device_id` cho phép tới 31 ký tự. Cắt ngầm sẽ làm hai xe cùng tiền tố tranh nhau một session trên broker, nên `app_init` từ chối và để thiết bị ở trạng thái chưa provision. Nên hạ `IVTS_CFG_DEVICE_ID_SIZE` xuống 24 khi sửa `config.h` lần tới.

### `app.c`: `app_start()`

```c
void app_start(void)
{
    if (!app_init_all() || !app_os_start_task(app_task)) {
        ESP_LOGE(APP_TAG, "init lỗi không cứu được: restart sau 10 s");
        vTaskDelay(pdMS_TO_TICKS(10000));
        esp_restart();
    }
}
```

Vòng lặp `app_task` (rút hết queue → tick trục → FSM → thực thi action) nằm ở phần 9.

### `Kconfig.projbuild` (component `app`)

Thông tin triển khai (`IVTS_DEFAULT_DEVICE_ID`, `IVTS_DEFAULT_AUTH_TOKEN`, `IVTS_MQTT_HOST/PORT/USER/PASS`, `IVTS_APN`) và tham số vận hành (`IVTS_IGNITION_ON_HOLD_MS` = 1500, `IVTS_IGNITION_HYST_MV` = 500, `IVTS_POWER_SAMPLE_MS` = 500, `IVTS_IMU_THRESHOLD` = 8, `IVTS_GNSS_PERIOD_S` = 1, `IVTS_OBD_POLL_MS` = 1000, `IVTS_SD_ENABLE` + `IVTS_SD_LOG_FILE_MAX`, `IVTS_SD_LOG_QUOTA`, `IVTS_QUEUE_SEGMENT_BYTES`, `IVTS_QUEUE_MAX_SEGMENTS`). Các option SD có `depends on IVTS_SD_ENABLE`, nên tắt SD thì macro không tồn tại; `app_init.c` bọc bằng `#if CONFIG_IVTS_SD_ENABLE`.

```kconfig
menu "IVTS"
    menu "Triển khai (deployment)"
        config IVTS_DEFAULT_DEVICE_ID
            string "Device ID mặc định (<= 23 ký tự vì làm MQTT client id)"
            default ""
        config IVTS_MQTT_PORT
            int "MQTT broker port"
            range 1 65535
            default 1883
        # ... IVTS_DEFAULT_AUTH_TOKEN, IVTS_MQTT_HOST, IVTS_MQTT_USER, IVTS_MQTT_PASS, IVTS_APN
    endmenu
    config IVTS_IGNITION_ON_HOLD_MS
        int "Debounce ignition OFF->ON (ms)"
        range 0 10000
        default 1500
    config IVTS_SD_ENABLE
        bool "Dùng thẻ SD (log + offline queue)"
        default y
    config IVTS_QUEUE_MAX_SEGMENTS
        int "Số đoạn offline queue tối đa"
        depends on IVTS_SD_ENABLE
        range 2 4096
        default 256
endmenu
```

### `sdkconfig.defaults` dùng khi build thử

```
CONFIG_IDF_TARGET="esp32s3"
CONFIG_ESPTOOLPY_FLASHSIZE_16MB=y
CONFIG_PARTITION_TABLE_CUSTOM=y
CONFIG_PARTITION_TABLE_CUSTOM_FILENAME="partitions.csv"
CONFIG_BOOTLOADER_APP_ROLLBACK_ENABLE=y
CONFIG_ESP_MAIN_TASK_STACK_SIZE=4096
CONFIG_FREERTOS_HZ=1000
CONFIG_PM_ENABLE=y
CONFIG_FREERTOS_USE_TICKLESS_IDLE=y
CONFIG_BT_ENABLED=y
CONFIG_BT_NIMBLE_ENABLED=y
CONFIG_BT_NIMBLE_MAX_CONNECTIONS=1
CONFIG_BT_NIMBLE_ROLE_CENTRAL=y
CONFIG_BT_NIMBLE_ROLE_OBSERVER=y
CONFIG_BT_NIMBLE_ROLE_PERIPHERAL=n
CONFIG_BT_NIMBLE_ROLE_BROADCASTER=n
CONFIG_FATFS_LFN_HEAP=y
CONFIG_FREERTOS_WATCHPOINT_END_OF_STACK=y
```

Mọi option trên đã được IDF 6.1.1 nhận: sau `idf.py build`, `sdkconfig` chứa đúng các giá trị (đã grep). `partitions.csv` dùng khi build thử giữ bố cục gốc (factory + ota\_0 + ota\_1, mỗi app 1536K); hãy thay bằng bản M1 của bạn. `CONFIG_FREERTOS_WATCHPOINT_END_OF_STACK` dùng watchpoint phần cứng bắt tràn stack ngay tại lệnh ghi, hữu ích khi đang dò stack ở M12.

### Kiểm chứng

- **Build pass:** `idf.py build` với khung 6 component.
- **Chạy đúng trên board:** `idf.py -p rfc2217://<tablet-ip>:4000?ign_set_control flash monitor`. Log phải theo đúng thứ tự `board: init ok rtc=1 imu=1 wake=0` → `storage: init sd=1 pending=N` → `app: init xong boot_id=K provisioned=1 sd=1` → `modem: lte POWER -> SYNC`. Nâng `CONFIG_LOG_DEFAULT_LEVEL` lên DEBUG để thấy từng event.
- Reset bằng nút EN hai lần: `boot_id` tăng 1 mỗi lần (NVS). Thức từ deep sleep: `boot_id` giữ nguyên (RTC ctx).

## 3. M4 — `board`: I2C, DS3231M, LIS3DSH, ADC, power/sleep, task nhỏ (D1)

`board` sở hữu bus I2C (RTC + IMU chung bus GPIO1/2), ADC1 (GPIO3/4), chân INT của IMU và **mọi lời gọi `esp_sleep_*`**. Nó phát hai loại sự kiện: `POWER_SAMPLE` (định kỳ) và `MOTION_IRQ` (khi IMU vượt ngưỡng). Ignition không tính ở đây: debounce là luật nghiệp vụ, nằm trong `ivts-core/fsm/axes.c` (phần 9) để host test được.

```cmake
idf_component_register(
    SRCS "src/board.c" "src/board_i2c.c" "src/board_rtc.c" "src/board_imu.c"
         "src/board_adc.c" "src/board_power.c" "src/board_os.c"
    INCLUDE_DIRS "include"
    REQUIRES ivts-core
    PRIV_REQUIRES esp_driver_i2c esp_driver_gpio esp_adc esp_pm esp_timer
)
```

### `board.h`

```c
/* Pin map (nguồn: pin_map.h repo gốc). Chỉ là số; component khác KHÔNG include board.h — app_init.c chép số vào cfg của chúng. */
#define BOARD_PIN_I2C_SDA        2
#define BOARD_PIN_I2C_SCL        1
#define BOARD_PIN_IMU_INT1       36   /* INT1 nối chân vật lý 41 của ESP32-S3. */
#define BOARD_PIN_ADC_VEHICLE    3    /* ADC1, chia áp 11:1 */
#define BOARD_PIN_ADC_DEVICE     4
#define BOARD_PIN_MODEM_TX       17
#define BOARD_PIN_MODEM_RX       18
#define BOARD_PIN_MODEM_PWRKEY   34   /* GPIO33..37: kiểm module có octal PSRAM không */
#define BOARD_PIN_MODEM_RESET    35
#define BOARD_PIN_SD_CLK 10
#define BOARD_PIN_SD_CMD 9
#define BOARD_PIN_SD_D0 11
#define BOARD_PIN_SD_D1 12
#define BOARD_PIN_SD_D2 7
#define BOARD_PIN_SD_D3 8
#define BOARD_PIN_SD_CD 13
#define BOARD_MODEM_UART_NUM 1
#define BOARD_MODEM_BAUD     115200

typedef struct {
    ivts_sink_t sink;
    uint16_t    power_sample_ms;   /* chu kỳ phát IVTS_EV_POWER_SAMPLE */
    uint8_t     imu_threshold;     /* THRS1_1 thô (LIS3DSH, FS ±2g) — chỉnh trên bàn đo */
    bool        imu_enabled;
    uint8_t     task_prio;
    uint32_t    task_stack;
} board_cfg_t;

typedef enum { BOARD_WAKE_POWER_ON = 0, BOARD_WAKE_TIMER, BOARD_WAKE_IMU, BOARD_WAKE_OTHER } board_wake_t;
typedef struct { bool deep; uint32_t seconds; bool arm_imu; } board_sleep_req_t;

ivts_err_t board_init(const board_cfg_t *cfg);   /* lỗi IMU/RTC không làm hỏng init */
ivts_err_t board_time_get(uint64_t *unix_ms, bool *trusted);
ivts_err_t board_time_set(uint64_t unix_ms);     /* ghi giờ + xoá OSF */
ivts_err_t board_power_read(uint16_t *vehicle_mv, uint16_t *device_mv);
bool board_imu_ok(void);
bool board_rtc_ok(void);
bool board_motion_deep_wake_capable(void);       /* esp_sleep_is_valid_wakeup_gpio(INT) */
board_wake_t board_wake_cause(void);             /* của lần boot này */
board_wake_t board_sleep(const board_sleep_req_t *req);   /* light: trả lý do thức; deep: không trả về */
uint64_t board_uptime_ms(void);
```

### D1: `board_os.c` — mutex I2C và task nhỏ

ISR của IMU không được gọi sink (sink dùng `xQueueSend`, không phải bản FromISR) và cũng không đọc I2C được (driver I2C chặn). Nên ISR chỉ `vTaskNotifyGiveFromISR`, task `board` làm phần còn lại. Task này dùng luôn timeout của `ulTaskNotifyTake` làm nhịp lấy mẫu ADC, nên không cần timer riêng.

```c
static SemaphoreHandle_t s_i2c_mutex;
static TaskHandle_t s_task;
static board_cfg_t s_cfg;

void IRAM_ATTR board_os_notify_imu_from_isr(void)
{
    BaseType_t woken = pdFALSE;
    if (s_task != NULL) { vTaskNotifyGiveFromISR(s_task, &woken); }
    portYIELD_FROM_ISR(woken);
}

static void board_task(void *arg)
{
    for (;;) {
        uint32_t n = ulTaskNotifyTake(pdTRUE, pdMS_TO_TICKS(s_cfg.power_sample_ms));
        ivts_event_t ev = { .ts_ms = board_uptime_ms() };
        if (n > 0u && board_imu_ok()) {
            uint8_t outs = 0;
            (void)board_imu_clear(&outs);                 /* đọc OUTS1 qua I2C: việc của task, không của ISR */
            ev.type = IVTS_EV_MOTION_IRQ;
            ev.u.motion_irq.pin_level = (uint8_t)board_imu_int_level();
            (void)ivts_sink_emit(&s_cfg.sink, &ev);
            continue;
        }
        uint16_t veh = 0, dev = 0;
        if (board_power_read(&veh, &dev) == IVTS_OK) {
            ev.type = IVTS_EV_POWER_SAMPLE;
            ev.u.power.vehicle_mv = veh;
            ev.u.power.device_mv = dev;
            (void)ivts_sink_emit(&s_cfg.sink, &ev);       /* FULL: app đếm drop, board không retry */
        }
    }
}

esp_err_t board_os_init(const board_cfg_t *cfg)  /* mutex TRƯỚC mọi truy cập I2C */
{
    s_cfg = *cfg;
    s_i2c_mutex = xSemaphoreCreateMutex();
    ESP_RETURN_ON_FALSE(s_i2c_mutex != NULL, ESP_ERR_NO_MEM, BOARD_TAG, "mutex");
    return ESP_OK;
}

esp_err_t board_os_start(void)   /* gọi CUỐI board_init: task chạy ngay và đọc ADC ở lần hết hạn đầu */
{
    BaseType_t ok = xTaskCreate(board_task, "board", s_cfg.task_stack, NULL, s_cfg.task_prio, &s_task);
    ESP_RETURN_ON_FALSE(ok == pdPASS, ESP_ERR_NO_MEM, BOARD_TAG, "task");
    return ESP_OK;
}
```

Bản nháp đầu tạo task ngay trong `board_os_init`. Task đó đọc ADC sau `power_sample_ms` trong khi `board_adc_init` có thể chưa chạy, tức dùng handle NULL. Tách `init`/`start` là để loại bỏ race đó.

Mutex I2C cần vì bus có hai người dùng thật: task `board` (đọc OUTS1) và task `app` (gọi `board_time_get` khi dựng payload, `board_time_set` khi đồng bộ giờ từ GNSS). Driver I2C mới có khoá trong từng transaction, nhưng "ghi địa chỉ thanh ghi rồi đọc" của ta có thể là hai lần gọi API, và đọc đủ 7 thanh ghi giờ DS3231M cũng phải liền một mạch.

### `board_i2c.c` — driver I2C mới (`esp_driver_i2c`)

```c
esp_err_t board_i2c_init(void)
{
    i2c_master_bus_config_t cfg = {
        .i2c_port = 0,
        .sda_io_num = BOARD_PIN_I2C_SDA,
        .scl_io_num = BOARD_PIN_I2C_SCL,
        .clk_source = I2C_CLK_SRC_DEFAULT,
        .glitch_ignore_cnt = 7,
        .flags.enable_internal_pullup = true,
    };
    return i2c_new_master_bus(&cfg, &s_bus);
}

esp_err_t board_i2c_read(board_dev_t dev, uint8_t reg, uint8_t *buf, size_t n)
{
    ESP_RETURN_ON_FALSE(s_dev[dev] != NULL, ESP_ERR_INVALID_STATE, BOARD_TAG, "dev %d chưa add", (int)dev);
    if (!board_i2c_lock(100)) { return ESP_ERR_TIMEOUT; }
    esp_err_t e = i2c_master_transmit_receive(s_dev[dev], &reg, 1, buf, n, 50);   /* repeated start */
    board_i2c_unlock();
    return e;
}
```

Chữ ký đã kiểm trong `esp_driver_i2c/include/driver/i2c_master.h` của 6.1.1: `i2c_master_transmit_receive(dev, wbuf, wlen, rbuf, rlen, int xfer_timeout_ms)`. Mỗi thiết bị là một `i2c_master_dev_handle_t` với tốc độ riêng (RTC 100 kHz, IMU 400 kHz); driver tự đổi clock giữa các transaction.

### `board_rtc.c` — DS3231M

Thanh ghi 00h–06h là giờ BCD, 0Fh là status (bit7 OSF = dao động từng dừng). `trusted = !OSF && giờ ≥ 2024-01-01`.

```c
ivts_err_t board_time_get(uint64_t *unix_ms, bool *trusted)
{
    uint8_t r[7], st = 0;
    esp_err_t e = board_i2c_read(BOARD_DEV_RTC, 0x00, r, sizeof r);   /* đọc 7 byte một mạch: không dính lúc sang phút */
    if (e == ESP_OK) { e = board_i2c_read(BOARD_DEV_RTC, 0x0F, &st, 1); }
    if (e != ESP_OK) { return board_err(e); }
    uint8_t hour;
    if (r[2] & 0x40u) {                               /* chế độ 12 giờ: bit5 = PM */
        hour = bcd2bin(r[2] & 0x1Fu) % 12u;
        if (r[2] & 0x20u) { hour = (uint8_t)(hour + 12u); }
    } else {
        hour = bcd2bin(r[2] & 0x3Fu);
    }
    ivts_civil_t c = {
        .year = (uint16_t)(2000u + bcd2bin(r[6])), .month = bcd2bin(r[5] & 0x1Fu), .day = bcd2bin(r[4] & 0x3Fu),
        .hour = hour, .min = bcd2bin(r[1] & 0x7Fu), .sec = bcd2bin(r[0] & 0x7Fu), .ms = 0,
    };
    if (ivts_civil_to_unix_ms(&c, unix_ms) != IVTS_OK) { *unix_ms = 0; *trusted = false; return IVTS_OK; }
    *trusted = ((st & 0x80u) == 0u) && (*unix_ms >= 1704067200000ull);
    return IVTS_OK;
}
```

`board_time_set` ghi 7 thanh ghi giờ trước, xoá OSF sau. Mất nguồn giữa hai lệnh thì OSF vẫn bật, lần sau vẫn coi là "không tin". Đảo thứ tự thì có thể ra giờ sai nhưng được đánh dấu tin cậy, tệ hơn nhiều. Nguồn giờ để set là GNSS: `app_state.c` gọi `board_time_set(gnss.ts_unix_ms)` khi có fix mà RTC chưa tin cậy.

### `board_imu.c` — LIS3DSH bằng state machine SM1

Ngắt motion của LIS3DSH không nằm ở `INT1_CFG` như LIS3DH, mà là một chương trình nhỏ cho SM1. Các thanh ghi theo datasheet (DocID022405): `CTRL_REG4` 20h (ODR/BDU/XYZ), `CTRL_REG1` 21h (SM1\_EN bit0, SM1\_PIN bit3), `CTRL_REG3` 23h (IEA bit6, IEL bit5, INT1\_EN bit3), `ST1_x` 40h.., `THRS1_1` 57h, `MASK1_B` 59h, `MASK1_A` 5Ah, `SETT1` 5Bh, `OUTS1` 5Fh. Mã lệnh state (`0x05` = NOP|GNTH1, `0x11` = CONT) lấy từ AN3393 qua các ví dụ trên ST Community; phải xác nhận trên bàn.

```c
esp_err_t board_imu_init(uint8_t threshold)
{
    uint16_t addr = board_i2c_probe(0x1D) ? 0x1D : board_i2c_probe(0x1E) ? 0x1E : 0;
    ESP_RETURN_ON_FALSE(addr != 0, ESP_ERR_NOT_FOUND, BOARD_TAG, "LIS3DSH không trả lời 0x1D/0x1E");
    ESP_RETURN_ON_ERROR(board_i2c_add(BOARD_DEV_IMU, addr, 400000), BOARD_TAG, "add imu");
    uint8_t id = 0;
    ESP_RETURN_ON_ERROR(board_i2c_read(BOARD_DEV_IMU, 0x0F, &id, 1), BOARD_TAG, "who_am_i");
    ESP_RETURN_ON_FALSE(id == 0x3F, ESP_ERR_NOT_SUPPORTED, BOARD_TAG, "WHO_AM_I=0x%02x (cần 0x3F)", id);

    ESP_RETURN_ON_ERROR(wr(LIS_CTRL1, 0x00), BOARD_TAG, "sm1 off");     /* tắt SM trong lúc lập trình */
    ESP_RETURN_ON_ERROR(wr(LIS_CTRL4, 0x47), BOARD_TAG, "ctrl4");       /* 25 Hz, XYZ: đủ cho xe, ít dòng hơn 100 Hz */
    ESP_RETURN_ON_ERROR(wr(LIS_CTRL5, 0x00), BOARD_TAG, "ctrl5");       /* ±2g */
    vTaskDelay(pdMS_TO_TICKS(100));

    uint8_t mask = mask_without_gravity();                               /* xem dưới */
    ESP_RETURN_ON_ERROR(wr(LIS_THRS1_1, threshold), BOARD_TAG, "thrs1");
    ESP_RETURN_ON_ERROR(wr(LIS_MASK1_B, mask), BOARD_TAG, "mask_b");
    ESP_RETURN_ON_ERROR(wr(LIS_MASK1_A, mask), BOARD_TAG, "mask_a");
    ESP_RETURN_ON_ERROR(wr(LIS_ST1_1, 0x05), BOARD_TAG, "st1_1");       /* chờ: một trục trong mask vượt THRS1 */
    ESP_RETURN_ON_ERROR(wr(LIS_ST1_2, 0x11), BOARD_TAG, "st1_2");       /* CONT: phát ngắt, quay về ST1_1 */
    ESP_RETURN_ON_ERROR(wr(LIS_SETT1, 0x01), BOARD_TAG, "sett1");       /* SITR */
    ESP_RETURN_ON_ERROR(wr(LIS_CTRL3, 0x48), BOARD_TAG, "ctrl3");       /* active high, INT1_EN, chốt */

    gpio_config_t io = {
        .pin_bit_mask = 1ULL << BOARD_PIN_IMU_INT1, .mode = GPIO_MODE_INPUT,
        .pull_down_en = GPIO_PULLDOWN_ENABLE, .intr_type = GPIO_INTR_POSEDGE,
    };
    ESP_RETURN_ON_ERROR(gpio_config(&io), BOARD_TAG, "gpio int");
    esp_err_t e = gpio_install_isr_service(0);
    ESP_RETURN_ON_FALSE(e == ESP_OK || e == ESP_ERR_INVALID_STATE, e, BOARD_TAG, "isr service");
    ESP_RETURN_ON_ERROR(gpio_isr_handler_add(BOARD_PIN_IMU_INT1, imu_isr, NULL), BOARD_TAG, "isr add");

    ESP_RETURN_ON_ERROR(wr(LIS_CTRL1, 0x01), BOARD_TAG, "sm1 on");      /* bật SM1 cuối cùng */
    uint8_t outs;
    return board_imu_clear(&outs);
}
```

Chi tiết dễ bỏ qua: so sánh `GNTH1` trên một trục đang chịu trọng lực (\~1g) với ngưỡng nhỏ hơn 1g sẽ ngắt liên tục. Ngược lại, đặt ngưỡng trên 1g (như một số ví dụ trên ST Community) thì xe bị đẩy ngang gần như không bao giờ kích. `mask_without_gravity()` đọc một mẫu lúc init, tìm trục có |a| lớn nhất và loại nó khỏi mask; lắp thiết bị nghiêng thì vẫn đúng. Đơn vị của `THRS1_1` datasheet không nói rõ. Các ví dụ cộng đồng dùng khoảng 16 mg/LSB ở ±2g, nên default 8 ≈ 0,13g. Cần đo.

Đọc `OUTS1` để nhả ngắt chốt: datasheet chỉ nói "read action of this register ... affects SM1 interrupt functions". Đây là việc phải xác nhận đầu tiên trên board (phần 11).

### `board_adc.c` — `esp_adc` oneshot + curve fitting

```c
#define DIVIDER            11u
#define GAIN_VEHICLE_PPM   1020070u     /* 1.02007 của repo gốc, viết dạng ppm để khỏi float */
#define GAIN_DEVICE_PPM    1019950u     /* 1.01995 */

static esp_err_t chan_init(int gpio, uint32_t gain_ppm, chan_t *c)
{
    adc_unit_t unit;
    ESP_RETURN_ON_ERROR(adc_oneshot_io_to_channel(gpio, &unit, &c->ch), BOARD_TAG, "io->ch %d", gpio);
    ESP_RETURN_ON_FALSE(unit == ADC_UNIT_1, ESP_ERR_INVALID_ARG, BOARD_TAG, "gpio %d không ở ADC1", gpio);
    adc_oneshot_chan_cfg_t cc = { .atten = ADC_ATTEN_DB_12, .bitwidth = ADC_BITWIDTH_DEFAULT };
    ESP_RETURN_ON_ERROR(adc_oneshot_config_channel(s_unit, c->ch, &cc), BOARD_TAG, "cfg ch");
    adc_cali_curve_fitting_config_t cal = {
        .unit_id = ADC_UNIT_1, .chan = c->ch, .atten = ADC_ATTEN_DB_12, .bitwidth = ADC_BITWIDTH_DEFAULT,
    };
    /* Không có eFuse hiệu chuẩn thì báo lỗi, KHÔNG lặng lẽ dùng công thức danh định như gốc:
     * sai vài trăm mV ở 12 V là đủ lật ignition. */
    ESP_RETURN_ON_ERROR(adc_cali_create_scheme_curve_fitting(&cal, &c->cali), BOARD_TAG, "cali ch%d", (int)c->ch);
    c->gain_ppm = gain_ppm;
    return ESP_OK;
}

static esp_err_t read_mv(const chan_t *c, uint16_t *out)
{
    int sum = 0;
    for (int i = 0; i < 8; i++) {
        int raw = 0, mv = 0;
        ESP_RETURN_ON_ERROR(adc_oneshot_read(s_unit, c->ch, &raw), BOARD_TAG, "read");
        ESP_RETURN_ON_ERROR(adc_cali_raw_to_voltage(c->cali, raw, &mv), BOARD_TAG, "cali");
        sum += mv;
    }
    uint64_t v = (uint64_t)(sum / 8) * DIVIDER * c->gain_ppm / 1000000u;
    *out = (v > UINT16_MAX) ? UINT16_MAX : (uint16_t)v;
    return ESP_OK;
}
```

`adc_oneshot_io_to_channel()` suy kênh từ số GPIO thay vì hard-code `ADC_CHANNEL_2` như gốc. Đổi chân thì code tự đúng, và chọn nhầm chân ADC2 (bị Wi-Fi chiếm) thì init báo lỗi. Mục "Thread Safety" trong tài liệu ADC oneshot của IDF ghi `adc_oneshot_read` thread-safe, nên task board lấy mẫu và app gọi `board_power_read` (kiểm pin trước OTA) không cần khoá thêm.

### `board_power.c` — PM và sleep

```c
static board_wake_t map_causes(uint32_t causes)
{
    /* esp_sleep_get_wakeup_cause() deprecated ở 6.1: dùng bitmap, nhiều nguồn có thể thức cùng lúc.
     * Timer và GPIO trùng nhau thì IMU quan trọng hơn. */
    if (causes & (BIT(ESP_SLEEP_WAKEUP_GPIO) | BIT(ESP_SLEEP_WAKEUP_EXT0) | BIT(ESP_SLEEP_WAKEUP_EXT1))) {
        return BOARD_WAKE_IMU;
    }
    if (causes & BIT(ESP_SLEEP_WAKEUP_TIMER)) { return BOARD_WAKE_TIMER; }
    return (causes == 0u || causes == BIT(ESP_SLEEP_WAKEUP_UNDEFINED)) ? BOARD_WAKE_POWER_ON : BOARD_WAKE_OTHER;
}

esp_err_t board_power_init(void)
{
#if CONFIG_PM_ENABLE
    /* Auto light sleep khi rảnh. Component cần UART/BLE chạy liên tục tự giữ esp_pm_lock
     * (modem_os.c giữ ESP_PM_NO_LIGHT_SLEEP khi modem bật). */
    esp_pm_config_t pm = { .max_freq_mhz = CONFIG_ESP_DEFAULT_CPU_FREQ_MHZ, .min_freq_mhz = 40, .light_sleep_enable = true };
    return esp_pm_configure(&pm);
#else
    return ESP_OK;
#endif
}

board_wake_t board_sleep(const board_sleep_req_t *req)
{
    (void)esp_sleep_disable_wakeup_source(ESP_SLEEP_WAKEUP_ALL);
    (void)esp_sleep_enable_timer_wakeup((uint64_t)req->seconds * 1000000u);
    bool imu = req->arm_imu && board_imu_ok();
    if (imu && board_imu_int_level() == 1) {
        board_os_notify_imu();               /* Task board đọc OUTS1 để nhả ngắt. */
        return BOARD_WAKE_IMU;
    }
    if (req->deep) {
        if (imu && board_motion_deep_wake_capable()) {
            (void)esp_sleep_enable_ext1_wakeup_io(1ULL << BOARD_PIN_IMU_INT1, ESP_EXT1_WAKEUP_ANY_HIGH);
        } else if (imu) {
            ESP_LOGW(BOARD_TAG, "INT IMU gpio%d không phải RTC GPIO: deep sleep chỉ thức theo timer", BOARD_PIN_IMU_INT1);
        }
        esp_deep_sleep_start();               /* không trả về */
    }
    const gpio_num_t imu_gpio = (gpio_num_t)BOARD_PIN_IMU_INT1;
    esp_err_t e = ESP_OK;
    if (imu) {
        (void)gpio_intr_disable(imu_gpio);
        e = gpio_wakeup_enable(imu_gpio, GPIO_INTR_HIGH_LEVEL);
        if (e == ESP_OK) { e = esp_sleep_enable_gpio_wakeup(); }
    }
    if (e == ESP_OK) { e = esp_light_sleep_start(); }
    if (imu) {
        (void)gpio_wakeup_disable(imu_gpio);
        (void)gpio_set_intr_type(imu_gpio, GPIO_INTR_POSEDGE);
        (void)gpio_intr_enable(imu_gpio);
    }
    if (e != ESP_OK) {
        if (imu && board_imu_int_level() == 1) {
            board_os_notify_imu();
            return BOARD_WAKE_IMU;
        }
        return BOARD_WAKE_OTHER;
    }
    board_wake_t w = map_causes(esp_sleep_get_wakeup_causes());
    if (w == BOARD_WAKE_IMU) { board_os_notify_imu(); }   /* task board đọc OUTS1, phát MOTION_IRQ */
    return w;
}
```

GPIO36 không phải RTC GPIO nên nhánh `ext1` trên không bao giờ chạy trên board hiện tại. Code vẫn giữ để board rev sau (INT đi về GPIO ≤ 21) chỉ cần đổi `BOARD_PIN_IMU_INT1`. `ext1` thay `ext0` vì ext0 cần RTC IO giữ nguồn RTC periph suốt giấc ngủ, tốn dòng hơn; cả hai đều có trong `esp_sleep.h` 6.1.1. `gpio_wakeup_enable` đổi kiểu ngắt của chân sang mức, nên sau khi thức phải trả về `POSEDGE`. Thiếu bước này, ISR sẽ bắn liên tục chừng nào chân còn cao.

### Kiểm chứng

- **Build pass:** đã có. `check_layers` luật 7a xác nhận chỉ `board_power.c` gọi `esp_sleep_*`.
- **Trên board** (chưa chạy):
  1. Log `board: init ok rtc=1 imu=1`. `imu=0` kèm `WHO_AM_I=0x33` nghĩa là chip thật là LIS3DH, phải viết nhánh riêng.
  2. Gõ nhẹ vào vỏ: log app `MOTION_IRQ` đúng một lần mỗi cú gõ. Ngắt dồn dập lên tục thì kiểm mask trọng lực, còn chỉ đúng một lần rồi im thì đọc OUTS1 không nhả chốt. Đo bằng logic analyzer trên GPIO36.
  3. Nguồn bàn 12,00 V và 14,00 V vào đầu chia áp: `vehicle_mv` trong `POWER_SAMPLE` sai dưới ±50 mV. Nếu lệch cố định thì hiệu chuẩn lại `GAIN_*_PPM`.
  4. RTC: tháo pin backup → boot → `trusted=0` → có GNSS fix → log `RTC <- GNSS` → reset → `trusted=1`.
  5. Light sleep 60 s: dòng vào board giảm rõ; lắc thiết bị thì log `woke 2` (motion) trước khi hết 60 s.

## 4. M5 — `storage`: NVS blob, SD/FATFS log, task + queue yêu cầu

`storage` có hai nửa với hai kiểu đồng bộ khác nhau, và đó là quyết định chính của phần này:

- **NVS: đồng bộ.** NVS của IDF thread-safe, và config/boot\_id/OTA context chỉ đọc ghi lúc boot hoặc khi cloud đổi config. Đưa qua queue sẽ bắt app chờ một event kết quả cho thao tác hiếm và nhanh (vài ms tới vài chục ms).
- **SD: bất đồng bộ qua task `storage`.** FATFS ghi có thể mất 10–100 ms (cập nhật FAT, thẻ bận xóa block). App chạy FSM 200 ms/tick không được chờ thẻ. Ngoài ra chỉ một task đụng file thì không phải lo hai task cùng ghi một file.

```cmake
idf_component_register(
    SRCS "src/storage.c" "src/storage_nvs.c" "src/storage_sd.c" "src/storage_queue.c" "src/storage_os.c"
    INCLUDE_DIRS "include"
    REQUIRES ivts-core
    PRIV_REQUIRES nvs_flash fatfs sdmmc esp_driver_sdmmc vfs esp_timer
)
```

### `storage.h`

```c
typedef struct {
    ivts_sink_t sink;
    bool        sd_enabled;
    int         pin_clk, pin_cmd, pin_d0, pin_d1, pin_d2, pin_d3, pin_cd;   /* -1 = không dùng */
    uint32_t    log_file_max_bytes;     /* xoay file log khi vượt */
    uint32_t    log_quota_bytes;        /* tổng log tối đa, xoá file cũ nhất khi vượt */
    uint32_t    queue_segment_bytes;    /* M8 */
    uint16_t    queue_max_segments;     /* M8 */
    uint8_t     task_prio;
    uint32_t    task_stack;
    uint8_t     req_queue_len;
} storage_cfg_t;

/* Mount SD lỗi KHÔNG làm init lỗi: storage_sd_ok() = false, app chạy degraded. */
ivts_err_t storage_init(const storage_cfg_t *cfg);
bool storage_sd_ok(void);

/* ---- NVS: đồng bộ ---- */
/* CRC/VERSION: *out = defaults + phát CONFIG_CORRUPT. NOT_FOUND: máy mới, defaults, KHÔNG phát. */
ivts_err_t storage_config_load(ivts_config_t *out);
ivts_err_t storage_config_save(const ivts_config_t *cfg);   /* từ chối config không qua validate */
ivts_err_t storage_boot_id_next(uint32_t *out);
ivts_err_t storage_ota_pending_load(ivts_ota_pending_t *out);         /* M11 */
ivts_err_t storage_ota_pending_save(const ivts_ota_pending_t *p);

/* ---- SD: bất đồng bộ. FULL khi queue yêu cầu đầy. Lỗi về qua STORE_RESULT; thành công thì im lặng. ---- */
#define STORAGE_LOG_LINE_MAX 160u
ivts_err_t storage_log_append(const char *line);
/* ---- Offline queue (M8, phần 7) ---- */
ivts_err_t storage_queue_push(const uint8_t *rec, size_t len);
ivts_err_t storage_queue_request_peek(void);
ivts_err_t storage_queue_peek_copy(uint8_t *out, size_t cap, size_t *len, uint32_t *token);
ivts_err_t storage_queue_pop(uint32_t token);
uint32_t   storage_queue_pending(void);
```

"Thành công thì im lặng" là quyết định có chủ ý: mỗi giây khi offline có một `queue_push`, phát `STORE_RESULT` cho mỗi lần sẽ chiếm queue app vô ích.

### `storage_nvs.c` — config là MỘT blob có header

NVS bảo đảm nguyên tử **cho từng key**, không cho nhiều key. Chia config thành 20 key thì mất nguồn giữa lúc ghi sẽ ra config nửa cũ nửa mới. Từng key vẫn hợp lệ nên không CRC nào bắt được. Một blob `{header, payload}` ghi bằng một `nvs_set_blob` thì hoặc có bản cũ, hoặc có bản mới.

```c
#define BLOB_MAGIC  0x49565453u     /* "IVTS" */
#define CFG_VERSION 1u              /* đổi layout ivts_config_t thì tăng số này */

typedef struct {
    uint32_t magic;
    uint16_t version;
    uint16_t len;        /* sizeof payload: bắt cả trường hợp struct đổi size mà quên tăng version */
    uint32_t crc;        /* CRC32 của payload */
} blob_hdr_t;

esp_err_t storage_nvs_init(void)
{
    esp_err_t e = nvs_flash_init();
    if (e == ESP_ERR_NVS_NO_FREE_PAGES || e == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        /* Tài liệu NVS yêu cầu erase rồi init lại cho đúng hai lỗi này. Mất config -> về default. */
        e = nvs_flash_erase();
        if (e == ESP_OK) { e = nvs_flash_init(); }
    }
    return e;
}

/* NOT_FOUND / VERSION / CRC phân biệt được để app biết máy mới hay dữ liệu hỏng. */
static ivts_err_t blob_load(const char *key, uint16_t ver, void *payload, size_t len)
{
    uint8_t buf[sizeof(blob_hdr_t) + 600];
    size_t n = sizeof buf;
    nvs_handle_t nh;
    esp_err_t e = nvs_open("ivts", NVS_READONLY, &nh);
    if (e == ESP_ERR_NVS_NOT_FOUND) { return IVTS_ERR_NOT_FOUND; }   /* namespace chưa có */
    if (e != ESP_OK) { return IVTS_ERR_IO; }
    e = nvs_get_blob(nh, key, buf, &n);
    nvs_close(nh);
    if (e == ESP_ERR_NVS_NOT_FOUND) { return IVTS_ERR_NOT_FOUND; }
    if (e != ESP_OK) { return IVTS_ERR_IO; }
    blob_hdr_t h;
    if (n < sizeof h) { return IVTS_ERR_CRC; }
    memcpy(&h, buf, sizeof h);
    if (h.magic != BLOB_MAGIC) { return IVTS_ERR_CRC; }
    if (h.version != ver || h.len != len || n != sizeof h + len) { return IVTS_ERR_VERSION; }
    if (ivts_crc32(0, buf + sizeof h, len) != h.crc) { return IVTS_ERR_CRC; }
    memcpy(payload, buf + sizeof h, len);
    return IVTS_OK;
}

ivts_err_t storage_config_load(ivts_config_t *out)
{
    ivts_err_t r = blob_load("cfg", CFG_VERSION, out, sizeof *out);
    if (r != IVTS_OK) {
        ivts_config_defaults(out);
        if (r != IVTS_ERR_NOT_FOUND) {              /* máy mới không phải là hỏng */
            ivts_event_t ev = { .type = IVTS_EV_CONFIG_CORRUPT, .ts_ms = (uint64_t)esp_timer_get_time() / 1000u };
            ev.u.config_corrupt.err = (int32_t)r;
            storage_emit(&ev);
        }
    }
    return r;
}

ivts_err_t storage_config_save(const ivts_config_t *cfg)
{
    if (ivts_config_validate(cfg, NULL, 0) != 0u) { return IVTS_ERR_INVALID_ARG; }   /* không lưu config sai */
    return storage_err(blob_save("cfg", CFG_VERSION, cfg, sizeof *cfg));
}
```

Đánh đổi cần biết: blob chứa **struct C thô**. Cùng CPU và cùng compiler thì layout ổn định, nhưng thêm một field là đổi layout. `len` bắt được việc quên tăng `CFG_VERSION` trong phần lớn trường hợp. Khi cần giữ config qua nâng cấp firmware (OTA từ v1 lên v2), viết hàm migrate theo `version`, hoặc mã hoá tường minh như record ở phần 7. Hiện tại version lệch thì về default rồi Kconfig điền lại phần triển khai.

`storage_boot_id_next()` đọc, tăng, ghi key `boot` (u32) rồi `nvs_commit`. Nó chỉ được gọi khi boot nguội, không phải mỗi lần thức từ deep sleep, để không ghi NVS 720 lần/ngày với heartbeat 120 s.

### `storage_sd.c` — mount và log xoay vòng

IDF 6.1 có driver SD host mới (`sd_host_sdmmc.h`), nhưng hàm tiện ích FATFS `esp_vfs_fat_sdmmc_mount()` vẫn nhận `sdmmc_host_t` của API cũ (nằm trong `esp_driver_sdmmc/legacy/`, không đánh dấu deprecated). Đường ngắn nhất tới FATFS hiện vẫn là nó.

```c
esp_err_t storage_sd_mount(void)
{
    const storage_cfg_t *c = &g_storage_cfg;
    sdmmc_host_t host = SDMMC_HOST_DEFAULT();
    sdmmc_slot_config_t slot = SDMMC_SLOT_CONFIG_DEFAULT();
    slot.width = 4;
    slot.clk = (gpio_num_t)c->pin_clk;
    slot.cmd = (gpio_num_t)c->pin_cmd;
    slot.d0 = (gpio_num_t)c->pin_d0;
    slot.d1 = (gpio_num_t)c->pin_d1;
    slot.d2 = (gpio_num_t)c->pin_d2;
    slot.d3 = (gpio_num_t)c->pin_d3;
    slot.cd = (c->pin_cd >= 0) ? (gpio_num_t)c->pin_cd : SDMMC_SLOT_NO_CD;
    slot.flags |= SDMMC_SLOT_FLAG_INTERNAL_PULLUP;   /* chỉ để chạy thử; board thật cần trở kéo 10k */

    esp_vfs_fat_sdmmc_mount_config_t mc = {
        .format_if_mount_failed = false,   /* KHÔNG tự format: thẻ hỏng để người xem, không xoá dữ liệu */
        .max_files = 4,
        .allocation_unit_size = 16 * 1024,
    };
    esp_err_t e = esp_vfs_fat_sdmmc_mount("/sd", &host, &slot, &mc, &s_card);
    if (e != ESP_OK) { return e; }
    mkdir("/sd/log", 0775);
    log_scan();                            /* tìm file số lớn nhất + tổng dung lượng */
    return ESP_OK;
}

ivts_err_t storage_sd_log_write(const char *line, size_t len)    /* chỉ task storage gọi */
{
    if (s_log_size + len + 1u > g_storage_cfg.log_file_max_bytes) {
        s_log_idx++;                        /* xoay: file mới */
        s_log_size = 0;
        log_enforce_quota();                /* xoá file cũ nhất tới khi dưới quota, không xoá file đang ghi */
    }
    char path[48];
    snprintf(path, sizeof path, "/sd/log/L%07lu.TXT", (unsigned long)s_log_idx);
    FILE *f = fopen(path, "a");
    if (f == NULL) { return IVTS_ERR_IO; }
    size_t w = fwrite(line, 1, len, f);
    w += fwrite("\n", 1, 1, f);
    int rc = fclose(f);                     /* f_close = đồng bộ FAT + dữ liệu: mất nguồn sau dòng này thì dòng log đã trên thẻ */
    if (w != len + 1u || rc != 0) { return IVTS_ERR_IO; }
    s_log_size += (uint32_t)(len + 1u);
    s_log_total += (uint32_t)(len + 1u);
    return IVTS_OK;
}
```

Tên file `LNNNNNNN.TXT` theo dạng 8.3 nên không phụ thuộc long file name. Mở/đóng mỗi dòng chậm hơn giữ `FILE*` mở, đổi lại được hai điều: mất nguồn tối đa mất dòng đang ghi, và `max_files = 4` không bị log chiếm vĩnh viễn. Log 1 dòng/giây thì chi phí này không đáng kể; nhiều hơn thì gom theo lô.

### `storage_os.c` — queue yêu cầu, copy theo giá trị

```c
typedef enum { REQ_LOG = 0, REQ_Q_PUSH, REQ_Q_PEEK, REQ_Q_POP } req_op_t;

typedef struct {
    uint8_t  op;
    uint16_t len;
    uint32_t token;
    uint8_t  data[STORAGE_LOG_LINE_MAX];      /* 160 B: vừa dòng log lẫn record */
} storage_req_t;
_Static_assert(IVTS_RECORD_MAX_SIZE <= STORAGE_LOG_LINE_MAX, "record phải vừa ô data");

static ivts_err_t post(const storage_req_t *r)
{
    if (s_q == NULL) { return IVTS_ERR_INVALID_STATE; }
    return (xQueueSend(s_q, r, 0) == pdTRUE) ? IVTS_OK : IVTS_ERR_FULL;     /* caller trả về ngay */
}

ivts_err_t storage_log_append(const char *line)
{
    if (line == NULL) { return IVTS_ERR_INVALID_ARG; }
    if (!storage_sd_ok()) { return IVTS_ERR_INVALID_STATE; }
    storage_req_t r = { .op = REQ_LOG };
    size_t n = strnlen(line, STORAGE_LOG_LINE_MAX);
    memcpy(r.data, line, n);            /* dài quá thì cắt: log không đáng làm caller thất bại */
    r.len = (uint16_t)n;
    return post(&r);
}

static void storage_task(void *arg)
{
    storage_req_t r;
    for (;;) {
        if (xQueueReceive(s_q, &r, portMAX_DELAY) != pdTRUE) { continue; }
        switch (r.op) {
        case REQ_LOG:    report(IVTS_STORE_OP_LOG_APPEND, storage_sd_log_write((const char *)r.data, r.len)); break;
        case REQ_Q_PUSH: report(IVTS_STORE_OP_QUEUE_PUSH, storage_queue_do_push(r.data, r.len)); break;
        case REQ_Q_PEEK: report(IVTS_STORE_OP_QUEUE_POP, storage_queue_do_peek()); break;
        case REQ_Q_POP:  (void)storage_queue_do_pop(r.token); break;   /* token cũ = ACK trùng: im lặng */
        default: break;
        }
    }
}
```

"Copy theo giá trị" nghĩa là `xQueueSend` chép cả 160 byte vào queue. Buffer của caller dùng lại được ngay khi hàm trả về, không có ownership nào phải theo dõi. Đánh đổi là 16 ô × 168 B ≈ 2,7 KB RAM.

### Chuyện gì xảy ra khi mất nguồn

| Đang làm               | Mất nguồn giữa chừng        | Lần boot sau                                                                                                                        |
| ------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `storage_config_save`  | `nvs_set_blob` chưa commit   | NVS giữ bản cũ (nguyên tử mỗi key)                                                                                             |
| `storage_boot_id_next` | giữa get và set               | boot\_id có thể lặp lại một lần: message\_id trùng với boot bị ngắt. Chấp nhận được vì boot đó chưa kịp gửi gì |
| Ghi log                  | giữa `fwrite` và `fclose` | dòng cuối mất hoặc cụt; FATFS có thể cần `chkdsk` nếu đúng lúc cập nhật FAT                                          |
| Ghi offline queue        | khung dở ở cuối đoạn       | `storage_queue_open` cắt bỏ khung dở (phần 7)                                                                                  |

### Kiểm chứng

- **Build pass:** đã có.
- **Trên board:**
  1. Boot không thẻ: log `mount SD: ESP_ERR_TIMEOUT` (hoặc tương tự) rồi `app: storage op=4 err=IVTS_ERR_IO`, thiết bị vẫn chạy.
  2. Config hỏng cố ý: dùng `nvs_partition_gen` hoặc một lệnh test ghi blob `cfg` sai CRC → boot → `config IVTS_ERR_CRC -> defaults` → app publish event `config_corrupt` khi có broker.
  3. Xoay log: đặt `IVTS_SD_LOG_FILE_MAX` = 4096 và quota = 16384 → sau vài phút thư mục `/sd/log` có tối đa khoảng 5 file.
  4. Rút nguồn 20 lần giữa lúc ghi: thẻ vẫn mount được, config giữ nguyên.

## 5. M6 — `modem`: AT parser/engine (thuần), FSM LTE, GNSS

Task `modem` sở hữu UART1 và SIM7600. Mọi lệnh AT chạy tuần tự trong task này, nên một lệnh được phép **chặn** tới hết timeout của nó mà không ảnh hưởng task khác. URC đến giữa lúc chờ vẫn được xử lý vì mọi byte đều đi qua cùng một hàm `modem_pump()`. Phần khó (tách dòng, khớp trả lời, timeout, parse GNSS) viết thuần và test trên host; phần dính IDF chỉ còn đọc/ghi UART.

Lệnh AT lấy từ **SIM7500\_SIM7600 Series AT Command Manual V2.00** (GPS: mục 17.2.1, 17.2.2, 17.2.21) và **SIM7500\_SIM7600 Series MQTT AT Command Manual**. Phần bring-up (CPIN, CEREG, CGDCONT, CGACT) giữ chuỗi lệnh của repo gốc, vốn đã chạy trên board của bạn.

```cmake
idf_component_register(
    SRCS "src/modem.c" "src/at_parser.c" "src/at_engine.c" "src/gnss_parse.c"
         "src/modem_lte.c" "src/modem_gnss.c" "src/modem_mqtt.c" "src/modem_http.c" "src/modem_os.c"
    INCLUDE_DIRS "include"
    REQUIRES ivts-core
    PRIV_REQUIRES esp_driver_uart esp_driver_gpio esp_pm esp_timer
)
```

So với cây dự kiến có hai file thêm: `gnss_parse.c` (phần parse thuần tách khỏi `modem_gnss.c`, vì một file hoặc hoàn toàn thuần, hoặc không) và `modem_http.c` (D4, phần 10).

### `at_parser` (thuần): byte → dòng / prompt / khối thô

SIM7600 trộn ba loại đơn vị trong một luồng: dòng kết thúc bằng CRLF, prompt `>` **không** có CRLF (khi chờ dữ liệu cho `CMQTTTOPIC`/`PAYLOAD`), và khối byte thô có độ dài báo trước (`+CMQTTRXPAYLOAD: 0,17` rồi 17 byte, có thể chứa CRLF bên trong). Parser không tự biết dòng nào báo trước khối thô; caller gọi `at_parser_expect_raw(n)` ngay sau khi xử lý dòng header.

```c
at_unit_t at_parser_feed(at_parser_t *p, uint8_t b)
{
    /* Đơn vị trước (dòng hoặc khối thô) đã giao cho caller: buffer được dùng lại. */
    if (p->unit_done) { p->unit_done = false; p->len = 0; }
    /* Dòng kết thúc bằng CR: LF ngay sau đó thuộc về dòng cũ, kể cả khi đã sang chế độ thô
     * ("+CMQTTRXPAYLOAD: 0,9\r\n<9 byte>"). */
    if (p->skip_lf) {
        p->skip_lf = false;
        if (b == '\n') { return AT_UNIT_NONE; }
    }
    if (p->raw_left > 0u) {
        p->buf[p->len++] = (char)b;
        p->raw_left--;
        if (p->raw_left == 0u || p->len == AT_LINE_MAX) {
            p->unit_done = true;
            return AT_UNIT_DATA;               /* caller đọc buf/len trước lần feed kế tiếp */
        }
        return AT_UNIT_NONE;
    }
    if (b == '\r' || b == '\n') {
        if (p->len == 0u && !p->overflow) { return AT_UNIT_NONE; }      /* dòng trống giữa CR LF */
        p->buf[p->len < AT_LINE_MAX ? p->len : AT_LINE_MAX - 1u] = '\0';
        p->overflow = false;
        p->skip_lf = (b == '\r');
        p->unit_done = true;
        return AT_UNIT_LINE;
    }
    if (b == '>' && p->len == 0u) { return AT_UNIT_PROMPT; }           /* prompt không có CRLF theo sau */
    if (p->len + 1u < AT_LINE_MAX) { p->buf[p->len++] = (char)b; } else { p->overflow = true; }
    return AT_UNIT_NONE;
}
```

Hai lỗi test bắt được khi viết hàm này. Một: header `+CMQTTRXPAYLOAD: 0,9\r\n` kết thúc dòng ở `\r`, nên `\n` kế tiếp bị nạp nhầm làm byte thô đầu tiên. Cờ `skip_lf` sinh ra để sửa lỗi này. Hai: bản đầu bắt caller tự xoá `p->len` sau mỗi dòng, và quên một chỗ là dòng sau dính vào dòng trước. `unit_done` chuyển trách nhiệm đó về parser.

`at_classify()` phân `OK`, `ERROR`/`+CME ERROR:`/`+CMS ERROR:`, URC (theo bảng tiền tố: `+CMQTTRX*`, `+CMQTTCONNLOST:`, `+CGEV:`, `+CPIN:`, `RDY`, `+HTTPACTION:`...) và dòng thường. `at_field_int(line, idx, &v)` lấy số thứ `idx` sau dấu `:`, từ chối chữ lẫn số và tràn int32.

### `at_engine` (thuần): một lệnh đang chạy

```c
typedef struct {
    const char    *text;            /* không gồm "\r", engine tự thêm */
    const char    *capture;         /* giữ dòng có tiền tố này (vd "+CPIN:") */
    const char    *final_prefix;    /* NULL: OK là kết thúc. Khác NULL: kết thúc khi gặp dòng này (thường SAU OK) */
    uint8_t        final_err_field; /* trường thứ n (1-based) của dòng final là <err>, 0 = thành công.
                                       "+CMQTTPUB: 0,<err>" -> 2, "+CMQTTSTART: <err>" -> 1 */
    const uint8_t *data;            /* gửi sau prompt '>' */
    size_t         data_len;
    uint32_t       timeout_ms;
} at_cmd_t;

bool at_engine_on_line(at_engine_t *e, const char *line)
{
    if (!e->busy) { return false; }
    if (strcmp(line, e->cmd.text) == 0) { return true; }          /* echo của chính lệnh */
    at_line_kind_t kind = at_classify(line);
    if (kind == AT_LINE_OK) {
        e->ok_seen = true;
        if (e->cmd.final_prefix == NULL) { finish(e, AT_RES_OK); }
        return true;
    }
    if (kind == AT_LINE_ERROR) {
        (void)ivts_str_copy(e->resp, sizeof(e->resp), line);
        finish(e, AT_RES_ERROR);
        return true;
    }
    /* Kiểm tiền tố của lệnh TRƯỚC bảng URC: "+CPIN:" vừa là URC lúc boot vừa là
     * trả lời của AT+CPIN?; "+HTTPACTION:" là URC nhưng cũng là kết quả AT+HTTPACTION. */
    if (e->cmd.final_prefix != NULL && at_has_prefix(line, e->cmd.final_prefix)) {
        (void)ivts_str_copy(e->resp, sizeof(e->resp), line);
        int32_t err = 0;
        if (e->cmd.final_err_field > 0u &&
            (!at_field_int(line, (unsigned)e->cmd.final_err_field - 1u, &err) || err != 0)) {
            finish(e, AT_RES_ERROR);           /* mã lỗi khác 0, hoặc dòng méo không đọc được */
        } else {
            finish(e, AT_RES_OK);
        }
        return true;
    }
    if (e->cmd.capture != NULL && at_has_prefix(line, e->cmd.capture)) {
        (void)ivts_str_copy(e->resp, sizeof(e->resp), line);
        return true;
    }
    return false;          /* URC hoặc dòng lạ: để caller xử lý */
}

at_result_t at_engine_poll(at_engine_t *e, ivts_ms_t now)
{
    if (e->busy && now >= e->deadline) { finish(e, AT_RES_TIMEOUT); }
    return e->busy ? AT_RES_PENDING : e->result;
}
```

`final_err_field` có vì SIM7600 không nhất quán vị trí mã lỗi: `+CMQTTSTART: <err>` ở trường 1, `+CMQTTPUB: <client>,<err>` ở trường 2. Bản đầu hard-code trường 2 nên coi `+CMQTTSTART: 23` là thành công. Test `test_at_parser` giờ kiểm đúng trường hợp đó.

### `modem_os.c`: UART, bơm byte, chạy lệnh

```c
void modem_pump(uint32_t wait_ms)
{
    uint8_t buf[128];
    int n = uart_read_bytes(g_modem.cfg.uart_num, buf, sizeof buf, pdMS_TO_TICKS(wait_ms));
    for (int i = 0; i < n; i++) {
        at_unit_t u = at_parser_feed(&g_modem.parser, buf[i]);
        if (u == AT_UNIT_LINE) {
            if (!at_engine_on_line(&g_modem.eng, g_modem.parser.buf)) {
                on_unsolicited(g_modem.parser.buf);            /* +CMQTT* -> modem_mqtt_on_urc; +HTTPREAD: DATA -> raw */
            }
        } else if (u == AT_UNIT_PROMPT) {
            at_engine_on_prompt(&g_modem.eng);                  /* gửi data của lệnh đang chờ */
        } else if (u == AT_UNIT_DATA) {
            on_data((const uint8_t *)g_modem.parser.buf, g_modem.parser.len);   /* topic/payload command, body HTTP */
        }
    }
}

at_result_t modem_at(const at_cmd_t *c)       /* chặn tới khi xong; chỉ task modem gọi */
{
    if (at_engine_start(&g_modem.eng, c, modem_now()) != IVTS_OK) { return AT_RES_ERROR; }
    for (;;) {
        modem_pump(20);
        at_result_t r = at_engine_poll(&g_modem.eng, modem_now());
        if (r != AT_RES_PENDING) { return r; }
    }
}

void modem_pm_hold(bool hold)
{
    /* Auto light sleep tắt clock UART: đang nói chuyện với modem thì cấm light sleep. */
    if (s_pm == NULL || hold == s_pm_held) { return; }
    if (hold) { (void)esp_pm_lock_acquire(s_pm); } else { (void)esp_pm_lock_release(s_pm); }
    s_pm_held = hold;
}
```

`modem_os_start()` cài driver UART (RX 4096, TX 2048, không event queue), `uart_set_pin`, cấu hình PWRKEY là output ở mức nhả, tạo `esp_pm_lock` loại `ESP_PM_NO_LIGHT_SLEEP`, rồi tạo queue yêu cầu (8 ô) và task. Board đi PWRKEY qua transistor đảo (repo gốc: `MODEM_PWRKEY_INVERTED_STAGE_DEFAULT 1`), nên `pwrkey_inverted = true`: GPIO = 1 nghĩa là kéo PWRKEY xuống. Xung bật 500 ms, xung tắt 3000 ms (> Toff 2,5 s), cũng lấy từ `power_mgr.c` gốc.

Vòng lặp task: rút hết yêu cầu → một bước FSM LTE → bước GNSS (nếu modem đã sống) → publish (nếu broker lên) hoặc báo lỗi ngay cho ô publish (nếu chưa) → `modem_pump(50)`. Khi modem tắt nguồn (`L_OFF`), task chờ trên `xQueuePeek` 1 s thay vì poll UART.

### `modem_lte.c`: FSM bring-up với backoff riêng

| State        | Lệnh                                                   | Thành công                             | Thất bại                                                  |
| ------------ | ------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| `L_POWER`  | `AT` (500 ms)                                         | modem đã bật sẵn → `L_SYNC`       | xung PWRKEY 500 ms, chờ 12 s → `L_SYNC`                 |
| `L_SYNC`   | `AT`, `ATE0`, `AT+CMEE=2`                         | → `L_SIM`                             | backoff; 10 lần → `L_POWER`                             |
| `L_SIM`    | `AT+CPIN?` (capture `+CPIN:`)                       | có `READY` → `L_REG`               | backoff                                                     |
| `L_REG`    | `AT+CEREG?`                                           | stat 1 (home) / 5 (roaming) → `L_PDP` | poll 2 s, không tính là lỗi; quá 180 s → `L_POWER`  |
| `L_PDP`    | `AT+CGDCONT=1,"IP","<apn>"`, `AT+CGACT=1,1` (150 s) | phát `LINK NET_UP` → MQTT            | backoff                                                     |
| `L_MQTT_*` | phần 6                                                 | → `L_UP`, phát `LINK BROKER_UP`    | backoff; `CONNECT` lỗi 3 lần → làm lại từ `START` |

```c
static const ivts_backoff_t k_backoff = { .base_ms = 1000, .max_ms = 60000, .jitter_ms = 2000 };

static void fail(void)
{
    modem_lte_t *l = &g_modem.lte;
    l->fails_total++;
    if (l->fails_total >= 8u) {                          /* quá nhiều lỗi liên tiếp: power-cycle */
        modem_power_pulse(3000);
        vTaskDelay(pdMS_TO_TICKS(2000));
        modem_emit_link(IVTS_LINK_DOWN, (int32_t)IVTS_ERR_TIMEOUT);
        modem_lte_reset(L_POWER);
        l->retry_at = modem_now() + ivts_backoff_ms(&k_backoff, 3, (uint32_t)modem_now());
        return;
    }
    uint32_t d = ivts_backoff_ms(&k_backoff, l->attempt, (uint32_t)modem_now());
    l->attempt++;
    l->retry_at = modem_now() + d;                       /* uptime ms, không bao giờ lưu xuống flash */
}
```

`attempt` reset mỗi khi đổi state, còn `fails_total` reset khi về `L_POWER`. Một mạng lại nhưng broker chết thì backoff chỉ tăng ở `L_MQTT_CONN`, không kéo modem đi power-cycle vô ích. Seed jitter là uptime ms: hai thiết bị không bao giờ bật cùng mili giây, vậy là đủ để tách nhau.

Khi app gọi `modem_set_link(false)` (trước khi ngủ): `AT+CMQTTDISC=0,60`, xung PWRKEY 3 s, `L_OFF`, phát `LINK DOWN`, nhả PM lock. Board không nối DTR (`PIN_MODEM_DTR GPIO_NUM_NC` trong pin map gốc), nên chế độ ngủ UART của SIM7600 (`AT+CSCLK=1` + DTR) không dùng được. Tắt nguồn là lựa chọn còn lại, đánh đổi bằng 15–30 s bring-up mỗi lần thức.

### GNSS: `gnss_parse.c` (thuần) và `modem_gnss.c`

Định dạng (AT manual 17.2.2 và 17.2.21):

```
+CGNSSINFO: <mode>,<GPS-SVs>,<GLONASS-SVs>,<BEIDOU-SVs>,<lat>,<N/S>,<log>,<E/W>,<date>,<UTC-time>,<alt>,<speed>,<course>,<PDOP>,<HDOP>,<VDOP>
+CGPSINFO: <lat>,<N/S>,<log>,<E/W>,<date>,<UTC time>,<alt>,<speed>,<course>
lat ddmm.mmmmmm, log dddmm.mmmmmm, date ddmmyy, time hhmmss.s, speed: knot, course: độ
Không fix: "+CGNSSINFO: ,,,,,,,,,,,,,,,"
```

```c
/* "3113.330650",'N' -> 312221775 (độ * 1e7), không float */
ivts_err_t gnss_nmea_to_e7(const char *ddmm, char hemi, int32_t *out)
{
    uint64_t v;                                    /* ddmm.mmmmmm * 1e6 */
    if (ddmm == NULL || out == NULL || parse_fixed(ddmm, 6, &v) != IVTS_OK) { return IVTS_ERR_INVALID_ARG; }
    uint64_t deg = v / 100000000u;
    uint64_t min_u = v % 100000000u;               /* phút * 1e6 */
    if (min_u >= 60000000u) { return IVTS_ERR_INVALID_ARG; }
    uint64_t e7 = deg * 10000000u + (min_u * 10u + 30u) / 60u;   /* phút*1e6*10/60, làm tròn */
    bool lat = (hemi == 'N' || hemi == 'S');
    if (!lat && hemi != 'E' && hemi != 'W') { return IVTS_ERR_INVALID_ARG; }
    if (e7 > (lat ? 900000000u : 1800000000u)) { return IVTS_ERR_INVALID_ARG; }
    *out = (hemi == 'S' || hemi == 'W') ? -(int32_t)e7 : (int32_t)e7;
    return IVTS_OK;
}
```

Tốc độ: milli-knot × 514444 / 10⁷ = cm/s (1 kn = 51,4444 cm/s), làm tròn. `gnss_parse_cgnssinfo` không dùng vị trí cố định của `lat`, mà tìm mốc `N/S` và `E/W` một ký tự. Firmware SIM7600 mới có thể thêm trường số vệ tinh (Galileo) trước `lat`; test có cả biến thể đó. `sats` = tổng các trường giữa `mode` và `lat`.

```c
/* modem_gnss.c — ưu tiên CGNSSINFO (SRC_FULL), lỗi thì CGPSINFO (SRC_APPROX) */
void modem_gnss_step(void)
{
    modem_t *m = &g_modem;
    if (m->gnss_wanted != m->gnss_on) {
        at_result_t r = modem_at_simple(m->gnss_wanted ? "AT+CGPS=1,1" : "AT+CGPS=0", 5000);   /* mode 1 = standalone */
        if (r != AT_RES_OK) {                    /* bật khi đã bật -> ERROR: hỏi lại trạng thái thay vì đoán */
            at_cmd_t q = { .text = "AT+CGPS?", .capture = "+CGPS:", .timeout_ms = 2000 };
            int32_t on = 0;
            if (modem_at(&q) == AT_RES_OK && at_field_int(m->eng.resp, 0, &on)) { m->gnss_on = (on == 1); }
        } else {
            m->gnss_on = m->gnss_wanted;
        }
        m->gnss_next = modem_now() + 1000;
        return;
    }
    if (!m->gnss_on || modem_now() < m->gnss_next) { return; }
    m->gnss_next = modem_now() + (uint64_t)m->cfg.gnss_period_s * 1000u;
    ivts_gnss_t g;
    at_cmd_t c = { .text = "AT+CGNSSINFO", .capture = "+CGNSSINFO:", .timeout_ms = 2000 };
    bool ok = modem_at(&c) == AT_RES_OK && gnss_parse_cgnssinfo(m->eng.resp, &g) == IVTS_OK;
    if (!ok) {
        at_cmd_t c2 = { .text = "AT+CGPSINFO", .capture = "+CGPSINFO:", .timeout_ms = 2000 };
        ok = modem_at(&c2) == AT_RES_OK && gnss_parse_cgpsinfo(m->eng.resp, &g) == IVTS_OK;
    }
    if (!ok) { return; }
    ivts_event_t ev = { .type = IVTS_EV_GNSS_FIX, .ts_ms = modem_now() };
    ev.u.gnss = g;
    modem_emit(&ev);
}
```

GNSS chạy khi modem đã qua `L_SYNC`, không cần đăng ký mạng. Giờ UTC trong fix là nguồn để đồng bộ RTC (phần 3).

### Kiểm chứng

- **Host test:** `./tools/host_test.sh at_parser gnss_parse` → 33 + 39 check pass. Hai test dùng **nguyên văn ví dụ trong AT manual**: `+CGNSSINFO: 2,09,05,00,3113.330650,N,12121.262554,E,131117,091918.0,32.9,0.0,255.0,1.1,0.8,0.7` → lat 312221775, lon 1213543759, 14 vệ tinh, 2017-11-13T09:19:18Z (đối chiếu Python `datetime`). Test engine mô phỏng đầy đủ luồng publish: echo, prompt, dữ liệu, `OK`, URC `+CMQTTRXSTART` xen giữa, rồi `+CMQTTPUB: 0,0`.
- **Build pass:** đã có.
- **Trên board:**
  1. Log `lte POWER -> SYNC -> SIM -> REG -> PDP -> MQTT_START`, kèm thời gian mỗi bước. REG thường 5–30 s, PDP dưới 5 s.
  2. Tháo SIM: dừng ở `SIM`, backoff tăng 1 → 2 → 4 s..., sau 8 lần thì power-cycle.
  3. Ngoài trời: `GNSS_FIX` với `src=full` và `sats > 0`. Nếu luôn `src=approx` thì firmware SIM7600 của bạn không hỗ trợ `CGNSSINFO`: chạy tay `AT+CGNSSINFO` qua `idf.py monitor` để xem.
  4. Treo UART bằng cách rút dây RX: mọi lệnh hết hạn đúng timeout, app vẫn chạy (không task nào khác bị kẹt).

## 6. M7 — Payload, MQTT qua AT, hàng đợi command (D2), `app_publish.c`

M7 có ba tầng tách biệt: `ivts-core/payload` dựng chuỗi JSON (thuần), `modem_mqtt.c` đưa chuỗi đó qua AT và báo kết quả (`MQTT_ACK`), `app_publish.c` quyết định gửi gì, khi nào, và xử lý khi không gửi được. Giữa modem và app là **một ô publish**: mỗi lúc chỉ một bản tin bay, nên thứ tự ACK luôn khớp với thứ tự gửi.

### `json_writer` (thuần)

Ghi vào buffer của caller, không malloc, **không printf**. `CONFIG_NEWLIB_NANO_FORMAT` của IDF bỏ `%lld`, nên số 64-bit tự chuyển. Lỗi "dính": hết chỗ một lần thì mọi lệnh sau là no-op và `finish` trả `FULL`. Caller viết cả payload rồi kiểm một lần, không phải kiểm sau mỗi field.

```c
typedef struct {
    char *buf; size_t cap; size_t len;
    uint8_t depth; bool full; bool bad;
    uint8_t need_comma;   /* bit d = đã có phần tử ở độ sâu d */
} ivts_jw_t;

void ivts_jw_init(ivts_jw_t *w, char *buf, size_t cap);
void ivts_jw_obj_begin(ivts_jw_t *w, const char *key);    /* key NULL ở top-level/trong mảng */
void ivts_jw_obj_end(ivts_jw_t *w);
void ivts_jw_arr_begin(ivts_jw_t *w, const char *key);
void ivts_jw_arr_end(ivts_jw_t *w);
void ivts_jw_str(ivts_jw_t *w, const char *key, const char *val);   /* val NULL -> null */
void ivts_jw_int(ivts_jw_t *w, const char *key, int64_t v);
void ivts_jw_uint(ivts_jw_t *w, const char *key, uint64_t v);
void ivts_jw_bool(ivts_jw_t *w, const char *key, bool v);
void ivts_jw_null(ivts_jw_t *w, const char *key);
void ivts_jw_fixed(ivts_jw_t *w, const char *key, int64_t v, uint8_t decimals);   /* (-210285123,7) -> -21.0285123 */
ivts_err_t ivts_jw_finish(ivts_jw_t *w, size_t *len);    /* FULL / INVALID_STATE (chưa đóng hết, end thừa, quá sâu) */
```

```c
static void put_c(ivts_jw_t *w, char c)
{
    if (w->full) { return; }
    if (w->len + 1u >= w->cap) { w->full = true; return; }    /* luôn chừa 1 byte cho NUL */
    w->buf[w->len++] = c;
    w->buf[w->len] = '\0';
}

void ivts_jw_int(ivts_jw_t *w, const char *key, int64_t v)
{
    lead(w, key);
    if (v < 0) {
        put_c(w, '-');
        put_u64(w, (uint64_t)0 - (uint64_t)v);   /* -(INT64_MIN) tràn: đổi sang unsigned TRƯỚC khi đảo dấu */
    } else {
        put_u64(w, (uint64_t)v);
    }
}

void ivts_jw_fixed(ivts_jw_t *w, const char *key, int64_t v, uint8_t decimals)
{
    if (decimals > 9u) { w->bad = true; return; }
    lead(w, key);
    uint64_t mag = (v < 0) ? ((uint64_t)0 - (uint64_t)v) : (uint64_t)v;
    uint64_t div = 1u;
    for (uint8_t i = 0; i < decimals; i++) { div *= 10u; }
    if (v < 0) { put_c(w, '-'); }                 /* -0.5 phải có dấu dù phần nguyên là 0 */
    put_u64(w, mag / div);
    if (decimals > 0u) {
        put_c(w, '.');
        uint64_t frac = mag % div;
        for (uint64_t d = div / 10u; d > 0u; d /= 10u) { put_c(w, (char)('0' + (int)((frac / d) % 10u))); }   /* giữ số 0 đứng đầu */
    }
}
```

`ivts_jw_fixed` là lý do model dùng fixed-point: `-0.5` dễ bị in thành `0.5` (phần nguyên `0` mất dấu), `0.005` dễ bị in thành `0.5` (mất số 0 đứng đầu). Cả hai có trong test, cùng `INT64_MIN` ở 9 số lẻ.

### `meta.h` và `payload.h`

```c
#define IVTS_MSG_ID_SIZE 18u            /* "<boot_id 8 hex>-<seq 8 hex>" + NUL */
#define IVTS_SCHEMA_VERSION 2u

typedef struct {
    const char *device_id;
    const char *auth_token;    /* NULL = không ghi (repo gốc có gửi trong payload) */
    uint32_t    boot_id;
    uint32_t    seq;
    uint64_t    sent_unix_ms;  /* 0 = chưa có giờ tin cậy -> "sent_at": null */
    bool        time_trusted;
    uint64_t    uptime_ms;
} ivts_msg_meta_t;

#define IVTS_PAYLOAD_MAX 1536u
ivts_err_t ivts_payload_rawdata(const ivts_msg_meta_t *m, const ivts_record_t *r, char *buf, size_t cap, size_t *len);
ivts_err_t ivts_payload_status(const ivts_msg_meta_t *m, const ivts_telemetry_t *t, char *buf, size_t cap, size_t *len);
ivts_err_t ivts_payload_event(const ivts_msg_meta_t *m, const char *code, const char *severity,
                              const char *message, char *buf, size_t cap, size_t *len);
/* ivts_payload_firmware(): khai báo ở ivts_core/ota/contract.h (M11) */
```

**`message_id` = `boot_id`-`seq`**, cấp **lúc chụp mẫu**, không phải lúc gửi. Mẫu nào không gửi được thì đi vào offline queue cùng id của nó, replay gửi lại đúng id đó, cloud khử trùng theo id. `boot_id` tăng mỗi lần boot nguội (NVS), `seq` sống qua deep sleep trong RTC RAM (phần 9), nên cặp này không bao giờ lặp lại cho hai mẫu khác nhau.

Payload rawdata thật (in ra từ `test_payload`, 441 byte):

```json
{"schema_version":2,"message_id":"0000002a-00000007","device_id":"DEV_001","boot_id":42,"seq_no":7,
 "sent_at":1763600000000,"timestamp_trusted":true,"uptime_ms":12345,
 "gnss":{"fix_valid":true,"source":"full","lat":21.0285123,"lon":105.8542000,"speed_kph":50.0,"course_deg":255.0,"satellites":14},
 "power":{"vehicle_mv":13850,"device_mv":4012},
 "state":{"ignition":"on","motion":"moving","vehicle":"moving_on"},
 "obd":{"rpm":2150,"coolant_c":-5}}
```

OBD thiếu PID nào thì bỏ key đó (theo `valid_mask`), không ghi `0`. **Schema này khác repo gốc** (`schema_version` 2, gom nhóm `gnss`/`power`/`state`/`obd`). Cloud phải đọc được nó trước khi firmware mới ra đường. Nếu cloud chưa sửa được thì đổi tên key trong `payload.c` cho khớp `data_formatter.c` gốc.

### `modem_mqtt.c`: chuỗi AT

Từ SIM7500\_SIM7600 MQTT AT Command Manual:

| Bước | Lệnh                                                                                                           | Kết thúc khi             | Ghi chú                                                                       |
| ------ | --------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------ |
| START  | `AT+CMQTTSTART`                                                                                               | `+CMQTTSTART: <err>`     | lỗi (dịch vụ còn chạy từ phiên trước) → DISC/REL/STOP rồi thử lại |
| ACQ    | `AT+CMQTTACCQ=0,"<client_id>"`                                                                                | `OK`                     | clientID 1–23 byte                                                            |
| CFG    | `AT+CMQTTCFG="checkUTF8",0,0`                                                                                 | `OK`                     | tắt kiểm UTF-8 của modem                                                    |
| CONN   | `AT+CMQTTCONNECT=0,"tcp://h:p",60,0[,"u","p"]`                                                                | `+CMQTTCONNECT: 0,<err>` | keepalive 60 s (min manual 60), clean\_session = 0                             |
| SUB    | `AT+CMQTTSUB=0,<len>,1` → `>` topic                                                                        | `+CMQTTSUB: 0,<err>`     | QoS1 cho `v1/<id>/commands`                                                  |
| PUB    | `AT+CMQTTTOPIC=0,<len>` → `>` → `AT+CMQTTPAYLOAD=0,<len>` → `>` → `AT+CMQTTPUB=0,1,60`            | `+CMQTTPUB: 0,<err>`     | pub\_timeout 60–180 s; QoS1: `err = 0` khi có PUBACK                       |
| RX     | `+CMQTTRXSTART` → `+CMQTTRXTOPIC: 0,n` + n byte → `+CMQTTRXPAYLOAD: 0,n` + n byte → `+CMQTTRXEND: 0` |                            | topic/payload dài đến nhiều gói, cộng dồn                               |
| Mất   | `+CMQTTCONNLOST: 0,<cause>`                                                                                   |                            | cause 1 socket đóng, 2 reset, 3 mạng đóng                                 |

`clean_session = 0` giữ cách làm của gốc: broker giữ subscription và command QoS1 trong lúc thiết bị ngủ. Điều kiện là client\_id ổn định, và đó là lý do `app_init` từ chối cắt `device_id`.

**`msg_id` của MQTT không lộ ra host.** API AT của SIM7600 không trả packet identifier. "ACK" mà firmware thấy là dòng `+CMQTTPUB: 0,0` của lệnh đang chạy. Vì vậy cần ô publish đơn: chỉ một PUB đang chờ thì kết quả chắc chắn thuộc về nó. `tx_id` trong `IVTS_EV_MQTT_ACK` là số của app, dùng để loại ACK lạc. Còn id để cloud khử trùng là `message_id` trong JSON.

```c
void modem_mqtt_publish_pending(void)
{
    modem_topic_t t; const char *p; size_t n; uint32_t id;
    if (!modem_tx_take(&t, &p, &n, &id)) { return; }
    const char *topic = g_modem.topic[t];
    bool ok = input("TOPIC", topic, strlen(topic)) && input("PAYLOAD", p, n);
    int16_t err = -2;                                   /* -2: lỗi trước khi PUB (nhập topic/payload) */
    if (ok) {
        char cmd[40];
        snprintf(cmd, sizeof cmd, "AT+CMQTTPUB=0,1,%d", PUB_TIMEOUT_S);
        at_cmd_t c = { .text = cmd, .final_prefix = "+CMQTTPUB:", .final_err_field = 2,
                       .timeout_ms = (PUB_TIMEOUT_S + 5) * 1000u };
        at_result_t r = modem_at(&c);
        int32_t e = 0;
        ok = (r == AT_RES_OK);
        if (ok) { err = 0; }
        else if (r == AT_RES_TIMEOUT) { err = -1; }
        else if (at_field_int(g_modem.eng.resp, 1, &e)) { err = (int16_t)e; }   /* <err> của bảng lỗi MQTT */
    }
    modem_tx_done(ok, err);                             /* phát IVTS_EV_MQTT_ACK, giải phóng ô */
    if (!ok && err == 11) { modem_lte_conn_lost(); }    /* 11 = no connection */
}

void modem_mqtt_on_urc(const char *line)
{
    modem_t *m = &g_modem;
    int32_t v;
    if (at_has_prefix(line, "+CMQTTRXSTART:")) {
        memset(&m->rx, 0, sizeof m->rx);
        m->rx.active = true;
    } else if (at_has_prefix(line, "+CMQTTRXTOPIC:") && at_field_int(line, 1, &v) && v > 0) {
        m->rx.phase = 1;
        at_parser_expect_raw(&m->parser, (size_t)v);
    } else if (at_has_prefix(line, "+CMQTTRXPAYLOAD:") && at_field_int(line, 1, &v) && v > 0) {
        m->rx.phase = 2;
        at_parser_expect_raw(&m->parser, (size_t)v);
    } else if (at_has_prefix(line, "+CMQTTRXEND:")) {
        if (m->rx.active && !m->rx.overflow && strcmp(m->rx.topic, m->topic_cmd) == 0) {
            modem_cmd_store(m->rx.payload, m->rx.plen);
        }
        m->rx.active = false;
    } else if (at_has_prefix(line, "+CMQTTCONNLOST:")) {
        modem_lte_conn_lost();                          /* về L_MQTT_CONN, phát LINK NET_UP */
    }
}
```

`input()` gọi `modem_at()` với `.data`; engine tự gửi topic/payload khi thấy `>`. `modem_at` chặn tối đa 65 s khi chờ PUBACK. Trong lúc đó task modem không nhận yêu cầu mới (kể cả `set_link(false)`). App biết điều này và chờ `LINK DOWN` có timeout (phần 9).

### D2: hàng đợi command và ô publish trong `modem.c`

```c
static SemaphoreHandle_t s_mx;                  /* một mutex cho cả hai ô: app ghi/đọc, task modem đọc/ghi */
static struct { bool busy, in_flight; modem_topic_t topic; uint32_t tx_id; size_t len; char data[MODEM_PAYLOAD_MAX]; } s_tx;

ivts_err_t modem_publish(modem_topic_t topic, const char *payload, size_t len, uint32_t tx_id)
{
    if (payload == NULL || len == 0u || len > MODEM_PAYLOAD_MAX || topic >= MODEM_TOPIC_COUNT) { return IVTS_ERR_INVALID_ARG; }
    xSemaphoreTake(s_mx, portMAX_DELAY);
    if (s_tx.busy) { xSemaphoreGive(s_mx); return IVTS_ERR_FULL; }
    memcpy(s_tx.data, payload, len);            /* copy: buffer của app dùng lại được ngay */
    s_tx.len = len; s_tx.topic = topic; s_tx.tx_id = tx_id;
    s_tx.busy = true; s_tx.in_flight = false;
    xSemaphoreGive(s_mx);
    modem_req_t r = { .op = REQ_PUB_KICK };
    (void)post(&r);                             /* queue đầy cũng không sao: vòng lặp modem tự thấy ô bận */
    return IVTS_OK;
}

```

`memcpy` 1,5 KB dưới mutex mất vài µs. Không task nào giữ mutex qua một lệnh AT: `modem_tx_take` đánh dấu `in_flight` rồi nhả khoá ngay, sau đó gửi thẳng từ ô. Việc này an toàn vì app không ghi đè khi `busy`.

`modem_cmd_store()` sao chép lệnh vào hàng đợi vòng tròn bốn phần tử và phát `IVTS_EV_CMD_PENDING` sau khi nhả mutex. Task app rút lệnh theo FIFO. Khi hàng đợi đầy, `modem_cmd_dropped()` ghi nhận lệnh bị bỏ. SIM7600 gửi PUBACK của MQTT trước khi app xử lý, nên backend dùng `commands/ack` để theo dõi kết quả theo `command_id`.

App commit 32 ID thành công gần nhất vào NVS trước khi gửi `acknowledged`. Lệnh trùng trong cửa sổ này nhận lại ACK sau reboot. Rollback thủ công cũng lưu slot gốc trước khi đổi slot để lệnh gửi lại sau mất nguồn chỉ có thể thử lại trên slot gốc. `request_location` dành 90 giây để lấy GNSS fix và gửi mẫu. ACK thành công sau khi broker xác nhận nhận được mẫu.

### `app_publish.c`

```c
static bool send(pub_kind_t kind, modem_topic_t topic, size_t len)
{
    uint32_t tx = ++s_tx_seq;
    if (g_app.link != IVTS_LINK_BROKER_UP || g_app.pub_inflight ||
        modem_publish(topic, s_buf, len, tx) != IVTS_OK) {
        return false;
    }
    g_app.pub_inflight = true;
    g_app.pub_kind = kind;
    g_app.pub_tx = tx;
    return true;
}

void app_publish(pub_kind_t kind)
{
    size_t len = 0;
    switch (kind) {
    case PUB_RAW_LIVE: {
        ivts_record_t r;
        app_state_make_record(&r);                    /* cấp seq mới: id của mẫu này từ giờ là cố định */
        ivts_msg_meta_t m = meta(r.seq);
        if (ivts_payload_rawdata(&m, &r, s_buf, sizeof s_buf, &len) == IVTS_OK && send(kind, MODEM_TOPIC_RAWDATA, len)) {
            g_app.pub_rec = r;                        /* giữ để đẩy vào queue nếu ACK lỗi */
        } else {
            to_queue(&r);                             /* không broker / ô bận -> offline queue, cùng id */
        }
        return;
    }
    case PUB_STATUS: {
        ivts_msg_meta_t m = meta(app_rtc_next_seq());
        if (ivts_payload_status(&m, app_state_get(), s_buf, sizeof s_buf, &len) == IVTS_OK) {
            (void)send(kind, MODEM_TOPIC_STATUS, len);     /* status cũ vô giá trị: không xếp hàng */
        }
        return;
    }
    /* PUB_EVENT, PUB_FW: tương tự, cờ dirty giữ lại để thử lại ở tick sau */
    default: return;
    }
}

void app_publish_on_ack(const ivts_event_t *ev)
{
    if (!g_app.pub_inflight || ev->u.mqtt_ack.tx_id != g_app.pub_tx) { return; }   /* ACK lạc */
    bool ok = ev->u.mqtt_ack.ok != 0u;
    g_app.pub_inflight = false;
    switch (g_app.pub_kind) {
    case PUB_RAW_LIVE:   if (!ok) { to_queue(&g_app.pub_rec); } break;
    case PUB_RAW_REPLAY:                                   /* chưa ACK thì không pop: at-least-once */
        if (ok) { (void)storage_queue_pop(g_app.replay_token); g_app.popped_token = g_app.replay_token; }
        break;
    case PUB_STATUS:     if (ok) { g_app.status_acked = true; } break;   /* dùng cho confirm OTA */
    case PUB_FW:         if (!ok) { g_app.fw_dirty = true; } break;
    case PUB_EVENT:      if (!ok) { g_app.event_dirty = true; } break;
    default: break;
    }
}
```

Dữ liệu nào đáng giữ khi không gửi được: **rawdata giữ** (vết đường đi là lý do tồn tại của thiết bị), **status không giữ** (status 3 giờ trước vô giá trị, status mới sẽ đến), firmware/event giữ bằng cờ dirty trong RAM. Khi ô publish đang bận mà tới nhịp rawdata, mẫu mới đi thẳng vào offline queue: không mất mẫu, đổi lại độ trễ và một lần ghi SD.

`meta()` lấy giờ từ `board_time_get`; giờ chưa tin cậy thì ghi `"sent_at": null` chứ không ghi một con số sai. `uptime_ms` luôn có để cloud tự tính nếu cần.

### Kiểm chứng

- **Host test:** `./tools/host_test.sh json_writer payload` → 84 + 27 check. Mọi payload sinh ra được **chính `json_reader` (D3) parse lại**, nên writer và reader kiểm chéo nhau. Với mọi `cap` từ 1 tới đủ, writer phải ra `FULL`, có NUL, và không ghi quá `cap` (ASan canh).
- **Build pass:** đã có.
- **Trên board:**
  1. `mosquitto_sub -h <broker> -t 'v1/<id>/#' -v` thấy `rawdata` mỗi `tracking_interval_s` khi nổ máy, `status` mỗi 60 s.
  2. `mosquitto_pub -q 1 -t v1/<id>/commands -m '{"command_id":"t1","command":"request_location"}'` → thấy `commands/ack` với `"status":"accepted"` và một `rawdata` ngay sau.
  3. Gửi nhiều command liền nhau khi thiết bị đang publish. Kiểm tra FIFO bốn lệnh, bộ đếm khi đầy và ACK cho ID lặp sau reboot.
  4. Tắt broker 30 s: các `rawdata` trong khoảng đó vào offline queue (phần 7), bật broker lại thì chúng được gửi với `message_id` cũ.

## 7. M8 — Offline queue: `record`, `storage_queue.c`, replay

Mục tiêu là **at-least-once**: mỗi mẫu rawdata đã chụp hoặc tới cloud, hoặc nằm trên SD chờ gửi, kể cả khi mất nguồn. Exactly-once không đạt được nếu chỉ có một phía. Thiết bị chấp nhận gửi trùng, còn cloud khử trùng theo `message_id`, nằm sẵn trong bản ghi từ lúc chụp.

### `model/record` — mã hoá tường minh

Không `fwrite(&struct)`: padding và thứ tự field là quyết định của compiler, không phải contract. Firmware v2 thêm một field vào `ivts_gnss_t` là mọi bản ghi còn trên SD (có thể của ba ngày offline) bị đọc sai. Record v1: 47 byte little-endian, byte đầu là version.

| Offset | Kích thước | Field                            |
| ------ | ------------- | -------------------------------- |
| 0      | 1             | version = 1                      |
| 1      | 4             | boot\_id                         |
| 5      | 4             | seq                              |
| 9      | 8             | gnss.ts\_unix\_ms                |
| 17     | 4 + 4         | lat\_e7, lon\_e7 (int32, bù 2)  |
| 25     | 2 + 2         | speed\_cm\_s, course\_deg\_x10   |
| 29     | 1 + 1 + 1     | sats, src, fix\_valid            |
| 32     | 2 + 2         | vehicle\_mv, device\_mv          |
| 36     | 1 + 1 + 1     | ignition, motion, vehicle        |
| 39     | 1             | obd.valid\_mask                  |
| 40     | 2 + 2         | rpm, coolant\_c (int16)          |
| 44     | 1 + 1 + 1     | speed\_kmh, fuel\_pct, load\_pct |

```c
static void put16(wr_t *w, uint16_t v) { put8(w, (uint8_t)v); put8(w, (uint8_t)(v >> 8)); }
static void put32(wr_t *w, uint32_t v) { put16(w, (uint16_t)v); put16(w, (uint16_t)(v >> 16)); }

ivts_err_t ivts_record_encode(const ivts_record_t *r, uint8_t *buf, size_t cap, size_t *out_len)
{
    if (r == NULL || buf == NULL || cap < IVTS_RECORD_V1_SIZE) { return IVTS_ERR_INVALID_ARG; }
    wr_t w = { buf, 0 };
    put8(&w, IVTS_RECORD_VERSION);
    put32(&w, r->boot_id);
    put32(&w, r->seq);
    put64(&w, r->gnss.ts_unix_ms);
    put32(&w, (uint32_t)r->gnss.lat_e7);       /* int32 -> uint32: giữ nguyên bit (bù 2) */
    put32(&w, (uint32_t)r->gnss.lon_e7);
    /* ... các field còn lại theo bảng ... */
    if (out_len != NULL) { *out_len = w.i; }    /* == IVTS_RECORD_V1_SIZE, test kiểm */
    return IVTS_OK;
}

ivts_err_t ivts_record_decode(const uint8_t *buf, size_t len, ivts_record_t *r)
{
    if (buf == NULL || r == NULL || len < 1u) { return IVTS_ERR_INVALID_ARG; }
    if (buf[0] != IVTS_RECORD_VERSION) { return IVTS_ERR_VERSION; }     /* v2 đọc được v1 thì thêm nhánh ở đây */
    if (len < IVTS_RECORD_V1_SIZE) { return IVTS_ERR_INVALID_ARG; }
    /* ... get theo đúng thứ tự ... */
    return IVTS_OK;
}
```

`(int32_t)get32()` đổi số không dấu ngoài dải sang có dấu. C11 gọi đó là implementation-defined (không phải UB), GCC định nghĩa là modulo, nên UBSan không báo và kết quả đúng trên cả x86 lẫn Xtensa.

**Golden CRC của bản ghi mẫu = `0xAAC96EC4`**, tính độc lập bằng Python:

```python
struct.pack('<BIIQiiHHBBBHHBBBBHhBBB', 1, 0x01020304, 0xA0B0C0D0, 1763600000123, 210285123, -1058542000,
            1389, 3599, 14, 1, 1, 13850, 4012, 2, 2, 4, 0x1F, 2150, -12, 50, 63, 27)   # len 47, zlib.crc32 = 0xaac96ec4
```

`test_record` giữ con số này. Ai đổi thứ tự field là test báo ngay, trước khi bản ghi cũ trên SD bị đọc sai ngoài đường.

### Định dạng trên SD

```
/sd/q/QNNNNNNN.BIN   đoạn (segment), chỉ nối thêm
                     khung: A5 | len (1 B) | payload[len] | crc32(len + payload) LE (4 B)
/sd/q/CURSOR.BIN     { magic "RUCQ", seg, off, crc32 }  = vị trí bản ghi chưa gửi cũ nhất
```

CRC của khung bao cả byte `len`. Nếu chỉ CRC payload thì một bit lật ở `len` sẽ làm parser đọc lệch mọi khung sau mà không biết. Magic `A5` giúp phát hiện rác ngay byte đầu.

Một đoạn 32 KB (Kconfig) chứa khoảng 600 bản ghi, tức 10 phút lái ở nhịp 1 s. 256 đoạn ≈ 8 MB ≈ 42 giờ offline. Đầy thì **bỏ đoạn cũ nhất**: vị trí hiện tại có giá trị hơn vị trí hai ngày trước. Đây là lựa chọn nghiệp vụ; muốn giữ dữ liệu cũ thì đảo thành "từ chối push".

### `storage_queue.c` — mở lại sau mất nguồn

```c
esp_err_t storage_queue_open(void)
{
    /* 1. Quét thư mục: head = đoạn số nhỏ nhất, tail = lớn nhất. */
    /* ... opendir / readdir / sscanf("Q%7u.BIN") ... */

    /* 2. Cắt khung dở ở cuối đoạn đang ghi (mất nguồn giữa fwrite). */
    uint32_t end = 0;
    (void)scan_segment(s_tail, 0, &end);          /* đi từng khung, dừng ở khung hỏng đầu tiên */
    char p[48];
    seg_path(p, sizeof p, s_tail);
    struct stat st;
    if (stat(p, &st) == 0 && (uint32_t)st.st_size != end) {
        (void)truncate(p, (off_t)end);            /* FATFS VFS của IDF hỗ trợ truncate/ftruncate */
    }
    s_tail_size = end;

    /* 3. Cursor hỏng/thiếu/ngoài dải -> đọc từ đầu đoạn cũ nhất (gửi trùng, không mất). */
    if (!cursor_load() || s_rd_seg < s_head || s_rd_seg > s_tail) { s_rd_seg = s_head; s_rd_off = 0; }

    /* 4. Đếm bản ghi còn chờ. */
    uint32_t pending = 0;
    for (uint32_t seg = s_rd_seg; seg <= s_tail; seg++) {
        pending += scan_segment(seg, seg == s_rd_seg ? s_rd_off : 0u, &end);
    }
    set_pending(pending);
    s_open = true;
    return ESP_OK;
}
```

Bước 4 đọc toàn bộ phần chưa gửi lúc boot. Với 8 MB đầy thì mất vài giây, nhưng chỉ khi queue thật sự đầy. Nếu đo thấy chậm, ghi thêm số bản ghi vào cursor.

### Push, peek, pop

```c
ivts_err_t storage_queue_do_push(const uint8_t *rec, size_t len)
{
    if (s_tail_size + len + FRAME_OVERHEAD > g_storage_cfg.queue_segment_bytes) {
        s_tail++;                                  /* sang đoạn mới */
        s_tail_size = 0;
        while (s_tail - s_head + 1u > g_storage_cfg.queue_max_segments) { drop_head_segment(); }
    }
    uint8_t fr[IVTS_RECORD_MAX_SIZE + FRAME_OVERHEAD];
    fr[0] = FRAME_MAGIC;
    fr[1] = (uint8_t)len;
    memcpy(&fr[2], rec, len);
    uint32_t crc = ivts_crc32(0, &fr[1], len + 1u);
    for (int i = 0; i < 4; i++) { fr[2 + len + (size_t)i] = (uint8_t)(crc >> (8 * i)); }
    char p[48];
    seg_path(p, sizeof p, s_tail);
    FILE *f = fopen(p, "ab");
    if (f == NULL) { return IVTS_ERR_IO; }
    size_t w = fwrite(fr, 1, len + FRAME_OVERHEAD, f);
    int rc = fclose(f);
    if (w != len + FRAME_OVERHEAD || rc != 0) {
        /* Ghi lỗi giữa chừng: cắt phần dở ngay, đừng để khung nửa vời giữa hai khung tốt. */
        uint32_t end;
        (void)scan_segment(s_tail, 0, &end);
        (void)truncate(p, (off_t)end);
        s_tail_size = end;
        return IVTS_ERR_IO;
    }
    s_tail_size += (uint32_t)(len + FRAME_OVERHEAD);
    xSemaphoreTake(s_mx, portMAX_DELAY);
    s_pending++;
    xSemaphoreGive(s_mx);
    return IVTS_OK;
}
```

Peek đọc khung tại `(s_rd_seg, s_rd_off)` vào **ô peek** (có mutex), gắn `token` tăng dần, lưu vị trí khung kế `next_seg/next_off`, rồi phát `QUEUE_READY`. Gặp cuối đoạn thì xoá đoạn đó và sang đoạn kế. Gặp khung hỏng giữa file (lỗi thẻ) thì log và bỏ phần còn lại của đoạn. Không thể đồng bộ lại trong một luồng byte mà khung không có dấu phân cách đủ mạnh, và đây là trường hợp hiếm.

```c
ivts_err_t storage_queue_do_pop(uint32_t token)
{
    xSemaphoreTake(s_mx, portMAX_DELAY);
    bool match = s_slot.full && s_slot.token == token;
    uint32_t seg = s_slot.next_seg, off = s_slot.next_off;
    if (match) { s_slot.full = false; if (s_pending > 0u) { s_pending--; } }
    xSemaphoreGive(s_mx);
    if (!match) { return IVTS_ERR_NOT_FOUND; }    /* ACK trùng / trễ: bỏ qua */
    s_rd_seg = seg;
    s_rd_off = off;
    /* Cursor ghi THƯA: reset thì gửi lại tối đa 15 bản ghi. message_id trong bản ghi -> cloud khử trùng. */
    if (++s_pops >= CURSOR_EVERY || storage_queue_pending() == 0u) { cursor_save(); }
    return IVTS_OK;
}
```

Cursor ghi mỗi 16 lần pop thay vì mỗi lần. Lý do: replay chạy khoảng 1 bản ghi/giây (mỗi PUB chờ PUBACK), ghi file 16 byte mỗi giây là cập nhật FAT + directory entry liên tục, vừa hao thẻ vừa chậm. Ghi thưa an toàn chính là nhờ at-least-once + `message_id`. Không có `message_id` ổn định thì tối ưu này sai.

### Replay trong `app_publish.c`

Có hai race chỉ lộ ra khi đọc kỹ luồng bất đồng bộ:

1. **Pop là bất đồng bộ.** App nhận ACK → `storage_queue_pop(token)` vào queue của storage → tick kế của app thấy ô peek **vẫn còn** bản vừa ACK (storage chưa kịp xử lý) → gửi lại lần hai. Sửa bằng `popped_token`.
2. **Peek có thể không trả lời.** Đếm `pending` lệch với file thật (đoạn bị xóa ngoài ý muốn) thì storage không phát `QUEUE_READY`, và cờ `replay_requested` của app kẹt mãi. Sửa bằng hạn 5 s rồi xin lại.

```c
static bool replay_from_slot(void)
{
    uint8_t b[IVTS_RECORD_MAX_SIZE];
    size_t n = 0;
    uint32_t token = 0;
    ivts_record_t r;
    if (storage_queue_peek_copy(b, sizeof b, &n, &token) != IVTS_OK) { return false; }
    /* pop là bất đồng bộ: ô còn bản vừa ACK cho tới khi task storage xử lý -> đừng gửi lại nó. */
    if (token == g_app.popped_token) { return true; }
    if (ivts_record_decode(b, n, &r) != IVTS_OK) {
        (void)storage_queue_pop(token);           /* bản ghi version lạ: bỏ, không kẹt hàng đợi */
        g_app.popped_token = token;
        return true;
    }
    ivts_msg_meta_t m = meta(r.seq);
    m.boot_id = r.boot_id;                        /* id GỐC của bản ghi, không phải boot hiện tại */
    size_t len = 0;
    if (ivts_payload_rawdata(&m, &r, s_buf, sizeof s_buf, &len) == IVTS_OK &&
        send(PUB_RAW_REPLAY, MODEM_TOPIC_RAWDATA, len)) {
        g_app.replay_token = token;
    }
    return true;                                  /* gửi không được: ô peek giữ nguyên, tick sau thử lại */
}

void app_publish_replay_tick(void)                /* FSM phát IVTS_ACT_REPLAY khi link up && pending > 0 */
{
    if (g_app.pub_inflight || g_app.link != IVTS_LINK_BROKER_UP || storage_queue_pending() == 0u) { return; }
    if (replay_from_slot()) { g_app.replay_requested = false; return; }
    if (g_app.replay_requested && app_now() - s_peek_asked_at < 5000u) { return; }
    if (storage_queue_request_peek() == IVTS_OK) {
        g_app.replay_requested = true;
        s_peek_asked_at = app_now();
    }
}
```

`m.boot_id = r.boot_id` là dòng quan trọng nhất của M8. Bản ghi chụp ở boot 41 và replay ở boot 42 vẫn phải mang id `00000029-...`; dùng `g_app.boot_id` hiện tại là cloud nhận hai bản khác id cho cùng một mẫu.

### Tình huống mất nguồn và kết quả

| Thời điểm mất nguồn                    | Sau khi boot lại                                                             |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| Giữa `fwrite` một khung                 | khung dở bị cắt; mẫu đó mất (chưa từng được xác nhận đã lưu) |
| Sau khi PUB được ACK, trước khi pop    | bản ghi gửi lại → cloud khử trùng                                       |
| Giữa hai lần ghi cursor                   | tối đa 15 bản ghi gửi lại                                                |
| Giữa lúc ghi `CURSOR.BIN`               | CRC sai → đọc từ đầu đoạn cũ nhất → cả đoạn gửi lại           |
| Giữa xoá đoạn đã đọc và ghi cursor | cursor trỏ vào đoạn không còn → ngoài dải → đọc từ head          |

Không dòng nào dẫn tới mất một mẫu đã lưu xong; mọi sai lệch đều ngả về phía gửi trùng.

### Kiểm chứng

- **Host test:** `test_record` 19 check (khứ hồi, little-endian tường minh, golden CRC độc lập, version lạ, buffer thiếu).
- **Chưa có host test cho `storage_queue.c`**, vì nó gọi `fopen` và FreeRTOS. Cách làm ở M12: tách logic khung (`read_frame`, `scan_segment`, quy tắc cursor) sang một file thuần nhận buffer, rồi test bằng file trên host (POSIX `fopen` có sẵn), kể cả cắt file ở mọi offset để mô phỏng mất nguồn.
- **Trên board:**
  1. Chặn broker 10 phút khi xe chạy (đổi host MQTT sai qua command, hoặc rút antenna LTE): log `storage: init ... pending=` tăng sau mỗi lần reset, khoảng 600.
  2. Nối lại: `mosquitto_sub` thấy các `message_id` cũ chạy qua khoảng 1/s; `pending` giảm về 0.
  3. Rút nguồn giữa lúc replay, cắm lại: một số `message_id` xuất hiện hai lần (tối đa 16), không id nào biến mất. Script đối chiếu: lấy tập `message_id` trên broker so với dãy `seq` liên tục của mỗi `boot_id`.
  4. Kiểm thẻ trên PC sau test rút nguồn: `chkdsk` không báo lỗi FAT nặng.

## 8. M9 — `obd`: ELM327, PID (thuần), NimBLE central, task cầu nối

`obd` có ba lớp: giao thức text ELM327 và giải mã PID (thuần, host test), glue NimBLE (callback chạy trong host task của stack), và task `obd` viết tuần tự: scan → connect → discover → init ELM → poll. Mỗi bước chờ sự kiện từ một queue với timeout. Dữ liệu ra ngoài: `OBD_LINK`, `OBD_SAMPLE` (event) và readiness/DTC (ô + `OBD_DIAG_READY`, vì 3 danh sách DTC + readiness khoảng 200 B).

```cmake
idf_component_register(
    SRCS "src/obd.c" "src/elm327.c" "src/obd_pid.c" "src/obd_ble.c" "src/obd_os.c"
    INCLUDE_DIRS "include"
    REQUIRES ivts-core
    PRIV_REQUIRES bt esp_timer
)
```

### `obd.h`

```c
typedef struct {
    ivts_sink_t sink;
    char        target_addr[18];   /* "AA:BB:CC:DD:EE:FF", rỗng = tự dò theo service 0x18F0 */
    uint16_t    poll_ms;           /* chu kỳ một vòng PID 0C/0D/05/04/2F */
    uint16_t    diag_period_s;     /* chu kỳ 0101 + DTC 03/07/0A */
    uint8_t     task_prio;
    uint32_t    task_stack;
} obd_cfg_t;

/* Gọi SAU storage_init(): nimble_port_init đụng NVS (PHY/bonding), NVS phải init rồi. */
ivts_err_t obd_init(const obd_cfg_t *cfg);
ivts_err_t obd_start(void);        /* FSM: IVTS_ACT_OBD_START */
ivts_err_t obd_stop(void);
ivts_err_t obd_diag_copy(ivts_obd_readiness_t *rd, ivts_dtc_list_t *stored,
                         ivts_dtc_list_t *pending, ivts_dtc_list_t *permanent);
```

### `elm327.c` (thuần)

Chuỗi init giữ nguyên repo gốc: `ATZ` (3000 ms, adapter reboot), `ATE0`, `ATL0`, `ATS0`, `ATH0`, `ATSP0` (1000 ms mỗi lệnh). `elm_reply_valid()` là bản port của `elm327_reply.h` gốc, kèm toàn bộ kịch bản của `test_elm327_reply.c` gốc. Phần mới là trích byte:

```c
/* Lấy byte dữ liệu của reply mode `mode`: bỏ echo, "SEARCHING...", dòng đếm byte ISO-TP ("00A"),
 * tiền tố khung "0:", khoảng trắng. Ghi từ byte mode+0x40. Nhiều ECU trả lời -> lấy ECU đầu. */
ivts_err_t elm_extract_bytes(const char *reply, uint8_t mode, uint8_t *out, size_t cap, size_t *n)
{
    uint8_t want = (uint8_t)(mode + 0x40u);
    size_t got = 0;
    bool started = false;
    const char *s = reply;
    while (*s != '\0' && *s != '>') {
        const char *e = s;
        while (*e != '\0' && *e != '\r' && *e != '\n' && *e != '>') { e++; }
        uint8_t tmp[64];
        int k = (e > s) ? line_bytes(s, e, tmp, sizeof tmp) : -1;   /* -1: có ký tự không phải hex, hoặc số chữ số lẻ */
        bool frame = (memchr(s, ':', (size_t)(e - s)) != NULL);
        if (k > 0 && (size_t)k <= sizeof tmp) {
            if (!started) {
                for (int i = 0; i < k; i++) {
                    if (tmp[i] == want) {
                        started = true;
                        for (int j = i; j < k && got < cap; j++) { out[got++] = tmp[j]; }
                        break;
                    }
                }
            } else if (frame) {
                for (int j = 0; j < k && got < cap; j++) { out[got++] = tmp[j]; }   /* khung ISO-TP tiếp */
            } else {
                break;                                                             /* ECU thứ hai */
            }
        }
        s = (*e == '\0' || *e == '>') ? e : e + 1;
    }
    *n = got;
    return started ? IVTS_OK : IVTS_ERR_NOT_FOUND;
}
```

Dòng đếm byte `00A` có 3 chữ số (lẻ) nên `line_bytes` trả -1 và bị bỏ tự nhiên. Dòng echo `010C` là hex hợp lệ nhưng không chứa `0x41` nên cũng bị bỏ. Định dạng nhiều khung `0:`/`1:` là cách ELM327 hiển thị ISO-TP khi tắt header; test dùng chuỗi dựng tay theo mẫu đó, **cần đối chiếu log thật của xe**.

### `obd_pid.c` (thuần)

Công thức theo SAE J1979 (đối chiếu en.wikipedia.org/wiki/OBD-II\_PIDs):

| PID | Đại lượng | Công thức  | Kiểu        |
| --- | ------------- | ------------ | ------------ |
| 04  | engine load   | 100·A/255 % | `uint8_t`  |
| 05  | coolant       | A − 40 °C  | `int16_t`  |
| 0C  | rpm           | (256A + B)/4 | `uint16_t` |
| 0D  | speed         | A km/h       | `uint8_t`  |
| 2F  | fuel level    | 100·A/255 % | `uint8_t`  |

```c
/* Readiness PID 01: A7 MIL, A6..0 số DTC; B3 = 1 nén cháy; B0..2 có mặt, B4..6 chưa xong (misfire, fuel, components);
 * C (có mặt) / D (chưa xong) theo loại động cơ. 0 = xong. */
static ivts_monitor_status_t mon(uint8_t avail, uint8_t incomplete, unsigned bit)
{
    if ((((unsigned)avail >> bit) & 1u) == 0u) { return IVTS_MON_UNSUPPORTED; }
    return (((unsigned)incomplete >> bit) & 1u) ? IVTS_MON_INCOMPLETE : IVTS_MON_COMPLETE;
}

ivts_err_t obd_dtc_decode(const uint8_t *b, size_t n, ivts_dtc_list_t *d)
{
    if (b == NULL || d == NULL || n < 1u) { return IVTS_ERR_INVALID_ARG; }
    if (b[0] != 0x43u && b[0] != 0x47u && b[0] != 0x4Au) { return IVTS_ERR_INVALID_ARG; }
    memset(d, 0, sizeof(*d));
    d->valid = true;
    size_t i = 1;
    /* CAN (ISO 15765-4) có byte đếm sau mode, giao thức cũ thì không. Với ATH0 không phân biệt
     * được bằng header, nên dùng tính chẵn lẻ: phần sau mode lẻ -> byte đầu là đếm. */
    if (((n - 1u) % 2u) == 1u) { i = 2; }
    for (; i + 1u < n; i += 2u) {
        if (b[i] == 0u && b[i + 1u] == 0u) { continue; }   /* đệm của khung */
        if (d->count >= IVTS_DTC_MAX_CODES) { d->truncated = true; break; }
        obd_dtc_format(b[i], b[i + 1u], d->codes[d->count++]);   /* 2 bit cao: P/C/B/U */
    }
    return IVTS_OK;
}
```

Hai chỗ không chắc chắn từ tài liệu, nên ghi rõ ra đây:

- **Byte đếm DTC trên CAN:** Wikipedia chỉ nói mỗi DTC 2 byte và đi qua ISO-TP, không xác nhận byte đếm. Heuristic chẵn lẻ giống các thư viện mở và có thể sai khi ECU trả đệm lẻ. Bật `ATH1` để đọc header (`7E8`) sẽ biết chắc là CAN.
- **Bit C4 của readiness (spark):** bản J1979 cũ là "A/C refrigerant", Wikipedia hiện ghi "gasoline particulate filter". Field giữ tên `ac_refrigerant` theo model gốc, comment ghi cả hai nghiĩa.

### `obd_ble.c`: callback chỉ copy rồi return

Callback NimBLE (`gap_cb`, `svc_cb`, `chr_cb`, `dsc_cb`, `write_cb`) chạy trong host task của stack. Chờ hoặc gọi API GATT đồng bộ trong đó có thể deadlock host, còn gọi sink app thì trộn luồng sự kiện BLE vào luồng nghiệp vụ. Mọi callback chỉ dựng một `bev_t` 80 byte rồi `xQueueSend(..., 0)` vào queue của task `obd`.

```c
static int gap_cb(struct ble_gap_event *ev, void *arg)
{
    bev_t e = {0};
    switch (ev->type) {
    case BLE_GAP_EVENT_DISC:
        if (g_obd_cfg.target_addr[0] == '\0' && !adv_has_svc(&ev->disc)) { return 0; }   /* lọc service 0x18F0 */
        e.type = BEV_ADV;
        e.addr[0] = ev->disc.addr.type;
        memcpy(&e.addr[1], ev->disc.addr.val, 6);
        break;
    case BLE_GAP_EVENT_CONNECT:
        e.type = BEV_CONNECTED; e.status = (int16_t)ev->connect.status; e.conn = ev->connect.conn_handle;
        break;
    case BLE_GAP_EVENT_DISCONNECT:
        e.type = BEV_DISCONNECTED; e.status = (int16_t)ev->disconnect.reason;
        break;
    case BLE_GAP_EVENT_NOTIFY_RX: {
        e.type = BEV_NOTIFY;
        uint16_t n = OS_MBUF_PKTLEN(ev->notify_rx.om);
        if (n > sizeof e.data) { n = sizeof e.data; }          /* MTU mặc định 23 -> ≤ 20 byte mỗi notify */
        if (os_mbuf_copydata(ev->notify_rx.om, 0, n, e.data) != 0) { return 0; }
        e.len = (uint8_t)n;
        break;
    }
    default:
        return 0;
    }
    (void)obd_post(&e);                                     /* xQueueSend(..., 0): host task không bao giờ chờ */
    return 0;
}
```

`mbuf` của notify thuộc stack và chỉ sống trong callback, nên phải copy dữ liệu ra ngay (`os_mbuf_copydata`). Chuyển con trỏ `om` sang task khác là lỗi use-after-free kinh điển. API như `ble_gattc_disc_*`, `ble_gattc_write_*` được gọi từ task `obd`: host NimBLE có khoá riêng (`ble_hs_lock`) nên gọi từ task khác là hợp lệ, kết quả về qua callback.

UUID lấy từ `ble_obd.c` gốc: service `0x18F0`, RX notify `0x2AF0`, TX write `0x2AF1`. Adapter ELM327 hãng khác hay dùng `FFF0/FFF1/FFF2`; khi đổi adapter thì đây là chỗ sửa đầu tiên. CCCD được **tìm bằng discover descriptor** (UUID 0x2902), không giả định nằm ở `val_handle + 1`: phần lớn adapter đúng như vậy, nhưng spec GATT không ép.

Các chữ ký đã kiểm trong header NimBLE của 6.1.1: `esp_err_t nimble_port_init(void)`, `nimble_port_freertos_init(TaskFunction_t)`, `ble_gap_disc(own_addr_type, duration_ms, params, cb, arg)`, `ble_gap_connect(own_addr_type, peer, duration_ms, params, cb, arg)`, `ble_gattc_disc_svc_by_uuid`, `ble_gattc_disc_all_chrs`, `ble_gattc_disc_all_dscs`, `ble_gattc_write_flat`, `ble_gattc_write_no_rsp_flat`.

### `obd_os.c`: phiên tuần tự với timeout

```c
/* Chờ sự kiện kiểu `want` (0xFF = bất kỳ, 0xFE = chỉ chờ hết hạn). DISCONNECTED / CTRL_STOP luôn cắt ngang.
 * NOTIFY đổ vào s_rx; chờ NOTIFY nghĩa là chờ tới khi reply có '>'. */
static bool wait_ev(uint8_t want, uint32_t timeout_ms, bev_t *out)
{
    uint64_t end = now_ms() + timeout_ms;
    for (;;) {
        uint64_t t = now_ms();
        if (t >= end) { return false; }
        bev_t e;
        if (xQueueReceive(s_q, &e, pdMS_TO_TICKS(end - t)) != pdTRUE) { return false; }
        switch (e.type) {
        case BEV_SYNCED:       s_synced = true; break;
        case BEV_CTRL_START:   s_want = true; break;
        case BEV_CTRL_STOP:    s_want = false; return false;
        case BEV_DISCONNECTED: s_link = false; return false;
        case BEV_NOTIFY:       (void)elm_rx_feed(&s_rx, e.data, e.len); break;
        default: break;
        }
        if (want == BEV_NOTIFY) {
            if (s_rx.complete) { return true; }      /* chỉ xong khi đã thấy '>' */
            continue;
        }
        if (want == 0xFF || e.type == want) { if (out != NULL) { *out = e; } return true; }
    }
}

static bool elm_cmd(const char *cmd, uint32_t timeout_ms)
{
    char line[16];
    snprintf(line, sizeof line, "%s\r", cmd);
    elm_rx_reset(&s_rx);
    if (obd_ble_write(s_conn, s_tx_handle, line) != 0) { return false; }
    return wait_ev(BEV_NOTIFY, timeout_ms, NULL) && s_rx.complete;
}
```

Bản nháp đầu của `wait_ev` trả về ngay ở mảnh notify đầu tiên, trong khi reply ELM327 thường đến 2–3 mảnh 20 byte. Nhánh `want == BEV_NOTIFY` hiện tại chờ đến `>`.

Vòng lặp task: chờ `SYNCED` (host đồng bộ với controller) và `CTRL_START` → `session_setup()` (scan 10 s, connect, discover, bật notify, chuỗi init) → lỗi thì backoff `{2000, 120000, 1000}` → thành công thì poll 5 PID mỗi `poll_ms`, readiness + DTC mỗi `diag_period_s`. Khi xe tắt máy mà adapter vẫn có nguồn, ELM trả `NO DATA`/`STOPPED`; task phát `OBD_LINK{ecu = NO_DATA/STOPPED}` thay vì mẫu rỗng.

### Kiểm chứng

- **Host test:** `./tools/host_test.sh elm327 obd_pid` → 41 + 33 check: toàn bộ kịch bản repo gốc, reply phân mảnh, tràn buffer 700 byte, trích byte có echo/SEARCHING/ISO-TP/hai ECU, PID biên (coolant −40, speed 255, load 100%), readiness spark và diesel, DTC có và không có byte đếm, `U0158` theo ví dụ Wikipedia, 10 DTC → `truncated`.
- **Build pass:** đã có, NimBLE central + observer theo `sdkconfig.defaults`.
- **Trên board:**
  1. Adapter cắm vào xe, nổ máy: log `OBD_LINK connected=1 elm=0` rồi `elm=1` trong 10–15 s.
  2. `OBD_SAMPLE` mỗi giây; so rpm với đồng hồ xe, đạp ga phải thấy tăng.
  3. Bật log DEBUG và ghi lại reply thô của `03` trên xe có lỗi thật: xác nhận có hay không byte đếm, rồi thêm chính chuỗi đó vào `test_obd_pid.c` làm regression.
  4. Rút adapter khi đang poll: `OBD_LINK connected=0`, backoff 2 → 4 → 8 s..., cắm lại thì tự nối.

## 9. M10 — FSM thuần, vòng lặp app, sleep, RTC context, command (D3)

Mọi quyết định nghiệp vụ của M10 nằm trong `ivts-core/fsm`, gồm ignition debounce, khi nào publish, khi nào ngủ và ngủ kiểu gì. Đây là hàm thuần nhận `(state, input, now)` và trả `(state mới, danh sách action)`. `app` chỉ gom input, gọi FSM, rồi thực thi action. Nhờ vậy mọi kịch bản "tắt máy 14 s rồi nổ lại" hay "thức theo motion rồi đứng yên 5 phút" chạy được trong vài mili giây trên host, không cần xe.

### `fsm/axes.c` — trục ignition / motion / vehicle

Repo gốc không có dây ignition. Ignition suy từ áp nguồn xe: máy nổ thì máy phát sạc, áp > 13 V; tắt máy thì ắc quy khoảng 12,4 V.

```c
bool ivts_axes_on_power(ivts_axes_t *a, const ivts_axes_cfg_t *c, uint16_t vehicle_mv, ivts_ms_t now)
{
    uint16_t off_below = (c->hysteresis_mv < c->on_threshold_mv) ? (uint16_t)(c->on_threshold_mv - c->hysteresis_mv) : 0u;
    ivts_ignition_t raw;
    if (vehicle_mv >= c->on_threshold_mv)  { raw = IVTS_IGN_ON; }
    else if (vehicle_mv < off_below)       { raw = IVTS_IGN_OFF; }
    else { raw = (a->ign == IVTS_IGN_UNKNOWN) ? IVTS_IGN_OFF : a->ign; }   /* trong dải trễ: giữ ý kiến hiện tại */

    if (raw != a->candidate) { a->candidate = raw; a->candidate_since = now; }
    if (raw == a->ign) { return false; }
    /* Lúc boot (UNKNOWN) chốt ngay mẫu đầu: chờ off_hold_ms (15 s) chỉ để biết đang tắt máy
     * thì làm boot chậm vô ích. Debounce dùng cho chuyển trạng thái, không cho lần đầu. */
    uint32_t hold = (a->ign == IVTS_IGN_UNKNOWN) ? 0u : (raw == IVTS_IGN_ON) ? c->on_hold_ms : c->off_hold_ms;
    if (ivts_elapsed(now, a->candidate_since) >= hold) { a->ign = raw; return true; }
    return false;
}
```

Debounce bất đối xứng: lên ON sau 1,5 s (`CONFIG_IVTS_IGNITION_ON_HOLD_MS`, gốc `TRACKER_IGNITION_DEBOUNCE_MS`), xuống OFF sau 15 s (`config.ignition_off_hold_ms`). Cú sụt áp khi đề máy (ắc quy tụt xuống 9–10 V vài trăm ms) không được làm xe "tắt máy" giữa chuyến. Dải trễ 500 mV chống dao động khi áp nằm sát ngưỡng (đèn pha + quạt kéo áp xuống 12,9 V lúc nổ máy chạy không tải). Motion: mỗi `MOTION_IRQ` đặt `MOVING`, không có IRQ trong 30 s thì `STATIONARY`. `ivts_axes_vehicle()` ghép hai trục thành 7 giá trị của `ivts_vehicle_t`.

### `fsm/fsm.c` — bảy state

| Từ              | Điều kiện                                                  | Tới                    | Action                               |
| ---------------- | ------------------------------------------------------------- | ----------------------- | ------------------------------------ |
| `INIT`         | luôn                                                         | `CHECK_IGN`           | `GNSS_ON`                          |
| `CHECK_IGN`    | ign ON                                                        | `DRIVING`             | `OBD_START`, `GNSS_ON`           |
| `CHECK_IGN`    | ign OFF (hoặc UNKNOWN quá 5 s), thức vì motion            | `ALARM`               | `GNSS_ON`                          |
| `CHECK_IGN`    | ign OFF, thức vì timer                                      | `HEARTBEAT`           |                                      |
| `CHECK_IGN`    | ign OFF, cấp nguồn                                          | `PARKED`              |                                      |
| `DRIVING`      | mỗi `tracking_ms` / mỗi 60 s                              | —                      | `PUBLISH_RAW` / `PUBLISH_STATUS` |
| `DRIVING`      | ign OFF (đã debounce 15 s)                                  | `PARKED`              | `OBD_STOP`                         |
| `PARKED`       | ign ON / motion                                               | `DRIVING` / `ALARM` |                                      |
| `PARKED`       | ≥ 20 s, đã gửi xong (hoặc không mạng), hoặc quá 90 s | `SLEEP`               | `SLEEP`, `GNSS_OFF`              |
| `ALARM`        | mỗi `alarm_ms`                                             | —                      | `PUBLISH_RAW`                      |
| `ALARM`        | đứng yên và ≥ `alarm_timeout_ms`                       | `PARKED`              |                                      |
| `HEARTBEAT`    | status đã ACK (hoặc quá 90 s)                             | `SLEEP`               |                                      |
| `SLEEP`        | light sleep thức (app gọi `ivts_fsm_woke`)                | `CHECK_IGN`           |                                      |
| mọi state thức | link up và còn hàng offline                                | —                      | `REPLAY`                           |

`ota_active` (đang tải hoặc đang chờ confirm) chặn mọi đường vào `SLEEP`, kể cả khi đã quá `awake_max_ms`.

```c
static void enter_sleep(ivts_fsm_t *f, const ivts_fsm_cfg_t *c, ivts_fsm_out_t *out, ivts_ms_t now)
{
    go(f, out, IVTS_ST_SLEEP, now);
    out->actions |= IVTS_ACT_SLEEP | IVTS_ACT_GNSS_OFF;
    out->sleep_s = c->heartbeat_s;
    if (!c->sleep_enabled) {
        out->sleep_mode = IVTS_SLEEP_FAKE;       /* thức nhưng hành xử như đang ngủ (debug) */
        out->sleep_arm_motion = c->imu_wakeup_enabled;
    } else if (c->imu_wakeup_enabled && !c->deep_wake_on_motion) {
        /* Chân INT không phải RTC GPIO: deep sleep không thể thức theo motion.
         * Muốn giữ cảnh báo trộm thì phải dùng light sleep (tốn dòng hơn). */
        out->sleep_mode = IVTS_SLEEP_LIGHT;
        out->sleep_arm_motion = true;
    } else {
        out->sleep_mode = IVTS_SLEEP_DEEP;
        out->sleep_arm_motion = c->imu_wakeup_enabled;
    }
}
```

Chỗ này nối phát hiện GPIO36 ở phần 0 với một quyết định sản phẩm. Trên board hiện tại, "có cảnh báo trộm" đồng nghĩa "chỉ light sleep". Light sleep của S3 tốn cỡ vài trăm µA tới 1 mA tùy cấu hình, deep sleep cỡ 7–8 µA cho riêng chip; con số thật phải đo (phần 11). FSM nhận `deep_wake_on_motion` từ `board_motion_deep_wake_capable()`, nên khi board rev sau đi lại dây INT, code FSM không phải sửa.

`ivts_fsm_device_state()` ánh xạ 7 state sang `ivts_device_state_t` gửi cloud: `INIT → BOOTING`, `CHECK_IGN → WAKING`, `ALARM → ALARM`, `SLEEP → SLEEP_PREPARE`, còn lại `ACTIVE`. `OTA` do app đè khi `ota_running()`.

### `app.c` — vòng lặp

```c
static void app_task(void *arg)
{
    board_wake_t bw = board_wake_cause();
    ivts_wake_t wake = (bw == BOARD_WAKE_IMU) ? IVTS_WAKE_MOTION : (bw == BOARD_WAKE_TIMER) ? IVTS_WAKE_TIMER : IVTS_WAKE_POWER_ON;
    ivts_axes_init(&g_app.axes);
    ivts_fsm_init(&g_app.fsm, app_now(), wake);
    uint64_t next_tick = 0;
    for (;;) {
        ivts_event_t ev;
        if (app_os_receive(&ev, TICK_MS)) {
            dispatch(&ev);
            while (app_os_receive(&ev, 0)) { dispatch(&ev); }     /* rút hết rồi mới chạy FSM */
        }
        uint64_t now = app_now();
        if (now < next_tick) { continue; }
        next_tick = now + TICK_MS;                                 /* 200 ms */

        (void)ivts_axes_tick(&g_app.axes, &g_app.axes_cfg, now);
        ivts_fsm_in_t in = {
            .now = now, .ignition = g_app.axes.ign, .motion = g_app.axes.motion, .wake = g_app.fsm.wake,
            .link_up = (g_app.link == IVTS_LINK_BROKER_UP), .publish_idle = !g_app.pub_inflight,
            .queue_pending = storage_queue_pending(),
            .ota_active = ota_running() || g_app.ota_confirm_pending,
        };
        ivts_fsm_out_t out;
        ivts_fsm_step(&g_app.fsm, &g_app.fsm_cfg, &in, &out);
        execute(&out);                  /* GNSS on/off, OBD start/stop, publish, replay, sleep */
        ota_confirm_tick();             /* phần 10 */
        if (!g_app.pub_inflight && g_app.fw_dirty)    { app_publish(PUB_FW); }
        if (!g_app.pub_inflight && g_app.event_dirty) { app_publish(PUB_EVENT); }
    }
}
```

`dispatch()` cập nhật snapshot (`app_state_on_event`) rồi xử lý theo loại: `POWER_SAMPLE` → `ivts_axes_on_power`, `MOTION_IRQ` → `ivts_axes_on_motion`, `LINK_STATE` → `g_app.link`, `MQTT_ACK` → `app_publish_on_ack`, `CMD_PENDING` → `app_cmd_handle`, `QUEUE_READY` → replay, `OTA_PROGRESS` → phần 10, `CONFIG_CORRUPT` → đặt cờ event. Rút hết queue trước khi chạy FSM để FSM luôn thấy input mới nhất. Nếu chạy FSM sau mỗi event, một loạt `POWER_SAMPLE` dồn lại sau khi app bận sẽ sinh ra các bước FSM dựa trên áp cũ.

### `app_state.c` — writer duy nhất của snapshot

Snapshot `ivts_telemetry_t` (304 B) là `static` trong `app_state.c`; chỉ task app đọc và ghi, nên không cần khoá. Hai luật nhỏ: mất kết nối OBD thì xóa số liệu OBD (không gửi rpm cũ như rpm sống); fix GNSS hợp lệ mà RTC chưa tin cậy thì `board_time_set()` từ giờ GNSS. `app_state_make_record()` chụp mẫu và cấp `seq` mới; đây là nơi duy nhất `seq` cho rawdata được cấp.

### `app_rtc_ctx.c` — sống qua deep sleep

```c
#define CTX_MAGIC   0x52544358u   /* "RTCX" */
#define CTX_VERSION 1u
typedef struct {
    uint32_t magic; uint16_t version; uint16_t size;
    uint32_t boot_id; uint32_t seq; uint8_t last_state; uint8_t pad[3];
    uint32_t crc;
} rtc_ctx_t;
static RTC_DATA_ATTR rtc_ctx_t s_ctx;

bool app_rtc_ctx_load(uint32_t *boot_id, uint32_t *seq)
{
    bool ok = s_ctx.magic == CTX_MAGIC && s_ctx.version == CTX_VERSION &&
              s_ctx.size == sizeof s_ctx && s_ctx.crc == ctx_crc(&s_ctx);
    if (!ok) { memset(&s_ctx, 0, sizeof s_ctx); return false; }   /* sai CRC: về mặc định, không đoán */
    *boot_id = s_ctx.boot_id;
    *seq = s_ctx.seq;
    /* ... */
    return true;
}
```

`RTC_DATA_ATTR` nằm trong RTC slow memory, giữ qua deep sleep. Sau mất nguồn nó là rác hoặc giá trị nạp từ image. Magic + version + size + CRC quyết định có dùng hay không, nên không phụ thuộc việc bootloader có nạp lại vùng này sau soft reset hay không. `last_state` hiện chỉ để chẩn đoán. Ngữ cảnh OTA **không** đặt ở đây mà ở NVS (phần 10), vì OTA kết thúc bằng `esp_restart`, không phải deep sleep.

### `app_sleep.c` — thực thi, không quyết định

```c
void app_sleep_enter(const ivts_fsm_out_t *out)
{
    app_state_set_device(IVTS_DEV_SLEEPING, out->sleep_mode);
    if (out->sleep_mode == IVTS_SLEEP_FAKE) { return; }        /* FSM tự hết hạn ở state SLEEP */
    (void)obd_stop();
    (void)modem_set_link(false);                  /* modem tắt nguồn bằng PWRKEY trong task modem */
    wait_link_down();                             /* chờ LINK_STATE DOWN, tối đa 8 s */
    app_rtc_ctx_save(g_app.boot_id, app_rtc_current_seq(), (uint8_t)g_app.fsm.state);
    board_sleep_req_t req = { .deep = (out->sleep_mode == IVTS_SLEEP_DEEP), .seconds = out->sleep_s, .arm_imu = out->sleep_arm_motion };
    board_wake_t w = board_sleep(&req);           /* deep: không trả về */
    ivts_wake_t why = (w == BOARD_WAKE_IMU) ? IVTS_WAKE_MOTION : (w == BOARD_WAKE_TIMER) ? IVTS_WAKE_TIMER : IVTS_WAKE_OTHER;
    ivts_fsm_woke(&g_app.fsm, app_now(), why);
    app_state_set_device(IVTS_DEV_WAKING, IVTS_SLEEP_NONE);
    (void)modem_set_link(true);
}
```

Phải chờ `LINK DOWN` trước khi ngủ. Nếu không, light sleep sẽ treo task modem giữa xung PWRKEY 3 s; GPIO giữ mức khi ngủ, nên xung kéo dài thành cả giấc ngủ và modem nhận một lệnh nhấn giữ dài bất thường. Sự kiện khác đến trong lúc chờ bị bỏ, vì snapshot sẽ làm mới khi thức. Timeout 8 s phòng khi modem đang kẹt trong một `CMQTTPUB` 65 s.

### D3: `json_reader` và `app_cmd.c`

Tokenizer kiểu jsmn: không malloc, không sửa input, không đệ quy. Giới hạn số token, độ sâu và độ dài (`IVTS_JSON_MAX_LEN` 4096). Ngữ pháp kiểm bằng một biến `want` cho biết token kế tiếp được phép là gì:

```c
typedef enum {
    W_VALUE,            /* gốc, sau ':' , sau ',' trong mảng */
    W_VALUE_OR_CLOSE,   /* ngay sau '[' */
    W_KEY,              /* sau ',' trong object */
    W_KEY_OR_CLOSE,     /* ngay sau '{' */
    W_COMMA_OR_CLOSE,   /* sau một value */
    W_NOTHING           /* gốc đã xong: chỉ còn khoảng trắng */
} want_t;

/* Trả số token (>0), hoặc lỗi dưới dạng SỐ ÂM: -IVTS_ERR_FULL (hết token), -IVTS_ERR_INVALID_ARG (sai cú pháp,
 * quá sâu, quá dài, rác sau gốc). */
int ivts_json_parse(const char *js, size_t len, ivts_jtok_t *t, size_t ntok, uint8_t max_depth);
int ivts_json_find(const char *js, const ivts_jtok_t *t, int ntok, int obj, const char *key);   /* chỉ con TRỰC TIẾP của obj */
ivts_err_t ivts_json_get_str(const char *js, const ivts_jtok_t *tok, char *out, size_t cap);   /* bỏ escape; \u > 0x7F bị từ chối */
ivts_err_t ivts_json_get_u32(const char *js, const ivts_jtok_t *tok, uint32_t *out);           /* không âm, không thập phân, không tràn */
ivts_err_t ivts_json_get_bool(const char *js, const ivts_jtok_t *tok, bool *out);
```

Bản đầu dùng hai cờ rời (`expect_key` + đếm) và chấp nhận `{"a":}`, `[1,]`, `[1 2]`. Test 23 chuỗi sai bắt được hết, và bản viết lại bằng `want` đóng mọi trường hợp đó. Lỗi thứ hai: hàm trả `IVTS_ERR_INVALID_ARG` (= 2, số dương) lẫn với "2 token", nên mọi chuỗi sai đều trông như parse thành công. Quy ước lỗi âm sửa điều này.

`ivts_json_find` chỉ nhìn con trực tiếp (`parent == obj`). Với `{"params":{"url":"A","nested":{"url":"B"}},"url":"C"}`, tìm `url` trong `params` ra `A`, không phải `B` hay `C`; test kiểm đúng tình huống này.

```c
/* app_cmd.c */
void app_cmd_handle(void)
{
    size_t len = 0;
    if (modem_cmd_take(s_js, sizeof s_js, &len) != IVTS_OK) { return; }    /* D2: lấy khỏi ô */
    int n = ivts_json_parse(s_js, len, s_tok, MAX_TOK, 4);
    char id[48] = "", cmd[32] = "";
    if (n <= 0 || s_tok[0].type != IVTS_JT_OBJ || !get_str(n, 0, "command_id", id, sizeof id) ||
        !get_str(n, 0, "command", cmd, sizeof cmd)) {
        if (id[0] != '\0') { app_publish_ack_cmd(id, "rejected", "malformed"); }
        return;
    }
    int params = ivts_json_find(s_js, s_tok, n, 0, "params");
    const char *reason = "unknown_command";
    if (strcmp(cmd, "ota_update") == 0)            { reason = params >= 0 ? do_ota(n, params) : "missing_params"; }
    else if (strcmp(cmd, "update_config") == 0)    { reason = params >= 0 ? do_config(n, params) : "missing_params"; }
    else if (strcmp(cmd, "request_location") == 0) { app_publish(PUB_RAW_LIVE); reason = NULL; }
    else if (strcmp(cmd, "reboot") == 0)           { app_publish_ack_cmd(id, "accepted", NULL); vTaskDelay(pdMS_TO_TICKS(3000)); esp_restart(); }
    app_publish_ack_cmd(id, reason == NULL ? "accepted" : "rejected", reason);
}
```

Tên command và key lấy từ `command_handler.c` gốc (`command_id`, `command`, `params`, `url`, `version`, `size`, `force`, `sha256`, các field config). `do_config` chỉ cho cloud đổi field chính sách (chu kỳ, ngưỡng, cờ ngủ), không đổi định danh hay credential qua MQTT. Giá trị > 65535 được đổi thành 0 để `ivts_config_validate` báo `TOO_LOW`, thay vì cắt bit âm thầm thành một số hợp lệ ngẫu nhiên. Config chỉ được áp dụng sau khi `storage_config_save` thành công, nên RAM và NVS không bao giờ lệch nhau.

### Kiểm chứng

- **Host test:** `./tools/host_test.sh fsm json_reader` → 67 + 53 check. FSM: đề máy sụt áp không tắt ignition, OFF cần đủ 15 s liên tục, DRIVING → PARKED → còn hàng offline thì chưa ngủ → OTA chặn ngủ → SLEEP với mode LIGHT (vì GPIO36); thức timer → HEARTBEAT → chờ ACK → ngủ; thức motion → ALARM → đúng 300 s yên lặng → PARKED; ignition không bao giờ có giá trị → sau 5 s coi là OFF; FAKE sleep tự thức sau `heartbeat_s`.
- **Build pass:** đã có.
- **Trên board:**
  1. Nguồn bàn thay ắc quy: 12,4 V → boot `PARKED`; nâng lên 14 V → sau \~1,5 s `state PARKED -> DRIVING`; hạ 9 V trong 0,5 s rồi lên lại → vẫn `DRIVING`; hạ 12,4 V → sau 15 s `DRIVING -> PARKED`.
  2. Để yên ở `PARKED` → khoảng 20–90 s sau thì `state ... -> SLEEP`, log `sleep mode=2 120s imu=1` (2 = LIGHT).
  3. Lắc thiết bị khi đang ngủ → `woke 2` → `CHECK_IGN -> ALARM` → `rawdata` mỗi 3 s.
  4. Gửi `update_config` với `tracking_interval_s: 0` → ack `rejected / invalid_config`; với `5` → `accepted`, reset vẫn giữ 5.

## 10. M11 — OTA: contract, nguồn byte (D4), ghi flash, confirm/rollback

OTA phải giải ba việc. (1) Tải image \~700 KB qua `AT+HTTPREAD` của SIM7600 mà `ota` không biết tới modem. (2) Chỉ đổi boot partition khi cả SHA-256 của cloud lẫn kiểm tra image của IDF đều đúng. (3) Sau khi boot vào image mới, chứng minh nó điều khiển được thiết bị (lên broker, status được ACK) trước khi `mark valid`; nếu không thì quay về image cũ.

### Cơ chế rollback của IDF — điều quyết định cả thiết kế

Với `CONFIG_BOOTLOADER_APP_ROLLBACK_ENABLE=y` (đã bật ở phần 0), trạng thái image trong `otadata` đi theo chuỗi: `esp_ota_set_boot_partition` → `NEW`; bootloader boot nó và đổi thành `PENDING_VERIFY`; app gọi `esp_ota_mark_app_valid_cancel_rollback()` → `VALID`. Theo tài liệu OTA của IDF (`docs/en/api-reference/system/ota.rst`, mục App rollback), nếu xảy ra **bất kỳ reboot nào** khi image còn `PENDING_VERIFY`, bootloader ghi `ABORTED` và boot image cũ.

"Bất kỳ reboot nào" gồm cả crash, task WDT, brownout, `esp_restart` và **thức từ deep sleep**, vì deep sleep wake cũng đi qua bootloader. Hệ quả:

- Cửa sổ confirm chỉ nằm trong **một lần boot**. Việc FSM chặn `SLEEP` khi `ota_active` (phần 9) là bắt buộc, không phải cho đẹp: nếu để thiết bị deep sleep trước khi confirm, lần thức sau sẽ rollback một image hoàn toàn tốt.
- Không cần tự viết "watchdog rollback". Image mới crash lúc boot thì bootloader đã lo; app chỉ cần lo trường hợp image chạy nhưng không làm được việc (không lên broker được).

Lúc viết phần này, kiểm lại code thì thấy comment cũ của `confirm.h` ghi deadline "sống sót qua các lần reboot". Điều đó sai theo tài liệu trên và đã được sửa. Deadline theo giờ thật vẫn giữ, nhưng chỉ để không phụ thuộc vào uptime.

### `ivts-core/ota/contract` và `confirm` — phần thuần

`contract.h` giữ đúng tên status, error và các mốc phần trăm của `ota_contract.h` gốc để cloud không phải đổi:

```c
typedef enum {
    IVTS_OTA_ST_ASSIGNED = 0, IVTS_OTA_ST_DOWNLOADING, IVTS_OTA_ST_VERIFYING, IVTS_OTA_ST_INSTALLING,
    IVTS_OTA_ST_REBOOTING, IVTS_OTA_ST_CONFIRMING, IVTS_OTA_ST_SUCCESS, IVTS_OTA_ST_FAILED,
    IVTS_OTA_ST_ROLLED_BACK, IVTS_OTA_ST_COUNT
} ivts_ota_status_t;
/* % cố định theo pha: ASSIGNED 0, DL 5..90, VERIFYING 92, INSTALLING 96, CONFIRMING 99, DONE 100 */

typedef struct {
    char url[256]; char sha256_hex[65]; char version[32]; char job_id[80];
    uint32_t size; uint32_t confirm_timeout_s; bool force;
} ivts_ota_cmd_t;
```

Quyết định confirm là một hàm thuần, test 9 check:

```c
typedef struct {
    bool     pending;
    uint32_t timeout_s;                 /* kẹp [60, 3600] lúc nhận command, mặc định 180 */
    uint64_t deadline_unix_ms;          /* 0 nếu lúc cài chưa có giờ tin cậy */
    char     job_id[80];                /* để sau reboot vẫn báo đúng job */
    char     target_version[32];
} ivts_ota_pending_t;

ivts_confirm_t ivts_ota_confirm_decide(const ivts_ota_pending_t *p, bool healthy,
                                       uint64_t now_unix_ms, bool time_trusted, ivts_ms_t uptime_ms)
{
    if (p == NULL || !p->pending) { return IVTS_CONFIRM_ACCEPT; }
    if (healthy)                  { return IVTS_CONFIRM_ACCEPT; }     /* sức khoẻ thắng hạn chót */
    if (time_trusted && p->deadline_unix_ms != 0u) {
        return (now_unix_ms >= p->deadline_unix_ms) ? IVTS_CONFIRM_ROLLBACK : IVTS_CONFIRM_WAIT;
    }
    return (uptime_ms >= (ivts_ms_t)p->timeout_s * 1000u) ? IVTS_CONFIRM_ROLLBACK : IVTS_CONFIRM_WAIT;
}
```

`healthy` = `link == BROKER_UP && status_acked`. Chỉ có `BROKER_UP` là chưa đủ: image lỗi serializer vẫn kết nối được nhưng mọi payload hỏng. Phải có một `status` được PUBACK thì mới chứng minh được toàn tuyến modem → MQTT → payload chạy.

### D4: nguồn byte `ota_source_t` và RPC sang task modem

```c
/* ota/ota.h — ota không include modem */
typedef struct {
    ivts_err_t (*open)(void *ctx, const char *url, uint32_t *size, int *http_status);
    ivts_err_t (*read)(void *ctx, uint32_t offset, uint8_t *buf, size_t len, size_t *got);
    void       (*close)(void *ctx);
    void       *ctx;
} ota_source_t;

/* app_init.c — composition root nối hai bên */
static ivts_err_t src_open(void *c, const char *url, uint32_t *size, int *st) { (void)c; return modem_http_open(url, size, st); }
static ivts_err_t src_read(void *c, uint32_t off, uint8_t *b, size_t n, size_t *got) { (void)c; return modem_http_read(off, b, n, got); }
static void       src_close(void *c) { (void)c; modem_http_close(); }
```

UART và parser AT thuộc về task modem, nên task `ota` không được tự gửi `AT+HTTPREAD`. `modem_http_read` đóng gói request (con trỏ buffer của caller + semaphore) vào queue modem rồi chờ. Task modem thực thi xen giữa các việc khác và `give` semaphore **trong mọi nhánh, kể cả lỗi**. Biến bất biến này cho phép `rpc()` chờ `portMAX_DELAY` mà không treo vĩnh viễn. Buffer vẫn thuộc về task `ota`, task modem chỉ mượn trong lúc xử lý request; đó là lý do `do_read` xóa `http_dst = NULL` trước khi `give`.

Chuỗi AT (AT Command Manual SIM7600 V2.00, chương HTTP(S)):

```text
AT+HTTPTERM                      ; đóng phiên cũ nếu còn treo (bỏ qua lỗi)
AT+HTTPINIT                      ; OK
AT+HTTPPARA="URL","<url>"        ; OK
AT+HTTPACTION=0                  ; OK ... +HTTPACTION: 0,200,<datalen>   (chờ tới 120 s)
AT+HTTPREAD=<off>,<len>          ; OK, +HTTPREAD: DATA,<n>\r\n<n byte> ... +HTTPREAD: 0
AT+HTTPTERM
```

Manual ghi cú pháp `HTTPREAD` một tham số nhưng ví dụ lại dùng `AT+HTTPREAD=0,10`. Repo gốc dùng dạng `(offset,len)` và đã chạy trên board, nên bản viết lại giữ dạng đó. Đây là mục phải xác nhận bằng log thật (phần 11). `+HTTPREAD: DATA,<n>` kích hoạt `at_parser_expect_raw(n)`: parser chuyển sang chế độ đếm byte, nên ảnh nhị phân chứa `\r\nOK\r\n` không bị hiểu là kết thúc lệnh. Đây là lý do `at_parser` có chế độ raw từ phần 6.

### `ota.c` — luồng ghi flash

```c
void ota_run(const ivts_ota_cmd_t *cmd, uint16_t battery_mv, uint16_t min_mv)
{
    ota_emit(IVTS_OTA_ST_ASSIGNED, 0, 0);
    if (battery_mv < min_mv) { fail(IVTS_OTA_E_LOW_BATTERY, 0); return; }
    uint8_t want[32];
    if (ivts_sha256_hex_decode(cmd->sha256_hex, want) != IVTS_OK) { fail(IVTS_OTA_E_BAD_COMMAND, 0); return; }

    uint32_t size = 0; int status = 0;
    if (src->open(src->ctx, cmd->url, &size, &status) != IVTS_OK) { /* close; HTTP_STATUS hoặc SOURCE_OPEN */ }
    if (size == 0u || (cmd->size != 0u && size != cmd->size)) { /* close; SIZE_MISMATCH */ }

    const esp_partition_t *part = esp_ota_get_next_update_partition(NULL);
    esp_ota_handle_t h = 0;
    if (part == NULL || size > part->size || esp_ota_begin(part, size, &h) != ESP_OK) { /* BEGIN */ }

    psa_hash_operation_t hop = PSA_HASH_OPERATION_INIT;      /* IDF 6.1 = mbedTLS 4.x: dùng PSA */
    (void)psa_hash_setup(&hop, PSA_ALG_SHA_256);
    static uint8_t buf[1024];                                /* static: khỏi stack; chỉ một OTA chạy */
    for (uint32_t off = 0; off < size; ) {
        /* đọc tối đa 1 KB, thử lại 3 lần, rồi esp_ota_write + psa_hash_update; phát % mỗi 5 điểm */
        /* lỗi bất kỳ: esp_ota_abort(h); psa_hash_abort(&hop); src->close(); fail(...) */
    }
    src->close(src->ctx);

    ota_emit(IVTS_OTA_ST_VERIFYING, 92, 0);
    /* psa_hash_finish rồi so với want; sai -> esp_ota_abort, SHA256 */
    ota_emit(IVTS_OTA_ST_INSTALLING, 96, 0);
    if (esp_ota_end(h) != ESP_OK)                 { fail(IVTS_OTA_E_END, 96); return; }   /* IDF kiểm header + checksum */
    if (esp_ota_set_boot_partition(part) != ESP_OK) { fail(IVTS_OTA_E_SET_BOOT, 96); return; }
    ota_emit(IVTS_OTA_ST_REBOOTING, 99, 0);       /* ota KHÔNG tự restart: đó là quyền của app (luật 7b) */
}
```

Vì sao lại kiểm SHA-256 trước `esp_ota_end`? `esp_ota_end` chỉ biết image có hợp lệ với ESP32-S3 hay không (magic, segment, checksum, SHA của chính image nếu bật). Nó không biết đây có phải image mà cloud muốn hay không. Hash của cloud bắt được file bị thay trên server, đọc nhầm offset do lỗi `HTTPREAD`, hoặc URL trỏ nhầm bản build. Nó không thay được Secure Boot: ai đổi được cả command MQTT thì đổi được cả hash.

Mất nguồn giữa lúc ghi là an toàn: `otadata` chưa đổi, lần boot sau vẫn chạy image cũ, slot dở dang sẽ bị `esp_ota_begin` xóa lại lần sau. Chỉ có `esp_ota_set_boot_partition` mới ghi `otadata`, và IDF ghi nó theo kiểu hai bản sao luân phiên có CRC và seq.

`ota_os.c`: task `ota` (prio 3, 6 KB) chỉ được tạo trong `ota_start` và tự `vTaskDelete` khi xong, nên 6 KB trả lại heap khi không OTA. Prio 3 thấp hơn modem (6): mỗi `read` là một RPC và task modem vẫn xử lý URC/MQTT xen giữa các chunk. Ghi flash trong `esp_ota_write` tạm tắt cache và gây trễ cho task khác; với chunk 1 KB, ảnh hưởng này nhỏ, và UART RX vẫn có buffer driver 4 KB hứng.

### Phía app: nhận lệnh, lưu ngữ cảnh, quyết định lúc boot

`app_cmd.c/do_ota` từ chối lệnh nếu thiếu `url`/`sha256`, nếu đang chạy đúng version đích (`already_running`), hoặc nếu ignition ON mà không có `force` (`unsafe_runtime_window`). Không OTA lúc xe chạy vì reboot giữa chuyến làm mất tracking và dễ rơi vào vùng sóng yếu.

Khi `ota` phát `REBOOTING`, `on_ota_progress` làm ba việc theo thứ tự:

```c
if (ev->u.ota_progress.phase == IVTS_OTA_ST_REBOOTING) {
    g_app.ota_pending.pending = true;
    ivts_str_copy(g_app.ota_pending.job_id, ..., g_app.fw.job_id);
    ivts_str_copy(g_app.ota_pending.target_version, ..., g_app.fw.target_version);
    g_app.ota_pending.deadline_unix_ms = trusted ? now + timeout_s * 1000 : 0;
    (void)storage_ota_pending_save(&g_app.ota_pending);     /* 1. NVS trước */
    app_publish(PUB_FW);                                     /* 2. báo cloud (best effort) */
    vTaskDelay(pdMS_TO_TICKS(3000));
    esp_restart();                                           /* 3. chỉ app được restart */
}
```

Lúc boot, `app_init` xét ba khả năng. Khả năng thứ hai và ba chỉ được thêm khi viết phần này. Trước đó code chỉ xử lý khả năng 1, nên một lần rollback bởi bootloader sẽ im lặng: cloud không bao giờ nhận `ROLLED_BACK` và cũng mất `job_id` sau reboot.

| Image đang chạy                       | NVS `pending` | Nghĩa là                                                                     | App làm                                                                                   |
| --------------------------------------- | --------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `PENDING_VERIFY`                      | bất kỳ        | vừa cài xong                                                                 | nạp deadline + `job_id`, báo `CONFIRMING 99%`, cấm ngủ, chạy `ota_confirm_tick` |
| `VALID`, version = `target_version` | true            | đã `mark valid` nhưng mất điện trước khi xóa NVS                    | báo `SUCCESS`, xóa NVS                                                                 |
| `VALID`, version khác                | true            | image mới đã bị rollback (reboot khi còn pending, hoặc app tự rollback) | báo `ROLLED_BACK`, xóa NVS                                                             |
| `VALID`                               | false           | không có OTA dở                                                             | —                                                                                         |

Hàng thứ hai tồn tại vì `ota_mark_valid()` và `storage_ota_pending_save(&none)` là hai lần ghi flash riêng. Mất điện giữa hai lần ghi mà không so version thì lần boot sau sẽ báo nhầm `ROLLED_BACK` cho một image đã thành công. Mất điện trước khi xóa NVS ở hàng ba thì lần sau báo lại `ROLLED_BACK`; điều này vô hại vì cloud khử trùng theo `job_id`. Blob OTA trong NVS lên `OTA_VERSION 2`: blob v1 cũ bị `blob_load` từ chối (sai version/len) và coi như không có OTA dở.

### Kiểm chứng

- **Host test:** `./tools/host_test.sh ota_confirm` → 9 check (không pending → accept; healthy thắng deadline; có giờ → so deadline; không giờ → so uptime). `test_payload` kiểm payload firmware.
- **Build pass:** đã có sau khi sửa; `ivts-firmware.bin` 0xa9080 B, slot 0x180000 còn trống 56%.
- **Trên board** (đặt file `.bin` trên HTTP server công khai, tính `sha256sum`):
  1. **Đường thành công:** gửi `ota_update` → `firmware` publish 0 → 5 → … → 90 → 92 → 96 → 99 → reboot → `image PENDING_VERIFY, hạn 180s` → broker up + status ACK → `image hợp lệ: đã mark valid` → `SUCCESS 100`. Kiểm `otatool.py read_otadata` (hoặc log bootloader) thấy slot đã đổi.
  2. **Sai hash:** sửa một ký tự trong `sha256` → `FAILED / sha256`, không reboot, boot partition không đổi.
  3. **Image không lên được broker:** build bản sai `mqtt_host`, OTA với `confirm_timeout_sec: 60` → sau 60 s `quá hạn confirm: rollback` → reboot về image cũ → `ROLLED_BACK` với đúng `job_id`.
  4. **Reboot khi pending:** sau khi boot vào image mới, nhấn EN trước khi confirm → bootloader rollback → image cũ báo `ROLLED_BACK`.
  5. **Rút nguồn giữa lúc tải (\~50%)** → cắm lại vẫn chạy image cũ; OTA lại thành công.
  6. **Xác nhận dạng `HTTPREAD`:** log AT thô của chunk đầu phải có `+HTTPREAD: DATA,1024` và kết thúc bằng `+HTTPREAD: 0`; 4 byte đầu của chunk 0 là `E9` (magic image ESP).

## 11. M12 — Kiểm chứng: host test, build, đo trên board, lỗ hổng còn lại

M12 không viết thêm tính năng. Nó trả lời câu "cái gì đã được chứng minh, bằng cách nào". Có ba tầng, mỗi tầng bắt một loại lỗi khác và không tầng nào thay được tầng khác.

| Tầng                                          | Bắt được                                            | Không bắt được                     | Trạng thái                                |
| ---------------------------------------------- | ------------------------------------------------------- | --------------------------------------- | ------------------------------------------- |
| Host test (gcc + ASan/UBSan)                   | sai logic, tràn buffer, UB, lỗi parser                | timing thật, hành vi modem/cảm biến | 5700 check pass                             |
| Build IDF 6.1.1 `-Werror` + `check_layers` | sai API, `format-truncation`, phụ thuộc sai hướng | mọi thứ lúc chạy                    | pass, 10/10 luật                           |
| Trên board                                    | tất cả phần còn lại                                | —                                      | **chưa làm**: checklist bên dưới |

### Host test

`tools/host_test.sh` biên dịch mỗi `tests/host/test_*.c` cùng mọi file thuần của `ivts-core` và các file thuần của `modem`/`obd` (`at_parser.c`, `gnss_parse.c`, `elm327.c`, `obd_pid.c`). Cờ: `-std=c11 -pedantic -Wall -Wextra -Werror -Wconversion -Wshadow -Wstrict-prototypes -Wmissing-prototypes -fsanitize=address,undefined -fno-sanitize-recover=all`. `-fno-sanitize-recover` biến mọi lỗi UBSan thành crash thay vì chỉ in cảnh báo rồi để test pass.

| Test           | Check | Test            | Check          |
| -------------- | ----- | --------------- | -------------- |
| `base`       | 97    | `json_writer` | 84             |
| `backoff`    | 5024  | `json_reader` | 53             |
| `config`     | 52    | `payload`     | 27             |
| `event`      | 112   | `fsm`         | 67             |
| `civil`      | 10    | `ota_confirm` | 9              |
| `record`     | 19    | `at_parser`   | 33             |
| `gnss_parse` | 39    | `elm327`      | 41             |
| `obd_pid`    | 33    | **tổng** | **5700** |

`backoff` chiếm đa số vì nó quét hết dải giá trị jitter. Số check không phải thước đo chất lượng; điều quan trọng là test đã bắt được lỗi thật trong quá trình viết. Ví dụ: `json_reader` trả mã lỗi dương trùng số token; `at_engine` coi `+CPIN:` là URC; LF sau CR bị nuốt vào dữ liệu raw; GNSS năm `70` bị hiểu thành 2070; CRC golden của record là giá trị giữ chỗ.

### Build và luật layer

```bash
source ~/idfenv.sh            # export.sh của IDF 6.1.1
idf.py set-target esp32s3 build
./tools/check_layers.sh       # 10 luật, exit 1 nếu vi phạm
./tools/host_test.sh          # mọi test; hoặc ./tools/host_test.sh fsm json_reader
```

Kết quả hiện tại: build sạch, `ivts-firmware.bin` 0xa9080 B (slot 1,5 MB còn trống 56%), bootloader còn trống 37%. Bản PowerShell `check_layers.ps1` chưa chạy được vì máy build không có `pwsh`.

### Đo stack và heap: `app_diag.c` (mới)

Bảng task ở phần 3 là ước lượng. `CONFIG_IVTS_DIAG_STACK_LOG` (menu IVTS, mặc định tắt) `select FREERTOS_USE_TRACE_FACILITY` và cho task app gọi `uxTaskGetSystemState()` mỗi 60 s:

```c
#if CONFIG_IVTS_DIAG_STACK_LOG
void app_diag_tick(uint64_t now_ms)
{
    static uint64_t next;
    if (now_ms < next) { return; }
    next = now_ms + 60000u;
    static TaskStatus_t st[24];                    /* static: ~1 KB, chỉ task app gọi */
    UBaseType_t n = uxTaskGetSystemState(st, 24, NULL);
    for (UBaseType_t i = 0; i < n; i++) {
        ESP_LOGI(APP_TAG, "hwm %-12s prio %2u free %5u B", st[i].pcTaskName,
                 (unsigned)st[i].uxBasePriority, (unsigned)st[i].usStackHighWaterMark);
    }
    ESP_LOGI(APP_TAG, "heap free %u min %u largest %u", ...);   /* heap_caps_get_*(MALLOC_CAP_8BIT) */
}
#endif
```

Trên ESP-IDF, `StackType_t` là `uint8_t` (`portmacro.h` của Xtensa: `#define portSTACK_TYPE uint8_t`), nên `usStackHighWaterMark` tính bằng **byte**, không phải word như FreeRTOS vanilla. Chỉ đọc số sau khi đã đi qua mọi đường nặng: một OTA đầy đủ, replay vài trăm bản ghi, một lần OBD diag, một `update_config`. Quy tắc: mỗi task còn trống ≥ \~1 KB. Dưới mức đó thì tăng stack; trên 3 KB thì giảm để trả RAM. `CONFIG_FREERTOS_WATCHPOINT_END_OF_STACK` (phần 0) là lưới an toàn lúc đo: tràn stack sẽ panic ngay tại chỗ, không âm thầm ghi đè heap. `heap min` quan trọng hơn `heap free`: nó là đáy thấp nhất từng chạm tới. `largest` cho biết còn cấp được một khối 6 KB cho task `ota` hay không khi heap đã phân mảnh sau nhiều giờ chạy.

Cách bật: `idf.py menuconfig` → IVTS → bật option, hoặc thêm `CONFIG_IVTS_DIAG_STACK_LOG=y` vào `sdkconfig.defaults` của một profile debug. Đã build thử cả hai trạng thái bật/tắt.

### Đo dòng tiêu thụ

Theo tài liệu ESP Low Power của Espressif, light sleep của riêng chip ESP32-S3 cỡ 240 µA. Một số bản trích datasheet ghi 380 µA cho điều kiện tắt VDD\_SPI. Deep sleep cỡ 7–8 µA (RTC timer, có/không RTC memory). Bảng gốc nằm ở datasheet ESP32-S3 mục 5.6.2 "Current Consumption in Other Modes"; khi đo, đối chiếu đúng version datasheet cho chip revision trên board.

Trên board thật, con số của chip thường không phải phần lớn. Dòng nghỉ của regulator 12 V → 3,3 V, dòng rò của SIM7600 khi đã tắt bằng PWRKEY nhưng vẫn cấp nguồn, cầu phân áp đo nguồn xe (I = 12 V / (R1+R2), lấy giá trị điện trở từ schematic), LIS3DSH ở ODR 50 Hz, DS3231M và thẻ SD đều có thể lớn hơn chip. Vì thế cần đo ở hai điểm:

1. **Đầu vào 12 V** (PPK2 ở chế độ ampe kế, hoặc đồng hồ có thang µA nối tiếp): con số khách hàng quan tâm, quyết định ắc quy xe chịu được bao nhiêu ngày đỗ.
2. **Rail 3,3 V** (cắt jumper hoặc nối tiếp sau LDO): tách phần của chip và ngoại vi khỏi phần của regulator.

| Kịch bản             | Cách tạo                                           | Ghi lại                                                         |
| ---------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| `DRIVING` online     | 14 V, có sóng                                      | dòng trung bình 60 s và đỉnh khi modem TX                   |
| `PARKED` chờ ngủ   | 12,4 V                                               | dòng trung bình                                                |
| Light sleep, IMU armed | mặc định trên board hiện tại                   | dòng trung bình trong 5 phút                                  |
| Deep sleep, timer only | `imu_wakeup_enabled = false` qua `update_config` | dòng trung bình trong 5 phút                                  |
| Heartbeat              | thức timer                                          | tích phân điện tích (mC) một chu kỳ thức → gửi → ngủ |

Từ hai dòng cuối tính được trung bình theo `heartbeat_s`: I\_avg = (Q\_wake + I\_sleep × T\_sleep) / (T\_wake + T\_sleep). Chênh lệch light/deep chính là "giá" của cảnh báo trộm trên board hiện tại (GPIO36, phần 0/9). Đây là con số cần có trước khi quyết định có đi lại dây INT sang một RTC GPIO ở rev sau hay không. Nếu light sleep đo ra cao bất thường (> 1 mA ở rail 3,3 V), nghi phạm đầu tiên là một PM lock không được nhả: bật `CONFIG_PM_PROFILING` và gọi `esp_pm_dump_locks(stdout)` trước khi ngủ.

### Checklist trên board, theo thứ tự nên làm

Thứ tự này đi từ dưới lên. Mỗi bước chỉ phụ thuộc bước trước, nên khi hỏng thì biết ngay lớp nào hỏng.

1. Partition + rollback (phần 0): `idf.py partition-table` khớp CSV; boot log có `factory`.
2. Board (phần 4): `i2cdetect` tương đương bằng log `board_i2c` thấy 0x68 (DS3231M) và LIS3DSH; `WHO_AM_I = 0x3F`; ADC đọc 12,00 V từ nguồn bàn với sai số < 1% sau khi hiệu chỉnh gain; lắc board sinh `MOTION_IRQ`; tắt nguồn 1 phút, bật lại thì RTC vẫn đúng giờ và OSF = 0.
3. Storage (phần 5): ghi config, reset vẫn còn; rút thẻ SD khi đang chạy không crash, `sd=0`; cắm lại + reset thì queue cũ vẫn đọc được; rút nguồn giữa lúc ghi frame thì lần boot sau log `truncate partial frame`, không mất frame trước đó.
4. Modem (phần 6): log AT thô đi hết FSM `POWER → … → UP`; rút anten thì `LINK DOWN`, cắm lại thì tự lên; 8 lần fail thì power-cycle; GNSS có fix ngoài trời và log cho biết đang dùng `CGNSSINFO` hay `CGPSINFO` fallback.
5. MQTT (phần 7): broker thấy đủ bốn topic publish; mỗi publish có `MQTT_ACK`; client ID ≤ 23 byte.
6. Offline queue (phần 8): rút anten 10 phút khi `DRIVING` → file `Q*.BIN` lớn dần → cắm lại → replay theo đúng thứ tự `seq`, không thiếu; cho phép trùng (at-least-once), cloud khử theo `message_id`.
7. OBD (phần 8): với ELM327 thật, `ATZ` → `ATSP0` → `0100` thành công; rpm và tốc độ hợp lý; tắt xe thì OBD rớt và số liệu OBD bị xóa khỏi snapshot.
8. FSM + sleep (phần 9): các kịch bản nguồn bàn ở phần 9.
9. OTA (phần 10): sáu kịch bản ở phần 10.
10. Stack/heap + dòng (phần này), sau khi các bước 1–9 đã qua.

### Lỗ hổng còn lại

Xếp theo mức độ rủi ro. Mỗi mục ghi rõ cách đóng.

| #  | Vấn đề                                                                            | Vì sao quan trọng                                                     | Cách đóng                                                                                                              |
| -- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1  | `storage_queue` chưa có host test                                                | đây là nơi mất nguồn giữa chừng gây hỏng dữ liệu            | tách encode/decode frame + logic cursor ra `queue_fmt.c` thuần; test frame cụt ở mọi offset, CRC sai, cursor thưa |
| 2  | Cửa sổ khử trùng command có 32 ID | Lệnh đã rời cửa sổ có thể được xử lý lại nếu backend gửi lại | Đối chiếu thời hạn giữ lệnh trên broker với tải triển khai. |
| 3  | Dạng `AT+HTTPREAD=<off>,<len>`                                                    | manual tự mâu thuẫn                                                  | kịch bản 6 của OTA                                                                                                     |
| 4  | LIS3DSH: OUTS1 đọc có xóa ngắt không; đơn vị `THRS1_1` theo full-scale    | sai thì IRQ kẹt mức cao hoặc ngưỡng lệch                         | đọc lại AN3393 mục state machine; thử trên bàn với dải gán ngưỡng                                             |
| 5  | `IVTS_CFG_DEVICE_ID_SIZE` cho phép ID dài hơn 23                                | `CMQTTACCQ` từ chối client ID > 23 byte; hiện chỉ chặn lúc init | giảm size xuống 24 (23 + NUL) để `ivts_config_validate` chặn từ gốc                                              |
| 6  | GPIO34/35 với module octal PSRAM                                                    | nếu module là biến thể R8 (octal), hai chân này bị PSRAM chiếm  | xác nhận mã module trên board; nếu là R8 thì đổi pin map                                                         |
| 7  | Byte đếm DTC và format mode 03                                                    | mỗi ECU/giao thức trả khác (CAN có byte đếm, K-line thì không) | log thô trên ít nhất một xe CAN và một xe K-line                                                                   |
| 8  | Payload schema v2 so với backend                                                    | cloud cũ có thể không đọc field mới                              | so với parser backend trước khi lên xe thật                                                                          |
| 9  | `firmware 99%` trước reboot có thể không đi nếu đang có publish in-flight | cloud chỉ mất mốc 99%; `CONFIRMING` sau boot bù lại              | chấp nhận, hoặc chờ `pub_inflight == false` tối đa 5 s trước `esp_restart`                                    |
| 10 | `check_layers.ps1` chưa chạy                                                     | bản Windows có thể lệch bản bash                                   | chạy trên máy Windows, so output với bản `.sh`                                                                     |

Những thứ **đã được đóng** trong lúc viết tài liệu này: sai lệnh GNSS của SIM7000 (`CGNSINF`), sai thanh ghi LIS3DH (30h–33h) của repo gốc, motion không thể đánh thức deep sleep trên GPIO36, comment sai về deadline confirm qua reboot, OTA rollback im lặng và mất `job_id` sau reboot, báo nhầm `ROLLED_BACK` khi mất điện giữa `mark valid` và xóa NVS.
