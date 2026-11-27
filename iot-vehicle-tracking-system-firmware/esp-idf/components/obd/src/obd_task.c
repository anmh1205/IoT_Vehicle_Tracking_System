#include "obd_task.h"
#include "obd_internal.h"
#include "ble/obd_ble.h"
#include "poll/obd_diag.h"
#include "poll/obd_poll.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"
#include "ivts_core/base/backoff.h"
#include "platform/platform.h"

#include <stdatomic.h>

#define OBD_BLE_QUEUE_LEN 24u

static QueueHandle_t s_event_queue;
static atomic_bool s_enabled;
static atomic_bool s_ble_active;
static obd_session_t s_session;
static const ivts_backoff_t k_reconnect_backoff = { .base_ms = 2000, .max_ms = 120000, .jitter_ms = 1000 };

bool obd_task_is_enabled(void) { return atomic_load(&s_enabled); }

static bool is_current_notification(obd_session_t *session, const obd_ble_event_t *event)
{
    return session->is_connected && event->conn == session->connection && event->notification.handle == session->rx_handle;
}

static bool is_interrupting_event(obd_session_t *session, const obd_ble_event_t *event)
{
    if (event->type == OBD_BLE_EV_CTRL_CHANGED) {
        return !atomic_load(&s_ble_active) || !atomic_load(&s_enabled);
    }
    if (event->type == OBD_BLE_EV_DISCONNECTED) { return session->is_connected && event->conn == session->connection; }
    return event->type == OBD_BLE_EV_NOTIFY && is_current_notification(session, event) && event->status != 0;
}

static bool track_link_events(obd_session_t *session, const obd_ble_event_t *event)
{
    switch (event->type) {
    case OBD_BLE_EV_SYNCED: session->is_synced = true; break;
    case OBD_BLE_EV_CTRL_CHANGED:
    case OBD_BLE_EV_DISCONNECTED:
        return false;
    case OBD_BLE_EV_NOTIFY:
        if (!is_current_notification(session, event)) { return false; }
        (void)elm_rx_feed(&session->reply, event->notification.data, event->notification.len);
        break;
    default: break;
    }
    return true;
}

bool obd_task_wait_event(obd_session_t *session, uint8_t want, uint32_t timeout_ms, obd_ble_event_t *out)
{
    uint64_t deadline_at_ms = platform_uptime_ms() + timeout_ms;
    for (;;) {
        if (atomic_load(&s_ble_active) && !atomic_load(&s_enabled)) { return false; }
        uint64_t now_ms = platform_uptime_ms();
        if (now_ms >= deadline_at_ms) { return false; }
        obd_ble_event_t event;
        if (xQueueReceive(s_event_queue, &event, pdMS_TO_TICKS(deadline_at_ms - now_ms)) != pdTRUE) { return false; }
        if (is_interrupting_event(session, &event)) {
            if (event.type == OBD_BLE_EV_DISCONNECTED) { session->is_connected = false; }
            if (event.type == OBD_BLE_EV_NOTIFY) { session->reply.overflow = true; }
            return false;
        }
        if (!track_link_events(session, &event)) { continue; }
        if (want == OBD_BLE_EV_NOTIFY) {
            if (session->reply.complete) { return true; }
            continue;
        }
        if (want == OBD_BLE_WAIT_ANY || event.type == want) {
            if (out != NULL) { *out = event; }
            return true;
        }
    }
}

bool obd_task_post(const obd_ble_event_t *e)
{
    return s_event_queue != NULL && xQueueSend(s_event_queue, e, 0) == pdTRUE;
}

ivts_err_t obd_task_set_enabled(bool enabled)
{
    if (s_event_queue == NULL) { return IVTS_ERR_INVALID_STATE; }
    atomic_store(&s_enabled, enabled);
    obd_ble_event_t event = { .type = OBD_BLE_EV_CTRL_CHANGED };
    (void)obd_task_post(&event);   /* Nếu queue đầy, task đã có sự kiện để thức và kiểm tra s_enabled. */
    return IVTS_OK;
}

bool obd_is_stopped(void) { return !atomic_load(&s_ble_active); }

static void handle_disabled(uint32_t *attempt)
{
    if (atomic_load(&s_ble_active)) {
        /* Keep active if the hardware state is unknown. */
        if (obd_ble_deinit() != 0) { vTaskSuspend(NULL); }
        s_session.is_synced = false;
        (void)xQueueReset(s_event_queue);
        atomic_store(&s_ble_active, false);
    }
    *attempt = 0;
    if (!atomic_load(&s_enabled)) { (void)obd_task_wait_event(&s_session, OBD_BLE_WAIT_ANY, 1000, NULL); }
}

static bool ensure_ble_up(void)
{
    if (!atomic_load(&s_ble_active)) {
        atomic_store(&s_ble_active, true);
        if (!atomic_load(&s_enabled) || obd_ble_init() != 0) {
            atomic_store(&s_ble_active, false);
            (void)obd_task_wait_event(&s_session, OBD_BLE_WAIT_ANY, 2000, NULL);
            return false;
        }
    }
    if (!s_session.is_synced) {
        (void)obd_task_wait_event(&s_session, OBD_BLE_EV_SYNCED, 1000, NULL);
        return false;
    }
    return true;
}

static void run_session_loop(uint32_t *attempt)
{
    uint64_t next_diag_at_ms = platform_uptime_ms();
    while (s_session.is_connected && atomic_load(&s_enabled)) {
        uint64_t started_at_ms = platform_uptime_ms();
        if (!obd_poll_sample(&s_session)) { break; }
        *attempt = 0;
        if (s_session.is_ecu_ready && platform_uptime_ms() >= next_diag_at_ms) {
            if (!obd_diag_poll(&s_session)) { break; }
            next_diag_at_ms = platform_uptime_ms() + (uint64_t)obd_config()->diag_period_s * 1000u;
        }
        uint64_t elapsed_ms = platform_uptime_ms() - started_at_ms;
        if (elapsed_ms < obd_config()->poll_ms) {
            (void)obd_task_wait_event(&s_session, OBD_BLE_WAIT_NONE, (uint32_t)(obd_config()->poll_ms - elapsed_ms), NULL);
        }
    }
}

static void reconnect_backoff(uint32_t *attempt)
{
    if (atomic_load(&s_enabled)) {
        uint32_t delay_ms = ivts_backoff_ms(&k_reconnect_backoff, (*attempt)++, (uint32_t)platform_uptime_ms());
        (void)obd_task_wait_event(&s_session, OBD_BLE_WAIT_NONE, delay_ms, NULL);
    }
}

static void obd_task(void *arg)
{
    (void)arg;
    uint32_t attempt = 0;
    for (;;) {
        if (!atomic_load(&s_enabled)) {
            handle_disabled(&attempt);
            continue;
        }
        if (!ensure_ble_up()) { continue; }
        if (obd_session_setup(&s_session)) { run_session_loop(&attempt); }
        if (s_session.is_connected) { obd_ble_disconnect(s_session.connection); s_session.is_connected = false; }
        obd_session_emit_link(false, false, IVTS_ECU_DISCONNECTED);
        reconnect_backoff(&attempt);
    }
}

int obd_task_start(void)
{
    s_event_queue = xQueueCreate(OBD_BLE_QUEUE_LEN, sizeof(obd_ble_event_t));
    bool diag_ready = obd_diag_init();
    if (s_event_queue == NULL || !diag_ready) { return -1; }
    return xTaskCreate(obd_task, "obd", obd_config()->task_stack, NULL, obd_config()->task_prio, NULL) == pdPASS ? 0 : -1;
}
