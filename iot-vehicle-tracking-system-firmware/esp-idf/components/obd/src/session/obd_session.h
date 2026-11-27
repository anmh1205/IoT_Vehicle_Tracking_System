#pragma once
#include "elm/elm327.h"
#include "ivts_core/model/obd.h"

typedef struct {
    bool is_synced;
    bool is_connected;
    bool is_ecu_ready;
    uint16_t connection;
    uint16_t rx_handle;
    uint16_t tx_handle;
    elm_rx_t reply;
} obd_session_t;

/* OBD task. Run scan, connect, discovery and the ELM initialization sequence. */
bool obd_session_setup(obd_session_t *session);
bool obd_session_command(obd_session_t *session, const char *command, uint32_t timeout_ms);
void obd_session_emit_link(bool connected, bool elm_ready, ivts_ecu_state_t ecu);
