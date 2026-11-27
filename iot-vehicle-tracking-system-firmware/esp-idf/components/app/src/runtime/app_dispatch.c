#include "app_dispatch.h"
#include "app_events.h"
#include "app_task.h"
#include "app_log.h"
#include "esp_log.h"
#include "link/app_link.h"
#include "modem/modem.h"
#include "publish/outbox.h"
#include "publish/publisher.h"
#include "publish/replay.h"
#include "telemetry/telemetry_snapshot.h"

typedef void (*app_event_handler_t)(const ivts_event_t *);

void app_dispatch_refresh_link(void)
{
    ivts_link_t link = modem_link_state();
    if (!app_link_update(link)) { return; }
    if (app_link_is_broker_up()) { app_outbox_request_status(); }
    ESP_LOGI(APP_TAG, "link -> %u", (unsigned)link);
}

static void on_power_sample(const ivts_event_t *event) { app_task_on_power_sample(event->u.power.vehicle_mv); }
static void on_motion(const ivts_event_t *event) { (void)event; app_task_on_motion(); }
static void on_link_state(const ivts_event_t *event) { (void)event; app_dispatch_refresh_link(); }
static void on_queue_ready(const ivts_event_t *event) { (void)event; app_replay_on_queue_ready(); }
static void on_config_corrupt(const ivts_event_t *event) { (void)event; app_outbox_request_event("config_corrupt"); }

static void on_store_result(const ivts_event_t *event)
{
    ESP_LOGW(APP_TAG, "storage op=%u err=%s", event->u.store_result.op,
             ivts_err_name((ivts_err_t)event->u.store_result.err));
}

static const app_event_handler_t k_handlers[] = {
    [IVTS_EV_POWER_SAMPLE] = on_power_sample,
    [IVTS_EV_MOTION_IRQ] = on_motion,
    [IVTS_EV_LINK_STATE] = on_link_state,
    [IVTS_EV_MQTT_ACK] = app_publisher_on_ack,
    [IVTS_EV_QUEUE_READY] = on_queue_ready,
    [IVTS_EV_CONFIG_CORRUPT] = on_config_corrupt,
    [IVTS_EV_STORE_RESULT] = on_store_result,
};

void app_dispatch(const ivts_event_t *event)
{
    app_telemetry_on_event(event);
    size_t type = (size_t)event->type;
    if (type < sizeof k_handlers / sizeof k_handlers[0] && k_handlers[type] != NULL) {
        k_handlers[type](event);
    }
}

bool app_dispatch_next(uint32_t timeout_ms)
{
    ivts_event_t event;
    if (!app_events_receive(&event, timeout_ms)) { return false; }
    app_dispatch(&event);
    return true;
}
