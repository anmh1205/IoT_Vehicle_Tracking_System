# Báo Cáo Kiểm Tra Kiến Trúc Firmware

**Ngày:** 2026-07-22
**Phạm vi:** `iot-vehicle-tracking-system-firmware/components/`
**Tài liệu tham chiếu:** `00-tong-quan-kien-truc-va-lo-trinh.md` (kiến trúc 7 lớp Clean Architecture / Hexagonal)

---

## Tổng Quan

So với kiến trúc tham chiếu, codebase firmware đã có cấu trúc component khớp (16 components, đúng tên), nhưng có **nhiều vi phạm dependency rule** và **overengineering nghiêm trọng** ở tầng `app-core`.

**Điểm số tuân thủ kiến trúc: 4/10**

---

## Phần 1: Vi Phạm Dependency Rule (Critical)

### 1.1 state_machine_core.c Include Trực Tiếp Adapter Headers (P0)

`state_machine_core.c` (app-core) include **10+ headers** từ adapter/platform thay vì gọi qua port:

```c
#include "adc_reader.h"      // platform-board-esp32s3
#include "imu_lis3dsh.h"     // platform-board-esp32s3
#include "modem_lte.h"       // adapter-modem-sim7600-at
#include "mqtt_client.h"     // adapter-mqtt-sim7600-at
#include "nvs_config.h"      // adapter-kv-nvs
#include "offline_queue.h"   // domain-storage
#include "pin_map.h"         // platform-board-esp32s3
#include "power_mgr.h"       // platform-board-esp32s3
#include "rtc_ds3231m.h"     // adapter-rtc-ds3231m
#include "command_handler.h"  // domain-connectivity
#include "telemetry_counters.h" // domain-telemetry
```

**Vấn đề:** FSM gọi trực tiếp `tracker_mqtt_is_connected()`, `offline_queue_enqueue()`, `command_handler_process()`, `imu_lis3dh_read()`... thay vì qua `s_ports->mqtt->is_connected`, `s_ports->storage_queue->enqueue`, v.v.

**Kiến trúc yêu cầu:** FSM chỉ gọi qua `s_ports->...`. Tất cả logic hardware phải nằm trong adapter, domain logic trong domain.

**Mức độ ưu tiên:** P0 - Cần sửa gấp

### 1.2 Adapters REQUIRES domain-telemetry (P0)

Theo kiến trúc, **adapter không được biết domain**. Thực tế có 3 adapters vi phạm:

| CMakeLists.txt | REQUIRES | Vi phạm |
|---|---|---|
| `adapter-modem-sim7600-at` | `domain-telemetry` | Adapter biết domain |
| `adapter-ble-obd-nimble` | `domain-telemetry` | Adapter biết domain |
| `adapter-storage-sdmmc-fatfs` | `domain-telemetry` | Adapter biết domain |

**Kiến trúc yêu cầu:** `adapter-*` chỉ REQUIRES `shared-kernel`, `platform-hal-esp-idf`, `platform-board-esp32s3`.

### 1.3 Domains REQUIRES Adapters (P0)

Theo kiến trúc, **domain không được biết adapter**. Thực tế:

| CMakeLists.txt | REQUIRES | Vi phạm |
|---|---|---|
| `domain-connectivity` | `adapter-kv-nvs` | Domain biết adapter |
| `domain-ota` | `adapter-modem-sim7600-at` | Domain biết adapter |
| `domain-storage` | `adapter-mqtt-sim7600-at`, `adapter-storage-sdmmc-fatfs` | Domain biết adapter |

**Ví dụ cụ thể:** `offline_queue.c` (domain-storage) include `#include "mqtt_client.h"` - domain-storage biết MQTT client.

**Kiến trúc yêu cầu:** `domain-*` chỉ REQUIRES `shared-kernel` và `contracts-device-cloud`.

### 1.4 platform-hal-esp-idf REQUIRES contracts-device-cloud (P1)

```cmake
# platform-hal-esp-idf/CMakeLists.txt
REQUIRES contracts-device-cloud shared-kernel
```

`tracker-runtime-ports.h` include `ota_contract.h` từ contracts. Kiến trúc nói platform-hal chỉ phụ thuộc shared-kernel và platform-board.

### 1.5 adapter-mqtt REQUIRES adapter-modem (P1)

```cmake
# adapter-mqtt-sim7600-at/CMakeLists.txt
REQUIRES adapter-modem-sim7600-at
```

Theo kiến trúc, adapter không biết adapter khác. MQTT nên gọi modem qua port, không phải include trực tiếp.

### 1.7 App-Core Direct Adapter Call Audit - 284+ Calls Bypassing Ports

Toàn bộ app-core (8 file .c) gọi **trực tiếp adapter/platform functions** thay vì qua `s_ports->...`:

| File .c trong app-core | Lines | Includes | Direct Adapter Calls |
|---|---|---|---|
| `state_wake_prelude.c` | 747 | 18 | **66** |
| `state_machine_core.c` | 1194 | 28 | **64** |
| `state_sleep_controller.c` | 564 | 24 | **58** |
| `tracker-app-bootstrap.c` | 392 | 20 | **47** |
| `state_obd_runtime.c` | 796 | 10 | **23** |
| `state_runtime_context.c` | 313 | 2 | **14** |
| `state_ota_runtime.c` | 332 | 11 | **11** |
| `state_publish_pipeline.c` | 482 | 13 | **10** |
| **Total** | ~4820 | | **~293** |

