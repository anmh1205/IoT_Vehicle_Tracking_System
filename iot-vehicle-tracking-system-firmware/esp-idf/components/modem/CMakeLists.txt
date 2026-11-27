idf_component_register(
    SRCS "src/modem.c" "src/at_parser.c" "src/at_engine.c" "src/gnss_parse.c"
         "src/modem_lte.c" "src/modem_gnss.c" "src/modem_mqtt.c" "src/modem_http.c" "src/modem_os.c"
    INCLUDE_DIRS "include"
    REQUIRES ivts-core
    PRIV_REQUIRES esp_driver_uart esp_driver_gpio esp_pm esp_timer
)
