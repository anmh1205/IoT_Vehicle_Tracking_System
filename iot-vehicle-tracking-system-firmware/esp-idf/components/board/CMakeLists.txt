idf_component_register(
    SRCS
        # Board setup and sampling task
        "src/board.c" "src/board_task.c"
        # Sensor drivers, shared I2C bus and pure conversion helpers
        "src/drivers/i2c_bus.c"
        "src/drivers/ds3231.c" "src/drivers/drivers_calc.c"
        "src/drivers/lis3dsh.c"
        "src/drivers/power_adc.c"
        # Sleep and wake sources
        "src/power/sleep.c" "src/power/wake.c"
    INCLUDE_DIRS "include"
    PRIV_INCLUDE_DIRS "src"
    REQUIRES ivts-core
    PRIV_REQUIRES esp_driver_i2c esp_driver_gpio esp_adc esp_pm platform
)
