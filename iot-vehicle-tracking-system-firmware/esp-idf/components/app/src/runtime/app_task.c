/**
 * @file app_task.c
 * @brief Application event queue, FreeRTOS task and periodic firmware services.
 *
 * Modem, board, storage, OBD and OTA post events by value from task context.
 * The IMU ISR signals the board task. Each producer attempts a zero-wait send.
 * A full queue drops the event, returns IVTS_ERR_FULL and increments the
 * atomic drop count. Large payloads stay in their owner's slot and are copied
 * separately when the consumer handles the notification.
 *
 * This queue is volatile. Durable offline records, configuration and OTA
 * context are written through storage and survive independently of event
 * delivery.
 */
#include "runtime/runtime.h"
#include <stdatomic.h>
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"
#include "app_internal.h"
#include "esp_heap_caps.h"
#include "platform/log.h"
#include "sdkconfig.h"
#include "session/motion_alarm.h"
#include "board/board_power.h"
#include "command/command.h"
#include "device/device.h"
#include "fw/fw_update.h"
#include "power/power.h"
#include "publish/publish.h"
#include "session/session_tracker.h"
#include "storage/storage.h"
#include "session/telemetry.h"
#include "ivts_core/model/status.h"
#include "modem/modem.h"

#define APP_QUEUE_LEN   32     /* Maximum number of pending by-value events. */

static QueueHandle_t s_event_queue;                  /* Event queue created by app_events_init() before starting producers. */
static _Atomic uint32_t s_drops;           /* Full-queue drops counted atomically across producers. */

/**
 * @brief Copy an event into the app queue without waiting.
 * @retval IVTS_OK The event was copied into the queue.
 * @retval IVTS_ERR_FULL The queue was full. The event was dropped and counted.
 * @note Call from task context. ISRs signal the task that owns the source.
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
 * Stack high-water marks and heap diagnostics are optional. The app task owns
 * the static sample buffer and serializes access to it.
 */

#if CONFIG_IVTS_DIAG_STACK_LOG
#define MAX_TASKS 24   /* Maximum task records per diagnostics sample. */

/**
 * @brief Log per-task stack high-water marks and heap capacity every 60 seconds.
 *
 * ESP-IDF reports stack high-water marks in bytes. Check the minimum free
 * stack after exercising OTA, replay and OBD diagnostics when sizing tasks.
 */
static void app_diag_tick(uint64_t now_ms)
{
    static uint64_t next;
    if (now_ms < next) { return; }
    next = now_ms + DIAG_PERIOD_MS;
    static TaskStatus_t st[MAX_TASKS];             /* Use static storage for the sample table to preserve app stack space. */
    UBaseType_t n = uxTaskGetSystemState(st, MAX_TASKS, NULL);
    if (n == 0u) { IVTS_LOGW("sys", "diag result=too_many_tasks max=%d", MAX_TASKS); return; }
    for (UBaseType_t i = 0; i < n; i++) {
        IVTS_LOGI("sys", "diag task=%s prio=%u stack_free=%uB", st[i].pcTaskName,
                  (unsigned)st[i].uxBasePriority, (unsigned)st[i].usStackHighWaterMark);
    }
    IVTS_LOGI("sys", "diag heap_free=%uB heap_min=%uB heap_largest=%uB",
              (unsigned)heap_caps_get_free_size(MALLOC_CAP_8BIT),
              (unsigned)heap_caps_get_minimum_free_size(MALLOC_CAP_8BIT),
              (unsigned)heap_caps_get_largest_free_block(MALLOC_CAP_8BIT));
}
#else
/** Stub used when CONFIG_IVTS_DIAG_STACK_LOG is disabled. */
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
    ivts_ignition_t before = s_axes.ign;
    if (ivts_axes_on_power(&s_axes, &s_axes_cfg, vehicle_mv, app_now())) {
        IVTS_LOGI(APP_TAG, "ignition %s -> %s vehicle=%u.%02uV", ivts_ignition_name(before),
                  ivts_ignition_name(s_axes.ign), (unsigned)(vehicle_mv / 1000u), (unsigned)(vehicle_mv % 1000u / 10u));
    }
}