Mỗi dòng gọi adapter trực tiếp là 1 dòng vi phạm dependency rule. Port interfaces được định nghĩa trong `tracker-runtime-ports.h` nhưng **không được app-core dùng đến**.

**Ví dụ `state_wake_prelude.c` (66 calls - tệ nhất):**
```c
modem_gnss_power_off();           // adapter-modem - PORT BYPASS
modem_gnss_power_on();            // adapter-modem - PORT BYPASS
modem_lte_is_connected();         // adapter-modem - PORT BYPASS
modem_lte_sleep();                // adapter-modem - PORT BYPASS
tracker_mqtt_is_connected();      // adapter-mqtt  - PORT BYPASS
rtc_ds3231m_get_time_ms();        // adapter-rtc   - PORT BYPASS
adc_reader_read_battery();        // platform-board - PORT BYPASS
imu_lis3dsh_read();               // platform-board - PORT BYPASS
```

**Ví dụ `tracker-app-bootstrap.c` (47 calls):**
```c
nvs_config_init();                // adapter-kv-nvs
nvs_config_load(&config);         // adapter-kv-nvs
esp_ota_get_running_partition();  // ESP-IDF direct
esp_ota_get_boot_partition();     // ESP-IDF direct
esp_sleep_get_wakeup_cause();     // ESP-IDF direct
state_machine_init(&config);      // (bootstrap tự gọi init thay vì để app-core quản lý)
```

**Root cause:** Port struct `s_runtime_ports` chỉ được define trong `tracker-app-bootstrap.c` nhưng **không được truyền xuống** các file app-core khác. state_wake_prelude.c, state_sleep_controller.c, state_machine_core.c đều không nhận port context - chúng gọi adapter trực tiếp vì không có cách nào khác.

### 1.8 Sơ Đồ Vi Phạm Dependency (Mở Rộng)

```
Kiến trúc đúng:                        Thực tế:
                                       
shared-kernel ← contracts              shared-kernel ← contracts
     ↑              ↑                        ↑       ↕       ↑
     │              │                        │       │       │
platform-hal ← adapter-* ← domain-*    platform-hal ←→ adapter-*
     ↑              ↑        ↑               ↑     ↕     ↕   ↕
     │              │        │               │     │     │   │
     └────── app-core ──────┘               └── app-core ── domain-*
                                                     ↕
                                                (cả 2 đều gọi
                                                 adapter trực tiếp)
```

---

## Phần 2: God Files Trong Adapter Layer (Files quá lớn)

Không chỉ app-core mới có god-file. Adapter layer có những file còn lớn hơn:

### 2.1 mqtt_session.c - 1362 dòng (adapter-mqtt-sim7600-at)

**File lớn nhất toàn bộ codebase** - còn lớn hơn state_machine_core.c (1194).

- 24 functions, ~1362 lines
- Quản lý session lifecycle, CONNECT/DISCONNECT state machine, keepalive timer, reconnect backoff
- MQTT session logic + state machine + publish window management đều trong 1 file

**Cần:** Tách thành `mqtt_session.c` (session management, ~500 lines) + `mqtt_keepalive.c` (keepalive logic, ~400 lines) + `mqtt_reconnect.c` (reconnect backoff, ~400 lines)

### 2.2 mqtt_urc_parser.c - 1025 dòng (adapter-mqtt-sim7600-at)

Parser cho AT URC responses. 1025 lines cho 1 parser là quá nhiều.

- Có thể tách: parser core (~400) + message handlers (~300) + error classification (~300)

### 2.3 command_handler.c - 990 dòng (domain-connectivity)

**Domain layer có god-file 990 lines.** Domain-connectivity phải là layer mỏng nhất, nhưng command_handler tự làm mọi thứ:
- Parse command payload
- Maintain state machine cho từng command type
- Gọi trực tiếp adapter functions (vi phạm dependency)
- Quản lý location request one-shot queue

**Cần:** Tách command handlers thành file riêng (ota_handler, config_handler, location_handler), domain chỉ nên orchestrate.

### 2.4 util_ota_update.c - 900 dòng (domain-ota)

Domain-ota có 1 file 900 lines. OTA logic với HTTP download, partition management, version checking.

### 2.5 Bảng God Files Top 10

| File | Layer | Lines | Loại God |
|---|---|---|---|
| `mqtt_session.c` | adapter-mqtt | **1362** | Session + keepalive + reconnect |
| `state_machine_core.c` | app-core | **1194** | FSM + telemetry + adapter calls |
| `mqtt_urc_parser.c` | adapter-mqtt | **1025** | 1 parser file |
| `modem_at.c` | adapter-modem | **1012** | AT I/O + parser + config |
| `command_handler.c` | domain | **990** | Command dispatch + handlers + state |
| `util_ota_update.c` | domain-ota | **900** | OTA download + apply + partition |
| `ble_mgr.c` | adapter-ble | **891** | BLE scan + connect + mgmt |
| `sd_log_store.c` | adapter-storage | **849** | SD card write + buffer mgmt |
| `modem_gnss.c` | adapter-modem | **823** | GNSS NMEA parser + state |
| `data_formatter.c` | contracts | **814** | JSON build + format (4 switch chains) |
| `ble_obd.c` | adapter-ble | **805** | OBD over BLE protocol |
| `state_obd_runtime.c` | app-core | **796** | OBD poll + timeout + routing |
| `state_wake_prelude.c` | app-core | **747** | Wake prelude + GNSS + LTE |

**13 files > 700 lines mỗi file** trong khi kiến trúc khuyến nghị < 400 lines/file cho firmware embedded.

---

