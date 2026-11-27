#include "obd_internal.h"
#include "esp_log.h"
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
    if (obd_ble_write(session->connection, session->tx_handle, line) != 0) { return false; }
    bool ok = obd_task_wait_event(session, OBD_BLE_EV_NOTIFY, timeout_ms, NULL) && session->reply.complete && !session->reply.overflow;
    if (!ok && session->is_connected && obd_task_is_enabled()) { ESP_LOGW(OBD_TAG, "ELM %s: phản hồi thiếu hoặc quá dài", cmd); }
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
            ESP_LOGW(OBD_TAG, "ELM init %s lỗi: %s", step->cmd, session->reply.buf);
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
