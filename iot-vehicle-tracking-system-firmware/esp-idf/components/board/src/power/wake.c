/**
 * @file src/power/wake.c
 * @brief Wake-source mapping and INT1 GPIO wake configuration.
 *
 * Board startup caches the boot wake classification. The app sleep path reads the current SDK bitmap on wake.
 * It switches INT1 to level wake for light sleep and restores rising-edge notification afterward.
 * Handling the IMU latch belongs to the board task.
 */
#include "board_internal.h"
#include "board/board_hw.h"
#include "power/power.h"
#include "driver/gpio.h"
#include "esp_sleep.h"

bool board_motion_deep_wake_capable(void)
{
    return BOARD_IMU_INT_IS_RTC_GPIO && esp_sleep_is_valid_wakeup_gpio((gpio_num_t)BOARD_PIN_IMU_INT1);
}

esp_err_t board_power_arm_imu_level_wake(void)
{
    const gpio_num_t imu_gpio = (gpio_num_t)BOARD_PIN_IMU_INT1;
    /* Switch INT1 to level wake without repeatedly delivering the latched ISR. */
    (void)gpio_intr_disable(imu_gpio);
    esp_err_t error = gpio_wakeup_enable(imu_gpio, GPIO_INTR_HIGH_LEVEL);
    return error == ESP_OK ? esp_sleep_enable_gpio_wakeup() : error;
}

void board_power_restore_imu_edge_irq(void)
{
    const gpio_num_t imu_gpio = (gpio_num_t)BOARD_PIN_IMU_INT1;
    (void)gpio_wakeup_disable(imu_gpio);
    (void)gpio_set_intr_type(imu_gpio, GPIO_INTR_POSEDGE);
    (void)gpio_intr_enable(imu_gpio);
}

void board_power_arm_imu_deep_wake(void)
{
    (void)esp_sleep_enable_ext1_wakeup_io(1ULL << BOARD_PIN_IMU_INT1, ESP_EXT1_WAKEUP_ANY_HIGH);
}

/* Startup writes the boot wake reason. Runtime readers use the unchanged value. */
static board_wake_t s_boot_wake = BOARD_WAKE_POWER_ON;

/**
 * @brief Prefer a GPIO wake bit when GPIO and timer causes occur together.
 */
static board_wake_t map_causes(uint32_t causes)
{
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

const char *board_wake_name(board_wake_t wake)
{
    switch (wake) {
    case BOARD_WAKE_POWER_ON: return "power_on";
    case BOARD_WAKE_TIMER: return "timer";
    case BOARD_WAKE_IMU: return "imu";
    default: return "other";
    }
}
