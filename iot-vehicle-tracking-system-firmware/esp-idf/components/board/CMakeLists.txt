idf_component_register(
    SRCS
        # Board setup and sampling task
        "src/board.c" "src/board_task.c"
        # Shared bus
        "src/i2c_bus.c"
        # Sensor drivers and pure conversion functions
        "src/drivers/ds3231.c" "src/board_calc.c"
        "src/drivers/lis3dsh.c"
        "src/drivers/power_adc.c"
        # Sleep and wake sources
        "src/sleep.c" "src/wake.c"
    INCLUDE_DIRS "include"
    PRIV_INCLUDE_DIRS "src"
    REQUIRES ivts-core
    PRIV_REQUIRES esp_driver_i2c esp_driver_gpio esp_adc esp_pm platform
)
