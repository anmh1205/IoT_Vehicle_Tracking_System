# 13 — Power, sleep, OTA và validation

> 🎯 Mục tiêu: hoàn thiện firmware — quản lý nguồn/pin, deep-sleep với wake source, OTA an toàn (download → verify SHA256 → confirm → rollback), và checklist validate trước khi coi là "xong".

Nguồn thật: `state_sleep_controller.c`, `state_ota_runtime.c`, `domain-ota/`, `contracts-device-cloud/include/ota_contract.h`, `power_mgr.c`

## Phần A — Power & sleep

### A.1 Đọc điện áp (ADC)

🧩 (theo `adc_reader.c` + `runtime_config.h`)

```c
// 2 kênh ADC1, chia áp 11:1, có gain hiệu chuẩn đo thực
#define PIN_U_SUPPLY_ADC GPIO_NUM_3   // +12V xe   (ADC1_CH2)
#define PIN_U_BATT_ADC   GPIO_NUM_4   // pin backup (ADC1_CH3)
#define TRACKER_ADC_SUPPLY_CALIB_GAIN 1.02007f  // 12.2V đo / 11.96V raw
#define TRACKER_ADC_BATT_CALIB_GAIN   1.01995f
```

> 💡 Gain hiệu chuẩn = (giá trị đo bằng đồng hồ) / (giá trị raw firmware đọc). Bù sai số điện trở chia áp + ADC. Không có nó, ngưỡng ignition/OTA lệch vài trăm mV → quyết định sai.

### A.2 Ba chế độ sleep (theo `state_sleep_controller.c`)

Codebase **không chỉ có deep sleep**. `state_machine_enter_configured_sleep()` chọn 1 trong 3:

| Chế độ          | Khi nào dùng                                                 | Đặc điểm                                                                                  |
| --------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **Fake sleep**  | build bench/debug (`CONFIG_TRACKER_FAKE_SLEEP_ENABLED`)      | vòng idle có hẹn giờ, không tiết kiệm điện thật                                           |
| **Light sleep** | cần giữ modem/GNSS ấm, hoặc motion-wake đi đường GPIO thường | CPU dừng, RAM giữ, wake nhanh; dùng `gpio_wakeup_enable` + `esp_sleep_enable_gpio_wakeup` |
| **Deep sleep**  | đỗ lâu, không cần giữ modem ấm                               | tắt phần lớn domain, wake bằng RTC timer / IMU ext0, tốn ít điện nhất, **reset khi wake** |

🧩 (sườn `state_machine_enter_configured_sleep`)

```c
app_state_t state_machine_enter_configured_sleep(void) {
#if CONFIG_TRACKER_FAKE_SLEEP_ENABLED
    return state_machine_enter_fake_sleep();
#else
    if (should_keep_parked_modem_gnss_warm() || should_use_light_sleep_motion_wake())
        return state_machine_enter_light_sleep();      // light sleep có trả về
    state_machine_prepare_deep_sleep_wakeup();
    esp_deep_sleep_start();                            // KHÔNG trả về
    return APP_STATE_SLEEP;
#endif
}
```

### A.3 Arm wake source cho deep sleep (đúng nguồn)

🧩 `state_machine_prepare_deep_sleep_wakeup_for_interval_us`

```c
static void prepare_deep_sleep_wakeup(uint64_t wake_us) {
    esp_sleep_disable_wakeup_source(ESP_SLEEP_WAKEUP_ALL);   // xóa source cũ trước
    // wake 1: IMU motion qua EXT0 (chỉ 1 chân) — nếu đủ điều kiện arm
    if (can_arm_imu_deep_sleep_wakeup()) {
        esp_err_t e = esp_sleep_enable_ext0_wakeup(PIN_LIS3DSH_INT, 1); // level=1
        if (e != ESP_OK)
            ESP_LOGW(TAG, "event=deep_sleep_imu_wake_arm_failed fallback=timer_only");
    }
    // wake 2: timer theo cadence parked
    uint64_t us = wake_us > 0 ? wake_us : 1000ULL;
    esp_sleep_enable_timer_wakeup(us);
}
```

Trước khi ngủ, phần pre-sleep còn **tắt nguồn modem trực tiếp** (không qua port):

