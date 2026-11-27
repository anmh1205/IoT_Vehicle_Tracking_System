idf_component_register(
    SRCS "src/board.c" "src/board_i2c.c" "src/board_rtc.c" "src/board_imu.c"
         "src/board_adc.c" "src/board_power.c" "src/board_os.c"
    INCLUDE_DIRS "include"
    REQUIRES ivts-core
    PRIV_REQUIRES esp_driver_i2c esp_driver_gpio esp_adc esp_pm esp_timer
)
