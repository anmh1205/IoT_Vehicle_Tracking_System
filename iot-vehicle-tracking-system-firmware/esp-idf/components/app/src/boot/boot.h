#pragma once
#include <stdbool.h>
#include "ivts_core/model/config.h"
#include "ivts_core/event/event.h"

/* Initialize components in dependency order before starting the app task. */
bool app_boot_init(void);

/* Convert device policy into the axes and FSM parameters used by the app task. */
void app_config_apply(const ivts_config_t *config);

/* Bring up components with PCB pin assignments and one common event sink. */
bool app_wiring_init_board(ivts_sink_t sink);
bool app_wiring_init_storage(ivts_sink_t sink);
bool app_wiring_init_modem(ivts_sink_t sink, ivts_config_t *config, bool provisioned);
void app_wiring_init_obd(ivts_sink_t sink, const ivts_config_t *config);
bool app_wiring_init_ota(ivts_sink_t sink);
void app_wiring_register_acks(void);