```c
modem_power_off();                                   // hàm board-level
vTaskDelay(pdMS_TO_TICKS(TRACKER_MODEM_POWEROFF_SETTLE_MS)); // chờ rail settle
offline_queue_set_online(false);                     // tạm dừng replay
modem_set_dtr(true);                                 // no-op nếu DTR == NC
```

> 💡 **EXT0 (1 chân), không phải EXT1.** Codebase dùng `esp_sleep_enable_ext0_wakeup(PIN_LIS3DSH_INT, 1)` — wake khi chân INT lên mức cao. EXT0 chỉ theo dõi **một** GPIO, đủ cho board này (chỉ INT1 được nối vào flow wake).

> ⚠️ Deep sleep gọi `modem_power_off()`/`modem_set_dtr()` **thẳng** (board layer), không qua `s_runtime_ports.modem->sleep`. Đây là thực tế codebase — sleep controller thuộc app-core và include trực tiếp board API.

### A.4 Đọc wake cause sau khi tỉnh

Deep sleep reset chip → `app_core_bootstrap_run` chạy lại và map wake cause (xem bước 12), **chỉ khi `sleep_enabled`**:

🧩

```c
esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();
if (util_is_sleep_enabled()) {
    if (cause == ESP_SLEEP_WAKEUP_TIMER)                         state = APP_STATE_HEARTBEAT;
    else if (cause == ESP_SLEEP_WAKEUP_EXT0 && imu_wakeup_enabled) state = APP_STATE_ALARM;
    else if (cause == ESP_SLEEP_WAKEUP_EXT0)                     state = APP_STATE_HEARTBEAT;
}
// mặc định state = APP_STATE_INIT (power-on bình thường)
```

> 💡 Light sleep thì khác: hàm `enter_light_sleep` **trả về** ngay sau wake và tự map sang `ALARM`/`HEARTBEAT`/`CHECK_IGN` mà không reset chip.

## Phần B — OTA an toàn

### B.1 Hợp đồng OTA (đã định nghĩa ở bước 03)

```c
typedef struct {
    bool pending, rollback_pending, force;
    uint32_t size, confirm_timeout_sec;
    char job_id[80], version[32], url[256], sha256[65];
} ota_command_t;
```

Status chuẩn: `assigned → downloading → verifying → installing → rebooting → confirming → success` (hoặc `failed`/`rolled_back`).

### B.2 Luồng apply (state_ota_runtime → domain-ota)

```mermaid
sequenceDiagram
    Cloud->>FSM: command ota_update {url, sha256, size}
    FSM->>OTA: apply_update(cmd)
    OTA->>OTA: kiểm tra pin >= ota_min_battery_mv
    OTA->>HTTP: download → esp_ota_write từng chunk
    OTA->>OTA: verify SHA256 + size
    OTA->>OTA: esp_ota_set_boot_partition
    OTA->>FSM: status=rebooting
    FSM->>Device: lưu g_rtc_context.ota_pending_confirm=true; reboot
    Note over Device: boot ảnh mới
    Device->>OTA: trong confirm_timeout → confirm OK
    OTA->>OTA: esp_ota_mark_app_valid → success
```

🧩 Guard pin trước khi OTA

```c
if (battery_mv() < s_config.ota_min_battery_mv) {
    strcpy(out->error, TRACKER_OTA_ERROR_UNSAFE_RUNTIME_WINDOW);
    return ESP_FAIL;     // pin yếu → không OTA, tránh brick giữa chừng
}
```

> 💡 **Vì sao verify SHA256 + confirm + rollback?**
>
> - SHA256/size: ảnh tải về có thể hỏng/đứt → flash ảnh hỏng = brick. Verify trước khi set boot partition.
> - `ota_pending_confirm`: sau reboot, ảnh mới phải tự "confirm" trong `confirm_timeout_sec`. Nếu ảnh mới crash-loop và không confirm kịp → ESP-IDF **tự rollback** về ảnh cũ ở lần boot sau.
> - Cờ này nằm trong `g_rtc_context` (RTC_DATA_ATTR) để sống qua reboot.

### B.3 Confirm sau reboot

🧩

```c
void ota_confirm_tick(uint64_t now) {
    if (!g_rtc_context.ota_pending_confirm) return;
    if (basic_health_ok()) {                       // mạng + MQTT + sensor ổn
        esp_ota_mark_app_valid_cancel_rollback();  // chốt ảnh mới
        g_rtc_context.ota_pending_confirm = false;
        publish_firmware_status(TRACKER_OTA_STATUS_SUCCESS, 100);
    } else if (now > g_rtc_context.ota_confirm_deadline_ms) {
        esp_ota_mark_app_invalid_rollback_and_reboot();  // quá hạn → rollback
    }
}
```

