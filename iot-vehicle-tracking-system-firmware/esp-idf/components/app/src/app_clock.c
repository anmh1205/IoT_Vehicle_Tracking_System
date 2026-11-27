/**
 * @file app_clock.c
 * @brief Clock access for application policy and cloud timestamps.
 *
 * Deadlines use monotonic uptime. Cloud timestamps require a trusted board RTC
 * reading and can block on I2C.
 */
#include "app_internal.h"
#include <stddef.h>
#include "board/board.h"
#include "platform/platform.h"

uint64_t app_now(void)
{
    return platform_uptime_ms();
}

uint64_t app_clock_unix_ms_or_zero(bool *trusted_out)
{
    uint64_t unix_ms = 0;
    bool trusted = false;
    (void)board_time_get(&unix_ms, &trusted);
    if (trusted_out != NULL) { *trusted_out = trusted; }
    return trusted ? unix_ms : 0u;
}
