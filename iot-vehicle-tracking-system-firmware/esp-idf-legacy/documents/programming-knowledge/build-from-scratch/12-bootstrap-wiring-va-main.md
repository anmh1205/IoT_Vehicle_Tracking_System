# 12 — Bootstrap wiring và main.c

> 🎯 Mục tiêu: ráp tất cả — điền **port registry** bằng các hàm adapter thật, **validate** một lần lúc boot, đọc wake cause, rồi chạy FSM loop. Đây là nơi mọi adapter được gom về một chỗ và kiểm tra fail-fast.

Nguồn thật: `components/app-core/src/tracker-app-bootstrap.c`, `main/main.c`

## 1. main.c phải mỏng

🧩 `main/main.c` (gần như nguyên bản)

```c
#include "tracker-app-bootstrap.h"

void app_main(void) {
    app_core_bootstrap_run();   // forward toàn bộ việc cho app-core
}
```

> 💡 **Vì sao main.c mỏng?** ESP-IDF entry point không nên chứa logic. Đặt bootstrap trong `app-core` để: (1) test được, (2) `main/` không phụ thuộc chi tiết, (3) layer rõ ràng.

## 2. Bọc adapter thành port (port wrapper)

Nhiều hàm adapter có signature **không khớp** con trỏ trong port struct (kiểu tham số khác, enum khác). Ta viết wrapper mỏng để khớp:

🧩

```c
// Adapter trả ble_obd_ctx_t*; port cần void* → wrap
static void *tracker_obd_connect_port(tracker_obd_response_callback_t cb,
                                      void *ctx, uint32_t timeout_ms) {
    return ble_obd_connect((ble_obd_response_cb_t)cb, ctx, timeout_ms);
}
static esp_err_t tracker_obd_disconnect_port(void *ctx) {
    return ble_obd_disconnect((ble_obd_ctx_t *)ctx);
}
```

> 💡 Wrapper là "ổ cắm chuyển đổi". Giữ port struct sạch (chỉ `void*`, kiểu chung) trong khi adapter giữ kiểu mạnh của nó. Không wrapper thì hoặc phải làm bẩn port, hoặc sửa adapter.

## 3. Điền các port struct

🧩 (theo nguồn — `static const`)

```c
static const modem_transport_port_t s_modem_transport_port = {
    .set_apn         = modem_lte_set_apn,
    .request_connect = modem_lte_request_connect,
    .is_initialized  = modem_lte_is_initialized,
    .is_connected    = modem_lte_is_connected,
    .sleep           = modem_lte_sleep,
    .wakeup          = modem_lte_wakeup,
};

static const mqtt_transport_port_t s_mqtt_transport_port = {
    .init       = tracker_mqtt_init,
    .connect    = tracker_mqtt_connect,
    .publish    = tracker_mqtt_publish,
    .is_connected = tracker_mqtt_is_connected,
    /* ... */
};

static const rtc_clock_port_t s_rtc_clock_port = {
    .init = rtc_ds3231m_init, .get_time_ms = rtc_ds3231m_get_time_ms,
    .set_time_ms = rtc_ds3231m_set_time_ms, .get_health = rtc_ds3231m_get_health,
};
// … storage_queue, ota_download, config_store, obd_reader, power_control tương tự
```

> 💡 `static const` → nằm ở flash, không tốn RAM, không ai sửa được lúc chạy. Toàn bộ wiring nằm **một chỗ**, đọc là biết adapter nào cắm vào đâu.

## 4. Aggregate registry

🧩

```c
static const tracker_runtime_ports_t s_runtime_ports = {
    .modem         = &s_modem_transport_port,
    .mqtt          = &s_mqtt_transport_port,
    .storage_queue = &s_storage_queue_port,
    .ota_download  = &s_ota_download_port,
    .config_store  = &s_config_store_port,
    .rtc_clock     = &s_rtc_clock_port,
    .obd_reader    = &s_obd_reader_port,
    .power_control = &s_power_control_port,
};
```

## 5. Bootstrap run — validate → load config → wake-state → loop

🧩 Sườn `app_core_bootstrap_run` (theo đúng nguồn, đã rút gọn)

