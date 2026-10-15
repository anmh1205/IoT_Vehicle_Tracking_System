from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HANDLER = (ROOT / "components/domain-connectivity/src/command_handler.c").read_text(encoding="utf-8")
SLEEP = (ROOT / "components/app-core/src/state_sleep_controller.c").read_text(encoding="utf-8")
OTA = (ROOT / "components/app-core/src/state_ota_runtime.c").read_text(encoding="utf-8")


def test_pending_action_check_is_non_consuming_and_sees_dedupe_nvs_checkpoint():
    block = HANDLER.split("bool command_handler_has_pending_actions(void)", 1)[1]
    assert "uxQueueMessagesWaiting(s_action_queue)" in block
    assert "atomic_load(&s_recent_command_persist_pending)" in block
    assert "xQueueReceive" not in block
    assert "xQueueReset" not in block


def test_deep_sleep_cannot_drop_command_ack_action_or_reboot():
    entry = SLEEP.split("bool state_machine_can_enter_sleep", 1)[1].split("void state_machine_shutdown_for_sleep", 1)[0]
    assert "state_machine_resolve_sleep_mode(APP_STATE_SLEEP) == TRACKER_SLEEP_MODE_DEEP" in entry
    assert "state_machine_has_pending_command_acks()" in entry
    assert "command_handler_has_pending_actions()" in entry
    assert "state_machine_has_pending_restart_after_ack()" in entry
    assert '"volatile_cloud_command_pending"' in entry


def test_deferred_reboot_flag_is_not_implicitly_cleared_before_ack_delivery():
    assert "return s_restart_after_command_ack;" in OTA
    processor = OTA.split("void state_machine_handle_pending_action", 1)[1]
    assert processor.index("state_machine_has_pending_command_acks()") < processor.index("s_restart_after_command_ack = false")
