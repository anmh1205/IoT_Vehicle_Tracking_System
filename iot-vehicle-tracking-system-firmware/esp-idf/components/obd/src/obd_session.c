/**
 * @file obd_session.c
 * @brief ELM327 scanning, GATT discovery and adapter initialization.
 *
 * Match discovery results to the active BLE connection and use bounded waits.
 * Enable notifications before issuing ELM commands.
 */
#include "obd_internal.h"
#include "ivts_core/model/status.h"
#include "platform/log.h"
#include "platform/platform.h"
#include <stdio.h>
#include <string.h>

void obd_session_emit_link(bool conn, bool elm, ivts_ecu_state_t ecu)
{
    static bool last_conn, last_elm;
    static ivts_ecu_state_t last_ecu = IVTS_ECU_UNKNOWN;
    if (last_conn == conn && last_elm == elm && last_ecu == ecu) { return; }
    last_conn = conn;
    last_elm = elm;
    last_ecu = ecu;
    IVTS_LOGI(OBD_TAG, "link ble=%s elm=%s ecu=%s", conn ? "up" : "down", elm ? "ready" : "no", ivts_ecu_name(ecu));
    ivts_event_t ev = { .type = IVTS_EV_OBD_LINK, .ts_ms = platform_uptime_ms() };
    ev.u.obd_link.connected = conn;
    ev.u.obd_link.elm_ready = elm;
    ev.u.obd_link.ecu = (uint8_t)ecu;
    obd_emit(&ev);
}

bool obd_session_command(obd_session_t *session, const char *cmd, uint32_t timeout_ms)
{
    char line[16];
    snprintf(line, sizeof line, "%s\r", cmd);
    elm_rx_reset(&session->reply);
    uint64_t started_ms = platform_uptime_ms();
    if (obd_ble_write(session->connection, session->tx_handle, line) != 0) {
        IVTS_LOGW(OBD_TAG, "elm write cmd=%s result=fail", cmd);
        return false;
    }
    bool ok = obd_task_wait_event(session, OBD_BLE_EV_NOTIFY, timeout_ms, NULL) && session->reply.complete && !session->reply.overflow;
    unsigned long took_ms = (unsigned long)(platform_uptime_ms() - started_ms);
    IVTS_LOGD(OBD_TAG, "elm > %s  < \"%s\" %s %lums", cmd, session->reply.buf, IVTS_LOG_OK(ok), took_ms);
    if (!ok && session->is_connected && obd_task_is_enabled()) {
        IVTS_LOGW(OBD_TAG, "elm reply cmd=%s result=%s took=%lums", cmd,
                  session->reply.overflow ? "overflow" : "incomplete", took_ms);
    }
    return ok;
}

static bool scan_for_adapter(obd_session_t *session, uint8_t addr[7])
{
    if (obd_ble_scan() != 0) { return false; }
    uint64_t deadline_at_ms = platform_uptime_ms() + 11000u;
    for (;;) {
        uint64_t now_ms = platform_uptime_ms();
        obd_ble_event_t event;
        if (now_ms >= deadline_at_ms || !obd_task_wait_event(session, OBD_BLE_WAIT_ANY, (uint32_t)(deadline_at_ms - now_ms), &event) ||
            event.type == OBD_BLE_EV_SCAN_DONE) {
            obd_ble_scan_stop();
            return false;
        }
        if (event.type == OBD_BLE_EV_ADV) {
            memcpy(addr, event.advertisement.address, sizeof event.advertisement.address);
            return true;
        }
    }
}

static bool connect_adapter(obd_session_t *session, const uint8_t addr[7])
{
    obd_ble_event_t event;
    if (obd_ble_connect(addr) != 0 || !obd_task_wait_event(session, OBD_BLE_EV_CONNECTED, 11000u, &event) || event.status != 0) {
        return false;
    }
    session->connection = event.conn;
    session->is_connected = true;
    obd_session_emit_link(true, false, IVTS_ECU_UNKNOWN);
    return true;
}

static bool run_elm_init_sequence(obd_session_t *session)
{
    for (size_t i = 0; i < ELM_INIT_SEQ_LEN; i++) {
        const elm_init_step_t *step = &ELM_INIT_SEQ[i];
        if (!obd_session_command(session, step->cmd, step->timeout_ms) || !elm_reply_valid(session->reply.buf, step->is_reset, true)) {
            IVTS_LOGW(OBD_TAG, "elm init cmd=%s result=fail reply=\"%s\"", step->cmd, session->reply.buf);
            return false;
        }
    }
    return true;
}

bool obd_session_setup(obd_session_t *session)
{
    uint8_t addr[7] = {0};
    if (!scan_for_adapter(session, addr) || !connect_adapter(session, addr) ||
        !obd_discovery_configure(session)) {
        return false;
    }
    if (!run_elm_init_sequence(session)) { return false; }
    session->is_ecu_ready = false;
    obd_session_emit_link(true, true, IVTS_ECU_UNKNOWN);
    return true;
}

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
        IVTS_LOGW(OBD_TAG, "ble discover service=0x18F0 result=not_found");
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
        IVTS_LOGW(OBD_TAG, "ble discover chars=0x2AF0/0x2AF1 result=not_found");
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