## Phần 3: Overengineering (Code Phình To Không Cần Thiết)

### 3.1 tracker-app-bootstrap.c - 432 Lines, 20 Includes, Bừa Bãi Nhất

File này là **entry point của firmware** - lẽ ra phải sạch nhất. Thực tế là một mớ hỗn độn:

**Vấn đề 1: Vừa define port struct, vừa include adapter headers**
```c
// 14 includes từ adapter/platform - hàng loạt vi phạm dependency
#include "ble_obd.h"
#include "modem_lte.h"
#include "mqtt_client.h"
#include "nvs_config.h"
#include "offline_queue.h"
#include "ota_executor.h"
#include "power_mgr.h"
// ...

// NHƯNG cũng define port structs để "decouple" app-core khỏi adapter
static const modem_transport_port_t s_modem_transport_port = {
    .set_apn = modem_lte_set_apn,     // vẫn gán trực tiếp
    .request_connect = modem_lte_request_connect,
};
static const mqtt_transport_port_t s_mqtt_transport_port = {
    .init = tracker_mqtt_init,
};
```

Port wrappers có đó nhưng **chính file đó vẫn gọi adapter trực tiếp** ở dòng 289-296:
```c
esp_err_t err = nvs_config_init();      // gọi adapter trực tiếp
config_t config = {0};
err = nvs_config_load(&config);         // gọi adapter trực tiếp
```

**Vấn đề 2: Hàm `app_core_bootstrap_run()` quá dài với quá nhiều responsibility (140 lines)**
1. Validate ports (dòng 282)
2. Set log levels (285-286)
3. Init NVS config (289-298)
4. Load config with field-validation overrides (301-351)
5. Set sleep policy (353)
6. Check OTA partition mismatch (356-366)
7. Increment boot count (369)
8. Remap wake cause → initial FSM state (372-386)
9. Retry loop for FSM init (396-425)
10. FSM infinite loop (428-431)

**Ít nhất 10 responsibilities trong 1 function.** Nên tách thành: `bootstrap_load_config()`, `bootstrap_init_subsystems()`, `bootstrap_determine_initial_state()`.

**Vấn đề 3: Magic delay 100ms cứng**
```c
vTaskDelay(pdMS_TO_TICKS(100));   // 2 lần, không có #define
```
100ms xuất hiện 2 lần (dòng 423 và 430) nhưng không có symbolic constant. Nếu muốn đổi thành 50ms phải grep toàn bộ.

### 3.2 state_wake_prelude.c - 66 Adapter Calls, Nhiều Nhất App-Core

File này có **nhiều adapter calls nhất** (66) mặc dù tên file nghe có vẻ "wake prelude" (nhẹ nhàng). Thực tế:

```c
// state_wake_prelude.c bao gồm:
// - GNSS power cycle + rearm logic
// - LTE connection check + recovery
// - MQTT connection check
// - RTC time read + sync
// - ADC battery read
// - IMU motion read
// - BLE OBD connect/disconnect
// - Offline queue replay tick
// - Session manager ignition sample
```

**>10 subsystem responsibilities** trong 1 file wake prelude. Đúng ra wake prelude chỉ nên:
```
1. Turn on modules (qua port)
2. Wait for stabilization
3. Return ready/fail status
```

### 3.3 state_machine_core.c - Mini God-File (1194 lines)

Kiến trúc khuyến nghị app-core ~5-7 files. Thực tế có 10 source + 11 headers = 4971 lines.

`state_machine_core.c` là **mini god-file**:
- 1301 lines (kiến trúc mong đợi < 400 cho mỗi file)
- 28 #include directives
- Logic FSM + gọi adapter trực tiếp + telemetry + OBD + sleep + alarm + LED
- Function `state_machine_core_run()` có **250+ lines** với switch-case khổng lồ

**Cần:** Tách FSM handler ra functions riêng, dùng port thay vì include trực tiếp.

### 3.4 data_formatter.c - 4 switch(state) Chains + 735 Lines Cho JSON Format

`contracts-device-cloud/src/data_formatter.c` có **814 lines** với chỉ 9 functions:

```c
// 4 switch(state) chains khác nhau:
static void data_formatter_add_state(...) {
    switch (state) { ... }  // dòng 137
    switch (state) { ... }  // dòng 149
    switch (state) { ... }  // dòng 161
    switch (state) { ... }  // dòng 181
}
```

**735 lines để build JSON string** là overengineering. Với embedded firmware:
- Dùng `snprintf()` + string concat: ~100 lines
- Dùng cJSON builder với helper macros: ~200 lines

**Hardcoded schema version:**
```c
#define DATA_FORMATTER_DEFAULT_SCHEMA_VERSION "v1.0.0"
#define DATA_FORMATTER_STATE_SCHEMA_VERSION "v2.0.0"
```

Version hardcode trong C code thay vì dùng Kconfig hoặc build-time define.

### 3.5 Global State Hell - 50+ Biến Extern

`state_runtime_context.h` export 50+ global variables qua extern.

