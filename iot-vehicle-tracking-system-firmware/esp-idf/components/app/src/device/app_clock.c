/**
 * @file src/device/app_clock.c
 * @brief Clock access for app deadlines and cloud timestamps.
 *
 * The app task uses monotonic uptime for deadlines. The app task and OTA worker use the board
 * RTC for trusted UTC. RTC reads can wait on the shared I2C adapter, which owns device access
 * and clock trust evaluation.
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
