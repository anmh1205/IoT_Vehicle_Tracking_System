#include "obd_internal.h"
#include "esp_log.h"
#include "platform/platform.h"

#define UUID_RX 0x2AF0u
#define UUID_TX 0x2AF1u

typedef struct { uint16_t start, end; } obd_service_range_t;
typedef struct { uint16_t rx, tx, rx_end; } obd_characteristic_handles_t;
typedef void (*discovery_visitor_t)(const obd_ble_event_t *event, void *ctx);

static bool wait_gatt(obd_session_t *session, uint64_t deadline, obd_ble_event_t *e)
{
    for (uint64_t now = platform_uptime_ms(); now < deadline; now = platform_uptime_ms()) {
        obd_ble_event_t candidate;
        if (!obd_task_wait_event(session, OBD_BLE_WAIT_ANY, (uint32_t)(deadline - now), &candidate)) { return false; }
        if (candidate.conn == session->connection && candidate.type >= OBD_BLE_EV_SVC && candidate.type <= OBD_BLE_EV_WRITE_DONE) {
            *e = candidate;
            return true;
        }
    }
    return false;
}

static bool collect_discovery(obd_session_t *session, uint64_t deadline_at_ms, discovery_visitor_t visit, void *ctx)
{
    obd_ble_event_t event;
    while (wait_gatt(session, deadline_at_ms, &event)) {
        if (event.type == OBD_BLE_EV_DISC_DONE) { return session->is_connected && event.status == 0; }
        visit(&event, ctx);
    }
    return false;
}

static void take_service(const obd_ble_event_t *event, void *ctx)
{
    obd_service_range_t *range = ctx;
    if (event->type == OBD_BLE_EV_SVC) {
        range->start = event->service.start_handle;
        range->end = event->service.end_handle;
    }
}

static bool discover_obd_service(obd_session_t *session, obd_service_range_t *range)
{
    if (obd_ble_disc_svc(session->connection) != 0) { return false; }
    if (!collect_discovery(session, platform_uptime_ms() + 5000u, take_service, range) || range->start == 0u) {
        ESP_LOGW(OBD_TAG, "không thấy service 0x18F0");
        return false;
    }
    return true;
}

static void take_characteristic(const obd_ble_event_t *event, void *ctx)
{
    obd_characteristic_handles_t *handles = ctx;
    if (event->type != OBD_BLE_EV_CHR) { return; }
    if (handles->rx != 0u && event->characteristic.definition_handle > handles->rx && event->characteristic.definition_handle <= handles->rx_end) {
        handles->rx_end = (uint16_t)(event->characteristic.definition_handle - 1u);
    }
    if (event->characteristic.uuid16 == UUID_RX) { handles->rx = event->characteristic.value_handle; }
    if (event->characteristic.uuid16 == UUID_TX) { handles->tx = event->characteristic.value_handle; }
}

static bool discover_rx_tx_chars(obd_session_t *session, const obd_service_range_t *range, obd_characteristic_handles_t *handles)
{
    if (obd_ble_disc_chrs(session->connection, range->start, range->end) != 0) { return false; }
    handles->rx_end = range->end;
    if (!collect_discovery(session, platform_uptime_ms() + 5000u, take_characteristic, handles) ||
        handles->rx == 0u || handles->tx == 0u) {
        ESP_LOGW(OBD_TAG, "thiếu char 2AF0/2AF1");
        return false;
    }
    return true;
}

static void take_cccd(const obd_ble_event_t *event, void *ctx)
{
    uint16_t *cccd = ctx;
    if (event->type == OBD_BLE_EV_DSC && event->descriptor.uuid16 == 0x2902 && *cccd == 0u) { *cccd = event->descriptor.handle; }
}

static bool discover_rx_cccd(obd_session_t *session, const obd_characteristic_handles_t *handles, uint16_t *cccd)
{
    /* NimBLE starts descriptor discovery one handle beyond the value handle. */
    if (handles->rx_end <= handles->rx || obd_ble_disc_dscs(session->connection, handles->rx, handles->rx_end) != 0) {
        return false;
    }
    return collect_discovery(session, platform_uptime_ms() + 5000u, take_cccd, cccd) && *cccd != 0u;
}

static bool enable_rx_notify(obd_session_t *session, uint16_t cccd)
{
    obd_ble_event_t event;
    return obd_ble_enable_notify(session->connection, cccd) == 0 &&
           wait_gatt(session, platform_uptime_ms() + 5000u, &event) && event.type == OBD_BLE_EV_WRITE_DONE && event.status == 0;
}

bool obd_discovery_configure(obd_session_t *session)
{
    obd_service_range_t range = {0};
    obd_characteristic_handles_t handles = {0};
    uint16_t cccd = 0;
    if (!discover_obd_service(session, &range) || !discover_rx_tx_chars(session, &range, &handles) ||
        !discover_rx_cccd(session, &handles, &cccd) || !enable_rx_notify(session, cccd)) {
        return false;
    }
    session->rx_handle = handles.rx;
    session->tx_handle = handles.tx;
    return true;
}