```c
void app_core_bootstrap_run(void) {
    // 1. Validate registry — fail fast nếu thiếu port
    ESP_ERROR_CHECK(tracker_runtime_ports_validate(&s_runtime_ports));

    // 2. Đặt mức log (giảm ồn, vẫn giữ cảnh báo NimBLE lúc bring-up)
    esp_log_level_set("*", ESP_LOG_INFO);
    esp_log_level_set("NimBLE", ESP_LOG_WARN);

    // 3. Init + load config từ NVS; lỗi thì rơi về default biên dịch sẵn
    nvs_config_init();
    config_t config = {0};
    if (nvs_config_load(&config) != ESP_OK)
        app_config_set_defaults(&config);

    // 4. Mirror sleep policy + ghi nhận partition OTA đang chạy
    util_set_sleep_enabled(config.sleep_enabled);
    const esp_partition_t *running = esp_ota_get_running_partition();
    if (running) util_copy_string(g_rtc_context.ota_partition,
                                  sizeof(g_rtc_context.ota_partition), running->label);
    g_rtc_context.boot_count += 1U;   // RTC-retained, tăng dần qua mỗi wake

    // 5. Suy ra state khởi đầu từ wake cause — CHỈ khi sleep policy đang bật
    app_state_t state = APP_STATE_INIT;
    esp_sleep_wakeup_cause_t wakeup = esp_sleep_get_wakeup_cause();
    if (util_is_sleep_enabled()) {
        if (wakeup == ESP_SLEEP_WAKEUP_TIMER)        state = APP_STATE_HEARTBEAT;
        else if (wakeup == ESP_SLEEP_WAKEUP_EXT0 && config.imu_wakeup_enabled)
                                                     state = APP_STATE_ALARM;
        else if (wakeup == ESP_SLEEP_WAKEUP_EXT0)    state = APP_STATE_HEARTBEAT;
    }
    ESP_LOGI(TAG, "event=boot_summary boot_count=%lu wakeup=%d initial_state=%d",
             (unsigned long)g_rtc_context.boot_count, (int)wakeup, (int)state);

    // 6. Vòng lặp duy nhất: init-với-retry trước, rồi chạy FSM
    bool ready = false;
    while (true) {
        uint64_t now_ms = util_uptime_ms();
        if (!ready) {
            // retry_manager mở cổng theo thời gian (cadence 10s, không cap)
            if (retry_state_can_run(&s_init_retry, now_ms)) {
                esp_err_t err = state_machine_init(&config);
                if (err == ESP_OK) {
                    retry_state_reset(&s_init_retry);
                    ready = true;
                } else {
                    retry_state_schedule(&s_init_retry, &s_init_retry_policy, now_ms, err);
                }
            }
            vTaskDelay(pdMS_TO_TICKS(100));   // yield để driver/timer nền settle
            continue;
        }
        state = state_machine_run(state);     // 1 bước FSM
        vTaskDelay(pdMS_TO_TICKS(100));        // cadence cooperative 100ms
    }
}
```

> ⚠️ **Lưu ý kiến trúc quan trọng:** bootstrap **validate** registry rồi… _không_ tự tay "inject" nó vào FSM bằng một hàm như `state_runtime_set_ports()`. Trong codebase hiện tại, sau khi validate, các module FSM (`state_publish_pipeline.c`, `state_obd_runtime.c`, …) gọi **thẳng** hàm adapter (`tracker_mqtt_publish_rawdata`, `offline_queue_enqueue`, `modem_lte_tick`…). Registry `s_runtime_ports` đóng vai trò **bản kiểm kê + chốt fail-fast** đảm bảo mọi adapter bắt buộc đã link đúng, hơn là một bảng con trỏ được FSM dereference mỗi vòng. Xem lại ghi chú ở bước 05.

> 💡 **Validate trước khi chạy = fail fast.** `tracker_runtime_ports_validate` (bước 05) check mọi port + callback non-NULL. Thiếu 1 hàm → `ESP_ERROR_CHECK` panic ngay tại boot với log rõ.

> 💡 **Init dùng `retry_manager`, KHÔNG `while(...) vTaskDelay`.** Vòng lặp chính chỉ có một, mỗi 100ms: khi chưa `ready` thì thử `state_machine_init` qua cổng retry (cadence 10s); khi `ready` thì chạy `state_machine_run`. Không có vòng lặp con chặn riêng cho init.

## 7. Thứ tự khởi tạo quan trọng

```
validate ports (fail fast)
  → nvs_config_init + load (cần config trước)
    → wake-state từ esp_sleep_get_wakeup_cause()
      → state_machine_init (init peripheral theo config) — có retry
        → loop state_machine_run @100ms
```

Sai thứ tự (vd init modem trước khi có APN từ config) → connect fail.

## 🔧 Build & kiểm tra toàn hệ

```powershell
idf.py build
idf.py -p COM<x> flash monitor
```

Log boot kỳ vọng (theo đúng chuỗi log thật trong `tracker-app-bootstrap.c`):

```
TRACKER_MAIN: event=boot_summary boot_count=1 wakeup=0 initial_state=0
... (state_machine_init chạy, init peripheral) ...
```

- `wakeup=0` = `ESP_SLEEP_WAKEUP_UNDEFINED` (power-on lạnh). `initial_state=0` = `APP_STATE_INIT`.
- Nếu thiếu port, `ESP_ERROR_CHECK` panic **trước** dòng `boot_summary`, kèm tên hàm port thiếu do `tracker_runtime_ports_validate` log ra.
- Nếu NVS lỗi sẽ thấy `event=nvs_config_load_failed ... fallback=compiled_defaults`.

## ⚠️ Bẫy thường gặp

- **Quên 1 port** → validate panic. Đọc log để biết thiếu cái nào (đó là tính năng, không phải bug).
- **Wrapper cast sai kiểu** → crash khi gọi. Kiểm tra signature wrapper khớp adapter.
- **Logic nặng trong app_main** → khó test, vi phạm layer.
- **Vòng lặp không yield** → watchdog reset. Trong codebase, cadence `vTaskDelay(100ms)` mỗi vòng giữ task idle được chạy để feed watchdog; đừng bỏ delay này.

## ➡️ Tiếp theo

[13 — Power, sleep, OTA và validation](./13-power-sleep-ota-va-validation.md)
