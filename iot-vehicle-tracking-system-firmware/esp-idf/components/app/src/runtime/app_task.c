/**
 * @file app_task.c
 * @brief Queue sự kiện của app và việc tạo task "app".
 *
 * ## Mô hình thực thi
 *
 * Task "app" (configured by boot/task_table.h):
 * - App consumes these events and owns application state.
 *
 * Queue s_event_queue (APP_QUEUE_LEN phần tử, mỗi phần tử là một ivts_event_t sao chép theo giá trị):
 * - Producer: task "modem", "board", "storage", "obd", "ota" gọi sink_fn() từ ngữ cảnh task.
 * - Không có producer nào chạy trong ISR: ISR của IMU chỉ notify task "board".
 * - sink_fn() dùng timeout 0 nên producer không bao giờ bị chặn bởi app chậm. Queue đầy thì
 *   sự kiện bị bỏ, trả IVTS_ERR_FULL và tăng s_drops.
 * - Sự kiện chỉ mang giá trị nhỏ; dữ liệu lớn nằm trong "slot" của component sở hữu và được
 *   lấy bằng hàm riêng sau khi nhận sự kiện báo hiệu.
 *
 * ## Khi reset hoặc mất nguồn
 *
 * Queue nằm trong RAM nên sự kiện chưa xử lý bị mất khi reset. Dữ liệu cần bền vững
 * (offline queue, cấu hình, OTA pending) do storage ghi riêng, không đi qua queue này.
 */

#include "runtime/runtime.h"
#include <stdatomic.h>
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"
#include "app_internal.h"
#include "esp_heap_caps.h"
#include "esp_log.h"
#include "sdkconfig.h"
#include "motion_alarm.h"
#include "board/board_power.h"
#include "command/command.h"
#include "device/device.h"
#include "fw_update.h"
#include "power.h"
#include "publish/publish.h"
#include "session_tracker.h"
#include "storage/storage.h"
#include "telemetry.h"

#define APP_QUEUE_LEN   32     /* Số sự kiện tối đa chờ xử lý. */

static QueueHandle_t s_event_queue;                  /* Queue sự kiện; tạo một lần trong app_events_init(). */
static _Atomic uint32_t s_drops;           /* Số sự kiện bỏ do đầy; nhiều task tăng đồng thời. */

/**
 * @brief Sink của app: sao chép sự kiện vào queue mà không chờ.
 * @return IVTS_OK nếu đã xếp hàng; IVTS_ERR_FULL nếu queue đầy (sự kiện bị bỏ và được đếm).
 * @note Gọi từ ngữ cảnh task của bất kỳ component nào; không gọi từ ISR.
 */
static ivts_err_t sink_fn(void *ctx, const ivts_event_t *ev)
{
    (void)ctx;
    if (xQueueSend(s_event_queue, ev, 0) == pdTRUE) {
        return IVTS_OK;
    }
    atomic_fetch_add_explicit(&s_drops, 1u, memory_order_relaxed);
    return IVTS_ERR_FULL;
}

bool app_events_init(void)
{
    s_event_queue = xQueueCreate(APP_QUEUE_LEN, sizeof(ivts_event_t));
    return s_event_queue != NULL;
}

ivts_sink_t app_events_sink(void)
{
    return (ivts_sink_t){ .fn = sink_fn, .ctx = NULL };
}

bool app_events_receive(ivts_event_t *ev, uint32_t timeout_ms)
{
    return xQueueReceive(s_event_queue, ev, pdMS_TO_TICKS(timeout_ms)) == pdTRUE;
}

uint32_t app_events_drops(void) { return atomic_load_explicit(&s_drops, memory_order_relaxed); }

static void app_task_run(void *arg);

bool app_task_start(uint32_t stack_bytes, uint8_t priority)
{
    return xTaskCreate(app_task_run, "app", stack_bytes, NULL, priority, NULL) == pdPASS;
}

/**
 * Chẩn đoán runtime: stack high-water-mark của từng task và bộ nhớ heap.
 *
 * Chỉ được biên dịch đầy đủ khi bật CONFIG_IVTS_DIAG_STACK_LOG; ngược lại app_diag_tick() rỗng.
 * Hàm chỉ gọi từ task "app" nên bộ đệm static không cần khoá.
 */

#if CONFIG_IVTS_DIAG_STACK_LOG
#define MAX_TASKS 24   /* Số task tối đa ghi log; nhiều hơn thì bỏ qua lần log đó. */

/**
 * @brief Mỗi 60 giây ghi log stack còn trống của từng task và thống kê heap.
 *
 * Trên ESP-IDF StackType_t là uint8_t nên high-water-mark tính bằng byte. Mức còn trống nên
 * giữ tối thiểu khoảng 1 KB sau khi chạy qua mọi đường thực thi (OTA, replay, OBD diag).
 */
static void app_diag_tick(uint64_t now_ms)
{
    static uint64_t next;
    if (now_ms < next) { return; }
    next = now_ms + DIAG_PERIOD_MS;
    static TaskStatus_t st[MAX_TASKS];             /* static để không tốn stack (~1 KB); chỉ task "app" gọi. */
    UBaseType_t n = uxTaskGetSystemState(st, MAX_TASKS, NULL);
    if (n == 0u) { ESP_LOGW(APP_TAG, "diag: hơn %d task", MAX_TASKS); return; }
    for (UBaseType_t i = 0; i < n; i++) {
        ESP_LOGI(APP_TAG, "hwm %-12s prio %2u free %5u B", st[i].pcTaskName,
                 (unsigned)st[i].uxBasePriority, (unsigned)st[i].usStackHighWaterMark);
    }
    ESP_LOGI(APP_TAG, "heap free %u min %u largest %u", (unsigned)heap_caps_get_free_size(MALLOC_CAP_8BIT),
             (unsigned)heap_caps_get_minimum_free_size(MALLOC_CAP_8BIT),
             (unsigned)heap_caps_get_largest_free_block(MALLOC_CAP_8BIT));
}
#else
/** Bản rỗng khi CONFIG_IVTS_DIAG_STACK_LOG tắt. */
static void app_diag_tick(uint64_t now_ms) { (void)now_ms; }
#endif

