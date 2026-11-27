idf_component_register(
    SRCS
        "src/modem.c" "src/modem_task.c"
        # UART and power
        "src/transport/modem_uart.c" "src/transport/modem_power.c"
        # AT framing and execution
        "src/at/at_parser.c" "src/at/at_engine.c" "src/at/at_dispatch.c"
        # LTE and MQTT
        "src/modem_link.c" "src/link_steps.c"
        "src/mqtt/mqtt_session.c" "src/mqtt/mqtt_publish.c" "src/mqtt/mqtt_rx.c"
        # HTTP and GNSS
        "src/modem_http.c" "src/modem_gnss.c" "src/gnss_parse.c"
        # Cross-task slots
        "src/slots.c"
    INCLUDE_DIRS "include"
    PRIV_INCLUDE_DIRS "src"
    REQUIRES ivts-core
    PRIV_REQUIRES esp_driver_uart esp_driver_gpio esp_pm platform
)
