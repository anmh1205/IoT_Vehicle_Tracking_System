/**
 * @file src/persist/msg_seq.c
 * @brief In-memory message sequence allocation for the current boot identity.
 *
 * The app task allocates sequences for new messages. Startup restores the counter from retained
 * context and the app task snapshots it before sleep. Boot identity and persistence belong
 * to the boot and RTC context modules.
 */
#include "app_internal.h"

/* Startup restores this counter. The app task owns it thereafter without a lock. */
static uint32_t s_sequence;

uint32_t app_msg_seq_next(void) { return ++s_sequence; }
uint32_t app_msg_seq_current(void) { return s_sequence; }
void app_msg_seq_restore(uint32_t seq) { s_sequence = seq; }
