"""Prevent reintroducing direct modem/MQTT/OBD adapter reads into FSM core."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORE = (ROOT / "components/app-core/src/state_machine_core.c").read_text(encoding="utf-8")
VALIDATE = (ROOT / "components/platform-hal-esp-idf/src/tracker-runtime-ports.c").read_text(encoding="utf-8")


def test_live_core_state_reads_really_use_injected_ports():
    for concrete in (
        "tracker_mqtt_is_connected()",
        "modem_lte_is_initialized()",
        "ble_obd_is_connected(s_ble_ctx)",
    ):
        assert concrete not in CORE
    for port_call in (
        "s_runtime_ports->mqtt->is_connected()",
        "s_runtime_ports->modem->is_initialized()",
        "s_runtime_ports->obd_reader->is_connected(s_ble_ctx)",
    ):
        assert port_call in CORE

    # Check reads in active runtime, not just declarations/initialization.
    runtime = CORE.split("app_state_t state_machine_core_run(", 1)[1]
    assert "s_runtime_ports->mqtt->is_connected()" in runtime


def test_any_new_port_callbacks_are_fail_fast_validated_at_boot():
    for mandatory in (
        "ports->modem->is_initialized",
        "ports->mqtt->is_connected",
        "ports->obd_reader->is_connected",
    ):
        assert "ESP_RETURN_ON_NULL(" + mandatory in VALIDATE
