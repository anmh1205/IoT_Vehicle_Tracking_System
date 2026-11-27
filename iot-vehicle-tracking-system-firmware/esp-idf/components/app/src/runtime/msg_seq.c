#include "app_msg_seq.h"

static uint32_t s_sequence;

uint32_t app_msg_seq_next(void) { return ++s_sequence; }
uint32_t app_msg_seq_current(void) { return s_sequence; }
void app_msg_seq_restore(uint32_t seq) { s_sequence = seq; }
