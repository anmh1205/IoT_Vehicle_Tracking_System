from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HANDLER = (ROOT / "components/domain-connectivity/src/command_handler.c").read_text(encoding="utf-8")
HEADER = (ROOT / "components/domain-connectivity/include/command_handler.h").read_text(encoding="utf-8")
RUNTIME = (ROOT / "components/app-core/src/state_ota_runtime.c").read_text(encoding="utf-8")


def test_enable_tracking_is_deferred_with_command_id():
    assert "COMMAND_ACTION_ENABLE_TRACKING" in HEADER
    branch = HANDLER.split('COMMAND_NAME_ENABLE_TRACKING) == 0', 1)[1].split(
        'COMMAND_NAME_REBOOT) == 0', 1
    )[0]
    assert ".command_id = parsed_command_id" in branch
    assert ".action = COMMAND_ACTION_ENABLE_TRACKING" in branch
    assert ".tracking_enabled = cJSON_IsTrue(enabled)" in branch
    assert "*out_deferred = true" in branch
    assert "s_tracking_enabled = cJSON_IsTrue(enabled)" not in branch


def test_enable_tracking_side_effect_runs_from_fsm_executor():
    assert "command_handler_apply_pending_tracking_enabled" in HANDLER
    assert "action == COMMAND_ACTION_ENABLE_TRACKING" in RUNTIME
    assert "execution_result = command_handler_apply_pending_tracking_enabled();" in RUNTIME
