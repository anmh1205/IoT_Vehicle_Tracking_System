#pragma once

#include <stdbool.h>
#include <stdint.h>

/**
 * @file session_mgr.h
 * @brief Ignition-only session lifecycle with debounce and OFF drain window.
 */

typedef enum {
    SESSION_STATE_IDLE = 0,
    SESSION_STATE_STARTING,
    SESSION_STATE_ACTIVE,
    SESSION_STATE_STOPPING,
} session_state_t;

void session_mgr_init(void);
void session_mgr_on_ignition_sample(bool ignition_on, uint64_t now_ms);
bool session_mgr_should_start(void);
bool session_mgr_should_stop(void);
void session_mgr_mark_started(uint64_t now_ms);
void session_mgr_mark_stopped(uint64_t now_ms);
uint32_t session_mgr_current_session_id(void);
session_state_t session_mgr_state(void);
bool session_mgr_is_active(void);
uint32_t session_mgr_drain_timeout_ms(void);