### B.4 Partition table

🧩 `partitions.csv` thật của dự án có `factory` + 2 slot OTA (`ota_0`, `ota_1`) + `otadata`:

```
# Name,   Type, SubType, Offset,   Size,  Flags
nvs,       data, nvs,     0x9000,   0x6000,
otadata,   data, ota,     0xf000,   0x2000,
phy_init,  data, phy,     0x11000,  0x1000,
factory,   app,  factory, 0x20000,  1536K,
ota_0,     app,  ota_0,   ,         1536K,
ota_1,     app,  ota_1,   ,         1536K,
```

> 💡 Có **3 slot app**: `factory` (ảnh gốc nạp lúc sản xuất) + `ota_0`/`ota_1` (luân phiên cho OTA). `otadata` lưu slot nào đang active. Ảnh OTA mới ghi vào slot rảnh, slot cũ còn nguyên để rollback. `phy_init` giữ hiệu chỉnh RF.

## Phần C — Validation checklist

🔧 Trước khi coi firmware "xong", chạy qua:

| Hạng mục      | Cách test                            | Pass khi                                           |
| ------------- | ------------------------------------ | -------------------------------------------------- |
| Boot          | `flash monitor`                      | thấy `event=boot_summary ...` + vào INIT→CHECK_IGN |
| Config NVS    | đổi config qua command, reboot       | config giữ nguyên                                  |
| Ignition      | cấp/ngắt +12V                        | DRIVING ↔ PARKED đúng sau hold                     |
| GNSS          | để ngoài trời                        | `+CGNSINF` có fix, lat/lon hợp lý                  |
| MQTT publish  | sub topic `v1/<id>/rawdata` ở broker | nhận payload đúng JSON                             |
| Offline queue | rút SIM/chặn mạng                    | telemetry được đệm, replay khi mạng lại            |
| Deep sleep    | bật `sleep_enabled`                  | dòng tiêu thụ giảm; timer wake đúng hạn            |
| IMU wake      | rung thiết bị lúc SLEEP              | wake → ALARM                                       |
| OTA           | đẩy job ota_update                   | downloading→…→success; pin yếu thì bị chặn         |
| Rollback      | OTA ảnh lỗi cố ý                     | tự rollback về ảnh cũ sau timeout                  |
| Watchdog      | chạy lâu                             | không reset chu kỳ                                 |

> ⚠️ Các số phần cứng (mức logic DTR, dòng sleep, threshold IMU) trong codebase là **project inference**, **cần bench test trên board thật** mới chốt. Xem `../08_validation/open_questions_and_validation_needed.md`.

## ⚠️ Bẫy thường gặp

- **OTA không verify SHA256** → brick khi tải lỗi.
- **Không có confirm/rollback** → ảnh crash-loop làm chết thiết bị ngoài hiện trường.
- **Cờ OTA không `RTC_DATA_ATTR`** → mất sau reboot, confirm/rollback hỏng.
- **Quên arm wake source** → ngủ vĩnh viễn, không bao giờ tỉnh.
- **Sleep khi đang OTA/đang publish** → mất dữ liệu, OTA dở dang.
- **Ngưỡng pin OTA quá thấp** → OTA giữa lúc pin yếu → brick.

## 🎓 Hoàn thành

Bạn đã dựng lại firmware theo đúng kiến trúc thật:

```
shared-kernel → contracts → platform/board → ports(HAL) → adapters → domain → app-core(FSM+bootstrap) → main
```

Mỗi lớp build độc lập, FSM gọi mọi thứ qua port, adapter mới chỉ cần điền port mà không đụng FSM.

### Đọc tiếp để đào sâu

- Reference theo chủ đề: `../firmware-programming-guide/` (FreeRTOS, MQTT, OTA, power…).
- Pitfalls phần cứng: `../04_modem_gnss/`, `../05_imu/`, `../06_storage/`.
- Validate: `../08_validation/`.

### Quay lại

[README bộ build-from-scratch](./README.md) · [00 — Tổng quan](./00-tong-quan-kien-truc-va-lo-trinh.md)