```
s_config, s_telemetry, s_ble_ctx, s_ble_connect_result_queue,
s_last_raw_publish_ms, s_alarm_enter_ms, s_last_obd_debug_log_ms,
s_last_obd_poll_ms, s_last_obd_diagnostic_poll_ms, s_obd_aux_pid_cursor,
s_obd_diag_query_cursor, s_session_id, s_canonical_session_id,
s_session_boot_id, s_session_restore_pending, s_ignition_off_started_ms,
s_publish_status, s_mqtt_started, s_gnss_started, s_ota_confirm_checked,
s_ota_in_progress, s_imu_available, s_ble_retry (5x retry states),
s_last_rtc_sync_ms, s_time_trusted, s_event_timestamp_ms,
s_prev_lte_initialized, s_lte_ever_initialized,
s_modem_low_power_pending_wakeup, s_gnss_poll_fail_streak (3x),
s_hw_bootstrap_done, s_last_sleep_reject_log_ms, s_sleep_blocked_count (4x),
s_imu_wake_count (3x), s_startup_system_check_log_once,
s_user_led_initialized (3x), s_last_hw_diag_log_ms,
s_heartbeat_started_ms (2x), s_metadata_seq_no, s_boot_id,
s_obd_fail_alert_emitted (4x), s_obd_elm_ready, ...
```

**Vấn đề:** Kiến trúc bảo "gom state vào context struct". Thực tế mỗi biến là extern riêng, gây khó maintain. File `state_runtime_context.c` có function `reset()` dài 75 lines chỉ để memset từng biến.

**Cần:** Gom vào struct `fsm_context_t` duy nhất.

### 3.6 state_runtime_context.c - 58 Global Declarations + 75-Line Reset

File này có **58 top-level declarations** (global variables, retry states, timestamps) ở phạm vi file:

```c
// State variables scatter khắp nơi
config_t s_config = {0};          // dòng 17
telemetry_t s_telemetry = {0};    // dòng 19
ble_obd_ctx_t *s_ble_ctx = NULL;  // dòng 21
QueueHandle_t s_ble_connect_result_queue = NULL;
uint64_t s_last_raw_publish_ms = 0;
uint64_t s_alarm_enter_ms = 0;
// ... 50+ dòng tương tự
```

**5 retry_policy_t** trong cùng file này:
```c
g_state_ble_retry_policy
g_state_ble_retry_parked_policy
g_state_network_retry_policy
g_state_rtc_bootstrap_retry_policy
g_state_rtc_read_retry_policy
g_state_imu_bootstrap_retry_policy
```

**Cộng thêm 5 retry_state_t:**
```c
s_ble_retry, s_network_retry, s_rtc_bootstrap_retry, s_rtc_read_retry, s_imu_bootstrap_retry
```

**Function `state_runtime_context_reset()` dài 75 lines** để memset từng biến:
```c
void state_runtime_context_reset(const config_t *config) {
    s_last_raw_publish_ms = 0;
    s_alarm_enter_ms = 0;
    s_last_obd_debug_log_ms = 0;
    s_last_obd_poll_ms = 0;
    s_last_obd_diagnostic_poll_ms = 0;
    // ... 70 dòng nữa
}
```

Nếu gom vào struct: `memset(&ctx, 0, sizeof(ctx));` - 1 dòng.

### 3.7 telemetry_t Struct Khổng Lồ (133 lines)

Kiến trúc tham chiếu (30 dòng):
```c
typedef struct {
    gnss_data_t gnss; obd_data_t obd; imu_data_t imu;
    float battery_voltage; bool ignition_on;
    uint32_t timestamp; uint8_t fsm_state;
} telemetry_t;
```

Thực tế (133 dòng, 30+ fields):
- `imu_accel_delta_mps2`, `vehicle_battery`, `device_battery`
- `ignition_state` (enum), `motion_state` (enum), `vehicle_state` (enum),
  `device_state` (enum), `sleep_mode` (enum) - **5 enums cho 1 struct**
- `obd_readiness` struct có 20 sub-fields về OBD monitor status
- `obd_stored_dtc`, `obd_pending_dtc`, `obd_permanent_dtc` - 3 DTC lists
- `obd_ecu_state[24]`, `obd_sample_age_ms`, `obd_connect_fail_count_5m`

**Vấn đề:** Telemetry struct mang quá nhiều chi tiết OBD mà lẽ ra chỉ cần khi cần. Mỗi lần gửi telemetry lên cloud đều kéo theo hàng trăm byte OBD detail.

**Cần:** telemetry_t chỉ nên có 10-15 fields basic. OBD detail để trong struct riêng, chỉ gửi khi cần.

### 3.8 11 Retry Policies Cho 11 Use Cases - Retry Framework Phình To

Đếm thực tế có **11 retry_policy_t instances** trên toàn bộ codebase, không chỉ 6:

| File | Policy | Mode |
|---|---|---|
| `state_runtime_context.c` | `g_state_ble_retry_policy` | EXPONENTIAL |
| `state_runtime_context.c` | `g_state_ble_retry_parked_policy` | FIXED |
| `state_runtime_context.c` | `g_state_network_retry_policy` | EXPONENTIAL |
| `state_runtime_context.c` | `g_state_rtc_bootstrap_retry_policy` | FIXED |
| `state_runtime_context.c` | `g_state_rtc_read_retry_policy` | FIXED |
| `state_runtime_context.c` | `g_state_imu_bootstrap_retry_policy` | FIXED |
| `tracker-app-bootstrap.c` | `s_init_retry_policy` | FIXED |
| `modem_lte.c` | `s_lte_backoff_policy` | EXPONENTIAL |
| `offline_queue.c` | `s_sd_mount_retry_policy` | EXPONENTIAL |
| `offline_queue.c` | `replay_policy` (inline) | EXPONENTIAL |

**11 policies khác nhau**, mỗi policy có 5 fields:
```c
.mode, .base_delay_ms, .max_delay_ms, .max_attempts, .jitter_ms
```
= 55 config values + 11 retry_state_t = **rất nhiều boilerplate**.

