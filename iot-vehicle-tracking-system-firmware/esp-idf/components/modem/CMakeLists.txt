idf_component_register(
    SRCS
        # Core and task
        "src/modem.c" "src/modem_task.c"
        # AT framing and execution
        "src/at/at_parser.c" "src/at/at_engine.c" "src/at/at_dispatch.c"
        # UART and power transport
        "src/transport/modem_uart.c" "src/transport/modem_power.c"
        # MQTT session, publish, receive and slots
        "src/mqtt/mqtt_session.c" "src/mqtt/mqtt_publish.c" "src/mqtt/mqtt_rx.c"
        "src/mqtt/mqtt_slots.c"
        # GNSS, HTTP and LTE link services
        "src/services/gnss.c" "src/services/http.c" "src/services/link.c"
    INCLUDE_DIRS "include"
    PRIV_INCLUDE_DIRS "src"
    REQUIRES ivts-core
    PRIV_REQUIRES esp_driver_uart esp_driver_gpio esp_pm platform
)
