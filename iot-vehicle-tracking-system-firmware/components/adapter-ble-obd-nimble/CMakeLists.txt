string(CONCAT BLE_STACK_COMPONENT b t)

idf_component_register(
    SRCS
        "src/ble_init.c"
        "src/ble_mgr.c"
        "src/ble_obd.c"
        "src/ble_util.c"
    INCLUDE_DIRS
        "include"
    REQUIRES
        ${BLE_STACK_COMPONENT}
        log
        shared-kernel
)