void app_task_on_motion(void)
{
    ivts_motion_t before = s_axes.motion;
    (void)ivts_axes_on_motion(&s_axes, app_now());
    if (s_axes.motion != before) {
        IVTS_LOGI(APP_TAG, "motion %s -> %s", ivts_motion_name(before), ivts_motion_name(s_axes.motion));
    }
}

/**
 * @brief Log the periodic status lines described in ivts_core/model/status.h.
 *
 * Runs on the app task. The RTC read may wait briefly for the shared I2C bus.
 * CONFIG_IVTS_LOG_STATUS_PERIOD_S of zero disables the periodic lines, but a
 * state transition still prints the core line.
 */
static void log_status(bool full)
{
    bool trusted = false;
    ivts_status_view_t view = {
        .telemetry = app_telemetry_view(),
        .fsm = s_fsm.state,
        .link = modem_link_state(),
        .uptime_ms = app_now(),
        .queue_pending = storage_queue_count(),
        .event_drops = app_events_drops(),
        .cmd_drops = modem_cmd_dropped(),
        .heap_free_bytes = (uint32_t)heap_caps_get_free_size(MALLOC_CAP_8BIT),
        .heap_min_bytes = (uint32_t)heap_caps_get_minimum_free_size(MALLOC_CAP_8BIT),
        .publishing = app_publisher_is_busy(),
        .control_pending = app_outbox_has_unsent_control() || app_cmd_pending(),
        .queue_unflushed = storage_queue_has_unflushed_push(),
        .ota_active = app_fw_update_in_progress(),
        .tracking_enabled = app_device_tracking_enabled(),
    };
    view.utc_unix_ms = app_clock_unix_ms_or_zero(&trusted);
    view.rtc_trusted = trusted;
    char line[200];
    int last = full ? IVTS_STATUS_COUNT : IVTS_STATUS_CORE + 1;
    for (int group = IVTS_STATUS_CORE; group < last; group++) {
        (void)ivts_status_format(&view, (ivts_status_group_t)group, line, sizeof line);
        IVTS_LOGI(APP_TAG, "%s", line);
    }
}

static void app_status_tick(uint64_t now_ms)
{
#if CONFIG_IVTS_LOG_STATUS_PERIOD_S > 0
    static uint64_t next;
    if (now_ms < next) { return; }
    next = now_ms + (uint64_t)CONFIG_IVTS_LOG_STATUS_PERIOD_S * 1000u;
    log_status(true);
#else
    (void)now_ms;
#endif
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
        IVTS_LOGI(APP_TAG, "state %s -> %s ign=%s motion=%s link=%s", ivts_fsm_state_name(before),
                  ivts_fsm_state_name(s_fsm.state), ivts_ignition_name(s_axes.ign), ivts_motion_name(s_axes.motion),
                  ivts_link_name(modem_link_state()));
        if (out->actions & IVTS_ACT_SLEEP) {
            IVTS_LOGI(APP_TAG, "state action=sleep mode=%s duration=%lus", ivts_sleep_mode_name(out->sleep_mode),
                      (unsigned long)out->sleep_s);
        }
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

    /* Continue waiting for and draining events while the FSM is in simulated sleep. */
    while (true) {
        drain_events();
        uint64_t now = app_now();
        if (now < next_tick) { continue; }
        next_tick = now + APP_TICK_MS;

        if (app_sleep_poll(&s_fsm, &s_axes, &s_axes_cfg, now)) {
            app_publisher_poll();
            app_led_pattern_tick(s_fsm.state, app_device_tracking_enabled(), now);
            app_diag_tick(now);
            app_status_tick(now);
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
        app_status_tick(now);
        if (out.changed) { log_status(false); }
    }
}