static ivts_axes_t s_axes;
static ivts_axes_cfg_t s_axes_cfg;
static ivts_fsm_t s_fsm;
static ivts_fsm_cfg_t s_fsm_cfg;

void app_task_set_config(const ivts_axes_cfg_t *axes_cfg, const ivts_fsm_cfg_t *fsm_cfg)
{
    s_axes_cfg = *axes_cfg;
    s_fsm_cfg = *fsm_cfg;
}

void app_task_on_power_sample(uint16_t vehicle_mv)
{
    if (ivts_axes_on_power(&s_axes, &s_axes_cfg, vehicle_mv, app_now())) {
        ESP_LOGI(APP_TAG, "ignition -> %d (%u mV)", (int)s_axes.ign, vehicle_mv);
    }
}

void app_task_on_motion(void)
{
    (void)ivts_axes_on_motion(&s_axes, app_now());
}

static void drain_events(void)
{
    if (app_dispatch_next(APP_TICK_MS)) {
        while (app_dispatch_next(0)) {}
    }
}

static void run_periodic_services(uint64_t now)
{
    app_dispatch_refresh_link();
    app_publisher_poll();
    app_fw_update_poll(now);
    app_telemetry_set_axes(&s_axes);
    app_telemetry_refresh(now);
    app_cmd_handle();
    app_cmd_tick();

    if (ivts_axes_tick(&s_axes, &s_axes_cfg, now)) { app_telemetry_set_axes(&s_axes); }
    if (app_device_is_provisioned()) { app_session_tick(s_axes.ign, app_device_tracking_enabled(), app_device_boot_id()); }
}

static ivts_fsm_in_t collect_fsm_input(uint64_t now)
{
    bool linked = app_link_is_broker_up();
    return (ivts_fsm_in_t){
        .now = now, .ignition = s_axes.ign, .motion = s_axes.motion, .wake = s_fsm.wake,
        .link_up = linked,
        .link_expected = app_device_is_provisioned(),
        .publish_idle = !app_publisher_is_busy() && !storage_queue_has_unflushed_push(),
        .control_pending = app_outbox_has_unsent_control() || app_cmd_pending(),
        .offline_record_count = storage_queue_count(),
        .ota_active = app_fw_update_in_progress() ||
                      app_cmd_blocks_sleep(),
    };
}

static void apply_fsm_transition(const ivts_fsm_out_t *out, ivts_fsm_state_t before)
{
    if (out->changed) {
        ESP_LOGI(APP_TAG, "state %s -> %s", ivts_fsm_state_name(before), ivts_fsm_state_name(s_fsm.state));
        if (s_fsm.state == IVTS_ST_ALARM) { app_alarm_latch(app_device_is_provisioned(), app_device_boot_id()); }
    }
}

static void refresh_device_state(bool changed)
{
    if (app_fw_update_in_progress()) {
        app_telemetry_set_device(IVTS_DEV_OTA, IVTS_SLEEP_NONE);
    } else if (changed || s_fsm.state != IVTS_ST_SLEEP) {
        app_telemetry_set_device(ivts_fsm_device_state(s_fsm.state), IVTS_SLEEP_NONE);
    }
}

static void app_task_run(void *arg)
{
    (void)arg;
    board_wake_t bw = board_wake_cause();
    ivts_wake_t wake = (bw == BOARD_WAKE_IMU) ? IVTS_WAKE_MOTION
                     : (bw == BOARD_WAKE_TIMER) ? IVTS_WAKE_TIMER : IVTS_WAKE_POWER_ON;
    ivts_axes_init(&s_axes);
    ivts_fsm_init(&s_fsm, app_now(), wake);
    uint64_t next_tick = 0;

    /* Vẫn chờ queue và xử lý sự kiện khi FSM đang fake sleep. */
    while (true) {
        drain_events();
        uint64_t now = app_now();
        if (now < next_tick) { continue; }
        next_tick = now + APP_TICK_MS;

        if (app_sleep_poll(&s_fsm, &s_axes, &s_axes_cfg, now)) {
            app_publisher_poll();
            app_led_pattern_tick(s_fsm.state, app_device_tracking_enabled(), now);
            app_diag_tick(now);
            continue;
        }
        run_periodic_services(now);
        ivts_fsm_in_t in = collect_fsm_input(now);
        ivts_fsm_out_t out;
        ivts_fsm_state_t before = s_fsm.state;
        ivts_fsm_step(&s_fsm, &s_fsm_cfg, &in, &out);
        apply_fsm_transition(&out, before);
        refresh_device_state(out.changed);
        app_led_pattern_tick(s_fsm.state, app_device_tracking_enabled(), now);
        app_fsm_actions_execute(&out, &s_fsm, &s_axes, &s_axes_cfg);
        app_fw_update_confirm_tick();
        app_diag_tick(now);
    }
}