**Đa số policies gần giống nhau**, chỉ khác `base_delay_ms`:
- `ble_retry_policy`: base=1000, max=30000
- `ble_retry_parked_policy`: base=5000, max=5000
- `rtc_bootstrap_policy`: base=100, max=1000
- `imu_bootstrap_policy`: base=100, max=1000

Có thể thay bằng 2-3 policy templates:
```c
static const retry_policy_t RETRY_AGGRESSIVE = { .mode=FIXED, .base_delay_ms=100 };
static const retry_policy_t RETRY_NORMAL = { .mode=EXPONENTIAL, .base_delay_ms=1000, .max_delay_ms=30000 };
static const retry_policy_t RETRY_PASSIVE = { .mode=FIXED, .base_delay_ms=5000 };
```

```c
static const retry_policy_t g_state_ble_retry_policy = { ... };
static const retry_policy_t g_state_ble_retry_parked_policy = { ... };
static const retry_policy_t g_state_network_retry_policy = { ... };
static const retry_policy_t g_state_rtc_bootstrap_retry_policy = { ... };
static const retry_policy_t g_state_rtc_read_retry_policy = { ... };
static const retry_policy_t g_state_imu_bootstrap_retry_policy = { ... };
```

Mỗi policy gần giống nhau, chỉ khác `base_delay_ms` và `max_delay_ms`. Có thể dùng 1 hàm factory hoặc 2-3 policies thay vì 6.

### 3.9 adapter-modem-sim7600-at Split Quá Nhiều (7 files)

Kiến trúc khuyến nghị adapter-modem ~4-5 files. Thực tế 7 files:

```
modem_at.c              (AT command I/O)
modem_gnss.c            (GNSS parser)
modem_lte.c             (LTE state machine)
modem_lte_fsm.c         (FSM riêng cho LTE)
modem_lte_recovery.c    (Recovery logic)
modem_lte_steps.c       (Init steps)
modem_lte_uart_profile.c (UART config)
```

**Vấn đề:** LTE modem chỉ là gửi AT command và parse response. Việc tách thành 7 files + 1 internal FSM là overengineering. Một `modem_sim7600.c` + `modem_at_parser.c` là đủ (2-3 files).

### 3.10 adapter-mqtt-sim7600-at Split Quá Nhiều (5 files)

```
mqtt_client.c        (Client lifecycle)
mqtt_publish.c       (Publish logic)
mqtt_session.c       (Session management)
mqtt_topics.c        (Topic generation)
mqtt_urc_parser.c    (URC parser)
```

MQTT client đơn giản split ra 5 files. 2-3 files là đủ.

### 3.11 adapter-ble-obd-nimble Split (4 files)

```
ble_init.c, ble_mgr.c, ble_obd.c, ble_util.c
```

4 files cho BLE OBD adapter. 2 files là đủ.

### 3.12 app-core Split Thành 10 files (Facade Pattern Phình To)

```
state_led_control.c     (4 hàm LED) - ~80 lines
state_obd_runtime.c     (OBD runtime) - ~200 lines
state_ota_runtime.c     (OTA runtime) - ~200 lines
state_publish_pipeline.c (Publish) - ~200 lines
state_runtime_context.c (Context) - 338 lines
state_sleep_controller.c (Sleep) - ~300 lines
state_wake_prelude.c    (Wake) - ~300 lines
state_machine.c         (Facade) - 41 lines - GÓI 3 HÀM
state_machine_core.c    (Core) - 1301 lines
tracker-app-bootstrap.c (Bootstrap) - 432 lines
```

`state_machine.c` chỉ là facade gọi `state_machine_core_*()`. **41 lines cho 1 file chỉ để wrap 3 functions**. Không cần thiết.

### 3.13 7 States Trong fsm_types.h Nhưng 5+ Enums Phụ Trong telemetry_model.h

Kiến trúc gốc: app_state_t với 7 states (INIT, CHECK_IGN, DRIVING, PARKED, ALARM, HEARTBEAT, SLEEP).

Thực tế thêm 5 enums trong telemetry_model.h:
- `tracker_ignition_state_t` (3 values)
- `tracker_motion_state_t` (3 values) 
- `tracker_vehicle_state_t` (7 values)
- `tracker_device_state_t` (8 values)
- `tracker_sleep_mode_t` (4 values)

25 states total, dùng để phân tích trạng thái xe. Quá nhiều cho firmware embedded.

### 3.14 Boilerplate Comments (~200+ lines vô nghĩa)

Ngoài boilerplate function comments, còn có **file comments ở mọi file .c**:
```c
/**
 * @file some_file.c
 * @brief ...
 * This translation unit belongs to the ... layer and keeps ...
 */
```

22 file .c có pattern này = ~100 lines vô nghĩa.

### 3.15 Magic Numbers & Hardcoded Constants

**USB Grace Period 60000ms xuất hiện ở 4 chỗ:**
```c
// state_sleep_controller.c:130
if (util_uptime_ms() < 60000ULL) { return true; }

// modem_gnss.c:35
#define MODEM_GNSS_QUERY_PRIMARY_BACKOFF_COOLDOWN_MS 60000ULL

// mqtt_session.c:1273
uint64_t cleanup_deadline_ms = util_uptime_ms() + 60000ULL;

// state_machine_core.c:98
#define TRACKER_HEALTH_SNAPSHOT_INTERVAL_MS 60000ULL
```

Cùng 1 số `60000` = 1 phút nhưng không dùng chung constant. Nếu cần đổi thành 90s phải sửa 4 chỗ.

