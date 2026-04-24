#pragma once

#include "app_state.h"

/**
 * @file state_sleep_controller.h
 * @brief Sleep decision and entry helpers for the tracker FSM.
 */

tracker_sleep_mode_t state_machine_resolve_sleep_mode(app_state_t app_state);
bool state_machine_can_enter_sleep(const char **out_reason);
void state_machine_shutdown_for_sleep(void);
app_state_t state_machine_enter_fake_sleep(void);
app_state_t state_machine_enter_light_sleep(void);
void state_machine_prepare_deep_sleep_wakeup(void);
app_state_t state_machine_enter_configured_sleep(void);
