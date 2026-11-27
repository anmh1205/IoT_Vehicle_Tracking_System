"""Guard the real bootstrap-to-FSM dependency injection path against regressions.

The registry used to be validated and then discarded while the FSM called
concrete adapters anyway. These are executable source boundary checks; ESP-IDF
cross-compilation is the separate C type/link verification gate.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMPONENTS = ROOT / "components"
BOOTSTRAP = (COMPONENTS / "app-core/src/tracker-app-bootstrap.c").read_text(encoding="utf-8")
FACADE = (COMPONENTS / "app-core/src/state_machine.c").read_text(encoding="utf-8")
CORE = (COMPONENTS / "app-core/src/state_machine_core.c").read_text(encoding="utf-8")
PORTS = (COMPONENTS / "platform-hal-esp-idf/src/tracker-runtime-ports.c").read_text(encoding="utf-8")


def test_bootstrap_binds_registry_before_first_fsm_init():
    assert "state_machine_bind_runtime_ports(&s_runtime_ports)" in BOOTSTRAP
    assert BOOTSTRAP.index("state_machine_bind_runtime_ports(&s_runtime_ports)") < BOOTSTRAP.index("err = state_machine_init(&config)")
    assert "return state_machine_core_bind_ports(ports);" in FACADE


def test_binding_validates_and_init_fails_closed_without_it():
    bind = CORE.split("esp_err_t state_machine_core_bind_ports(", 1)[1].split("esp_err_t state_machine_core_init(", 1)[0]
    assert "tracker_runtime_ports_validate(ports)" in bind
    assert "if (err != ESP_OK)" in bind
    assert "s_runtime_ports = ports;" in bind
    init = CORE.split("esp_err_t state_machine_core_init(", 1)[1].split("app_state_t state_machine_core_run(", 1)[0]
    assert "ESP_RETURN_ON_NULL(s_runtime_ports, ESP_ERR_INVALID_STATE" in init


def test_runtime_init_uses_injected_services_not_side_by_side_adapter_calls():
    init = CORE.split("esp_err_t state_machine_core_init(", 1)[1].split("app_state_t state_machine_core_run(", 1)[0]
    injected = (
        "power_control->init()", "rtc_clock->init()", "rtc_clock->get_health(",
        "modem->set_apn(", "modem->request_connect()", "mqtt->init(",
        "storage_queue->init()", "mqtt->set_command_callback(",
    )
    for call in injected:
        assert "s_runtime_ports->" + call in init
    concrete = (
        "power_mgr_init()", "rtc_ds3231m_init()", "rtc_ds3231m_get_health(",
        "modem_lte_set_apn(", "modem_lte_request_connect()", "tracker_mqtt_init(",
        "offline_queue_init()", "tracker_mqtt_set_command_callback(",
    )
    for call in concrete:
        assert call not in init


def test_port_validation_checks_every_init_callback_used():
    for expression in (
        "ports->power_control->init", "ports->rtc_clock->init",
        "ports->rtc_clock->get_health", "ports->modem->set_apn",
        "ports->modem->request_connect", "ports->mqtt->init",
        "ports->storage_queue->init", "ports->mqtt->set_command_callback",
    ):
        assert expression in PORTS