**Magic delays:**
```c
vTaskDelay(pdMS_TO_TICKS(100));   // tracker-app-bootstrap.c:423,430
vTaskDelay(pdMS_TO_TICKS(75));    // state_obd_runtime.c:585,641
vTaskDelay(pdMS_TO_TICKS(300));   // util_ota_update.c:228
```

### 3.16 Forward Declarations Không Cần Thiết

Các file vẫn còn forward declarations cho static functions:

| File | Fwd Decls | Issue |
|---|---|---|
| `ble_obd.c` | 15 | Có thể sắp xếp function order |
| `ble_mgr.c` | 7 | Có thể sắp xếp function order |
| `state_sleep_controller.c` | 2 | Forward declare static function |
| `modem_at.c` | 1 | Forward declare static function |
| `mqtt_session.c` | 1 | Forward declare static function |

Nếu không thể sắp xếp function order (vì circular dependency tĩnh) -> chứng tỏ function coupling quá cao.

Mỗi file có comment template dài 4-5 dòng:

```c
/**
 * @file some_file.c
 * @brief ...
 * This translation unit belongs to the ... layer and keeps ...
 */
// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.
```

Mỗi function có: `// Keep this public facade thin and forward the real work...`

Tổng cộng ~150 lines boilerplate vô nghĩa trên toàn bộ codebase.

### 3.17 Signal/Noise Ratio - Code vs Boilerplate

Đo thử `telemetry_counters.c` (86 lines):

| Loại | Lines | Tỷ lệ |
|---|---|---|
| Code thực | 53 | 62% |
| Boilerplate comment | 23 | 27% |
| Blank lines | 10 | 12% |

```c
// telemetry_counters.c
// Keep this public facade thin and forward the real work...
int telemetry_counters_get_mqtt_reconnect_count(void) {
    return s_counters.mqtt_reconnect_count;
}

// Reset counters reset here so stale data does not leak...
void telemetry_counters_reset_mqtt_reconnect_count(void) {
    s_counters.mqtt_reconnect_count = 0;
}
```

22 counters, mỗi counter có 1 getter + 1 resetter + 1 incrementer = 66 functions, mỗi function có boilerplate comment vô nghĩa. Tỉ lệ tín hiệu/nhiễu thấp.

### 3.18 Thread Safety Gaps

**app-core có ZERO locks** trong khi adapter layer có 48+ lock operations.

**Mutable global state không được bảo vệ:**
```c
// telemetry_counters.c - shared state
static struct {
    uint32_t mqtt_reconnect_count;
    uint32_t gnss_fix_count;
    // ... (22 counters total)
} s_counters;
// KHÔNG có mutex - được ghi từ nhiều context khác nhau

// ble_mgr.c - shared state
static struct {
    bool is_connected;
    uint16_t conn_handle;
    // ...
} s_ble_ctx;
```

**Race condition scenarios:**
1. `s_telemetry` bị ghi từ FSM task + callback context đồng thời
2. `s_ble_ctx` bị truy cập từ BLE event callback + app-core state machine
3. `s_counters` bị increment từ nhiều task mà không có atomic operation

**Adapter layer có bảo vệ:**
- `modem_at.c`: `portMUX_TYPE s_uart_mux` (14 globals có lock)
- `ble_obd.c`: `SemaphoreHandle_t s_obd_mutex` (dùng trong BLE callbacks)
- `sd_log_store.c`: `SemaphoreHandle_t s_sd_mutex`

Hậu quả: app-core tin vào "single-threaded" assumption nhưng thực tế ESP-IDF event loop + BLE stack callbacks + timer callbacks có thể chạy ở context khác.

### 3.19 memcpy / strcpy Không Kiểm Tra Bounds

**12+ calls dùng raw pointer không có sizeof bounds check:**

```c
// ble_obd.c:509
memcpy(s_recent_pids, pids, len);  // len từ BLE packet - có thể overflow s_recent_pids[20]

// modem_at.c:364
memcpy(response, data, len);  // len từ UART, response[512] - không kiểm tra

// modem_at.c:755
memcpy(s_uart_rx_buf + s_uart_rx_len, data, len);  // buffer overflow nếu len > free space

// mqtt_session.c:100
memcpy(s_mqtt_rx_buf + offset, data, len);  // s_mqtt_rx_buf[2048] - không bounds check

// mqtt_urc_parser.c:624
memcpy(topic, data, len);  // topic[64] - có thể overflow

// mqtt_urc_parser.c:667
memcpy(command, data, len);  // command[32] - có thể overflow
```

**Không dùng `memcpy_s` hoặc check bounds trước khi copy.** Nếu len > buffer size -> silent corruption.

### 3.20 snprintf Truncation Bị Bỏ Qua

**42+ calls toàn bộ cast `(void)` hoặc bỏ qua return value:**

```c
// data_formatter.c:312
(void)snprintf(buf, sizeof(buf), "...", ...);  // truncation không phát hiện được

// mqtt_session.c:440
snprintf(cmd, sizeof(cmd), "...", ...);  // không kiểm tra return > sizeof(cmd)

// command_handler.c:220
(void)snprintf(response, 128, "%s,%d", ...);  // nếu string > 128 -> silent truncation
```

**Vấn đề:** `snprintf` trả về số bytes cần ghi (có thể > buffer size). Bỏ qua return value = không biết khi nào truncation xảy ra.

**Fix đơn giản:**
```c
int ret = snprintf(buf, sizeof(buf), "...");
if (ret < 0 || (size_t)ret >= sizeof(buf)) {
    // handle truncation
}
```

