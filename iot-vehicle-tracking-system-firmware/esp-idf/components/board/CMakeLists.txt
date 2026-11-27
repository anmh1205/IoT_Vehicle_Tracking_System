idf_component_register(
    SRCS
        # Board setup and sampling task
        "src/bsp/board.c" "src/bsp/board_task.c"
        # Shared bus
        "src/bus/i2c_bus.c"
        # Sensor drivers and pure conversion functions
        "src/drivers/ds3231.c" "src/drivers/ds3231_calc.c"
        "src/drivers/lis3dsh.c" "src/drivers/lis3dsh_calc.c"
        "src/drivers/power_adc.c" "src/drivers/power_adc_calc.c"
        # Sleep and wake sources
        "src/power/sleep.c" "src/power/imu_wake.c" "src/power/wake_cause.c"
    INCLUDE_DIRS "include"
    PRIV_INCLUDE_DIRS "src"
    REQUIRES ivts-core
    PRIV_REQUIRES esp_driver_i2c esp_driver_gpio esp_adc esp_pm platform
)
