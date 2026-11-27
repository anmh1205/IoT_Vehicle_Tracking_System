#include "imu_wake.h"
#include "board/board_hw.h"
#include "board/board_power.h"
#include "driver/gpio.h"
#include "esp_sleep.h"

bool board_motion_deep_wake_capable(void)
{
    return BOARD_IMU_INT_IS_RTC_GPIO && esp_sleep_is_valid_wakeup_gpio((gpio_num_t)BOARD_PIN_IMU_INT1);
}

esp_err_t board_power_arm_imu_level_wake(void)
{
    const gpio_num_t imu_gpio = (gpio_num_t)BOARD_PIN_IMU_INT1;
    /* Chuyển chân sang wake theo mức mà không phát ISR lặp khi INT1 còn chốt. */
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