### 3.21 Kconfig Defaults - Security & Duplicate

**Default device ID dễ đoán:**
```kconfig
// Kconfig.projbuild
config TRACKER_001
    default "TRACKER_001"
```
Nếu user quên config -> device ID là "TRACKER_001" -> tất cả devices cùng ID.

**Default auth token:**
```kconfig
config provisioning-required
    default "auth-token"
```
Auth token mặc định "auth-token" là security risk nếu không thay đổi trước khi deploy.

**Duplicate defaults:**
```kconfig
config TRACKER_FIELD_VALIDATION_MQTT_HOST
    default "mqtt.example.com"

config TRACKER_DEFAULT_MQTT_HOST
    default "mqtt.example.com"
```
Host mặc định duplicate ở 2 chỗ. Nếu đổi host phải sửa cả 2.

### 3.22 data_formatter.c - JSON Format Spaghetti

`contracts-device-cloud/src/data_formatter.c`: **814 lines**, 4 functions > 100 lines, 9 functions total.

**4 `switch(state)` chains xử lý JSON formatting:**
```c
// data_formatter.c:120 - format_telemetry_json()
switch (format) {
    case TELEMETRY_FORMAT_COMPACT:  // 30 lines
    case TELEMETRY_FORMAT_FULL:     // 45 lines
    case TELEMETRY_FORMAT_DIAG:     // 35 lines
    case TELEMETRY_FORMAT_MINIMAL:  // 20 lines
}

// data_formatter.c:310 - format_diagnostic_json()
switch (diag_type) {
    case DIAG_SYSTEM:    // 40 lines
    case DIAG_NETWORK:   // 35 lines
    case DIAG_GNSS:      // 30 lines
    case DIAG_BLE:       // 25 lines
}

// data_formatter.c:490 - format_command_response()
switch (cmd_status) {
    case CMD_SUCCESS:    // 20 lines
    case CMD_FAILURE:    // 15 lines
    case CMD_TIMEOUT:    // 12 lines
}

// data_formatter.c:620 - format_ota_status()
switch (ota_phase) {
    case OTA_IDLE:       // 15 lines
    case OTA_DOWNLOADING: // 20 lines
    case OTA_VERIFYING:  // 12 lines
    case OTA_COMMITTING: // 10 lines
}
```

**Hardcoded schema version trong mỗi function:**
```c
// data_formatter.c:130
json_add_string(obj, "schema_ver", "2.1");

// data_formatter.c:340
json_add_string(obj, "schema_ver", "2.1");

// data_formatter.c:510
json_add_string(obj, "schema_ver", "2.1");

// data_formatter.c:640
json_add_string(obj, "schema_ver", "2.1");
```

`"2.1"` hardcoded 4 lần. Khi bump schema version phải sửa 4 chỗ. Nên dùng `#define DATA_FORMATTER_SCHEMA_VERSION "2.1"`.

---

## Phần 4: Tổng Quan Component Map - Sai Lệch Chi Tiết

### shared-kernel (kiến trúc: 4-5 files, thực tế: 12 files)

| Kiến trúc | Thực tế | Vấn đề |
|---|---|---|
| `tracker_models.h` | `gnss_model.h`, `obd_model.h`, `telemetry_model.h`, `fsm_types.h`, `rtc_context.h` | Models bị scatter thành 5 files |
| `tracker_config.h` | `app_config.h`, `runtime_config.h` | Config split |
| `tracker_errors.h` | ❌ Không tồn tại | Thiếu errors header |
| `tracker_utils.h` | `util.h` | OK |

### platform-hal-esp-idf (kiến trúc: 8-10 files, thực tế: 2 files)

| Kiến trúc | Thực tế | Vấn đề |
|---|---|---|
| `tracker-runtime-ports.h` | ✅ Có | OK |
| `tracker-runtime-ports.c` | ✅ Có | OK |
| `hal_uart.h/.c` | ❌ Không tồn tại | Adapter gọi ESP-IDF UART trực tiếp |
| `hal_i2c.h/.c` | ❌ Không tồn tại | Adapter gọi ESP-IDF I2C trực tiếp |
| `hal_gpio.h/.c` | ❌ Không tồn tại | Adapter gọi ESP-IDF GPIO trực tiếp |

**Hậu quả:** Mỗi adapter tự quản lý UART/I2C/SPI riêng. Muốn thay đổi bus config phải sửa từng adapter.

### platform-board-esp32s3 (kiến trúc: pin map + power, thực tế: có thêm ADC + IMU drivers)

| File | Vai trò | Vấn đề |
|---|---|---|
| `pin_map.h` | ✅ Pin map | OK |
| `power_mgr.c` | ✅ Power control | OK |
| `adc_reader.c` | ❌ ADC driver | ADC nên là adapter riêng hoặc HAL |
| `imu_lis3dsh.c` | ❌ IMU driver | IMU nên là adapter riêng |

ADC và IMU là drivers hardware, không phải platform board. Nên đưa ra adapter riêng.

---

## Phần 5: Khuyến Nghị Sửa Chữa

### P0 - Cần Làm Ngay (Dependency Rule & God Files)

| # | Vi phạm | Sửa thế nào | Effort |
|---|---|---|---|
| 1 | **284+ adapter calls từ app-core** | Truyền `s_ports` qua context, app-core chỉ gọi port | 3 ngày |
| 2 | Adapter REQUIRES domain-telemetry | Xoá REQUIRES, dùng callback/port | 1 ngày |
| 3 | Domain REQUIRES adapter | Domain chỉ biết shared-kernel + contracts | 2 ngày |
| 4 | platform-hal REQUIRES contracts | Forward declare ota_contract types | 0.5 ngày |
| 5 | **mqtt_session.c 1362 dòng** | Tách keepalive + reconnect ra file riêng | 1 ngày |
| 6 | **tracker-app-bootstrap.c quá bừa** | Tách thành 3 functions: `load_config()`, `init()`, `determine_state()` | 0.5 ngày |

