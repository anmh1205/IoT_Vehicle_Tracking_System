/**
 * @file msg_seq.c
 * @brief Per-boot message-sequence allocation and restoration.
 *
 * The app task allocates sequence numbers for new records. The deep-sleep
 * context restores the counter alongside the same boot ID.
 */
#include "app_internal.h"

static uint32_t s_sequence;

uint32_t app_msg_seq_next(void) { return ++s_sequence; }
uint32_t app_msg_seq_current(void) { return s_sequence; }
void app_msg_seq_restore(uint32_t seq) { s_sequence = seq; }
