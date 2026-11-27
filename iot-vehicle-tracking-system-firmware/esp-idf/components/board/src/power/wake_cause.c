#include "wake_cause.h"
#include "esp_sleep.h"

/** Nguyên nhân thức của lần boot hiện tại, chốt bởi board_power_capture_wake(). */
static board_wake_t s_boot_wake = BOARD_WAKE_POWER_ON;

static board_wake_t map_causes(uint32_t causes)
{
    /* Dùng bitmap của esp_sleep_get_wakeup_causes() vì nhiều nguồn có thể thức cùng lúc.
     * Khi GPIO/EXT và timer cùng kích hoạt, IMU được ưu tiên báo vì là sự kiện không lặp lại. */
    if (causes & (BIT(ESP_SLEEP_WAKEUP_GPIO) | BIT(ESP_SLEEP_WAKEUP_EXT0) | BIT(ESP_SLEEP_WAKEUP_EXT1))) {
        return BOARD_WAKE_IMU;
    }
    if (causes & BIT(ESP_SLEEP_WAKEUP_TIMER)) {
        return BOARD_WAKE_TIMER;
    }
    return (causes == 0u || causes == BIT(ESP_SLEEP_WAKEUP_UNDEFINED)) ? BOARD_WAKE_POWER_ON : BOARD_WAKE_OTHER;
}

board_wake_t board_power_read_wake_cause(void)
{
    return map_causes(esp_sleep_get_wakeup_causes());
}

void board_power_capture_wake(void)
{
    s_boot_wake = board_power_read_wake_cause();
}

board_wake_t board_wake_cause(void)
{
    return s_boot_wake;
}