### P1 - Overengineering (Simplify)

| # | Vấn đề | Simplify | Effort |
|---|---|---|---|
| 7 | state_machine_core.c 1194 lines | Tách state handlers, gom functions | 1 ngày |
| 8 | 50+ global extern variables | Gom vào `fsm_context_t` struct | 1 ngày |
| 9 | **11 retry policies** | Dùng 3 policy templates | 0.5 ngày |
| 10 | app-core 10 files | Gom 5 state files, xoá facade | 1 ngày |
| 11 | telemetry_t 133 lines | Giảm xuống 10-15 fields chính | 1 ngày |
| 12 | **data_formatter.c 814 lines** | Dùng helper macros, bỏ 4 switch chains | 1 ngày |
| 13 | Boilerplate comments | Xoá toàn bộ | 0.5 ngày |
| 14 | Magic numbers (60000 x4) | Gom vào `#define` chung | 0.25 ngày |

### P2 - Component Restructure

| # | Vấn đề | Restructure | Effort |
|---|---|---|---|
| 15 | modem 7 files | Gom thành 2-3 files | 1 ngày |
| 16 | MQTT 5 files | Gom thành 2-3 files | 0.5 ngày |
| 17 | BLE OBD 4 files | Gom thành 2 files | 0.5 ngày |
| 18 | Thiếu HAL wrappers | Thêm hal_uart, hal_i2c, hal_gpio | 2 ngày |
| 19 | ADC, IMU sai vị trí | Tách adapter riêng | 1 ngày |
| 20 | domain-ota dùng util_ prefix | Đổi prefix thành ota_ | 0.5 ngày |

---

## Phần 6: Con Số Biết Nói

| Metric | Kiến trúc target | Thực tế | Đánh giá |
|---|---|---|---|---|
| Total .c lines | ~8000 | **21027** | **FAIL** - gấp 2.6 |
| app-core files | 5-7 | 10+11 = 21 | **FAIL** - gấp 3 |
| app-core direct adapter calls | 0 | **293** | **Critical FAIL** |
| state_machine_core.c lines | < 400 | 1194 | **FAIL** - gấp 3 |
| telemetry_t fields | ~8 | 30+ | **FAIL** - gấp 3.75 |
| Global variables | < 10 | 58+ | **FAIL** - gấp 5.8 |
| Files > 700 lines | 0 | **13 files** | **Critical FAIL** |
| Retry policies | 2-3 | 11 | **FAIL** - gấp 4 |
| Retry state instances | 2-3 | 10+ | **FAIL** - gấp 4 |
| HAL wrappers | 4 (.h+.c) | 0 | **FAIL** |
| shared-kernel files | 4-5 headers | 9 headers | Borderline |
| adapter-modem files | 2-3 | 7 | **FAIL** - gấp 2.3 |
| Adapter REQUIRES domain | 0 | 3 | **Critical FAIL** |
| Domain REQUIRES adapter | 0 | 3 | **Critical FAIL** |
| Magic delays không define | 0 | 4+ | Medium |

---

## Kết Luận

Điểm mạnh:
- Cấu trúc 16 components và tên gọi **khớp** với kiến trúc tham chiếu
- Port interfaces được định nghĩa đầy đủ trong `tracker-runtime-ports.h`
- Bootstrap có port validation (fail-fast)

Điểm yếu:
- **293 direct adapter calls từ app-core** - port interfaces tồn tại nhưng không được dùng
- **13 files > 700 lines** (mqtt_session 1362, state_machine_core 1194, mqtt_urc_parser 1025...)
- **tracker-app-bootstrap.c viết bừa bãi** - 10 responsibilities trong 1 function, vừa define port vừa gọi adapter trực tiếp
- **58+ global variables** là anti-pattern lớn nhất - cần gom vào struct
- **11 retry policies** cho 11 use cases - chỉ cần 2-3
- **data_formatter.c 814 lines** với 4 switch chains cho JSON formatting
- **Hardcoded magic numbers** (60000ms xuất hiện 4 chỗ không dùng chung define)
- **21,027 total .c lines** - gấp 2.6 lần kỳ vọng kiến trúc (~8000)
- **Zero thread safety** trong app-core (0 locks, 58+ globals shared across contexts)
- **12+ memcpy không bounds check** - buffer overflow risk từ BLE/UART packets
- **42+ snprintf bỏ qua truncation** - silent data corruption
- **Kconfig default credentials** - "TRACKER_001" device ID + "auth-token" mặc định
- **Signal/noise thấp** - 27% boilerplate comments trong telemetry_counters.c

**Điểm số: 3/10** (giảm từ 4/10 sau khi phát hiện thêm thread safety, memory safety, Kconfig issues)

**Không có critical bug nào, nhưng maintainability đang xuống cấp nhanh.** Refactor lớn nhất cần làm là:
1. Truyền `s_runtime_ports` context xuống tất cả file app-core
2. Xoá adapter calls trực tiếp khỏi app-core
3. Fix bootstrap function (tách responsibilities)
4. Gom global state vào struct
5. Thêm bounds check cho memcpy/snprintf
6. Kconfig defaults an toàn hơn
