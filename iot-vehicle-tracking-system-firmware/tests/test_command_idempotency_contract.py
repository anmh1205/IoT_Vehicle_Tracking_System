from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HANDLER = (ROOT / "components/domain-connectivity/src/command_handler.c").read_text(encoding="utf-8")
HEADER = (ROOT / "components/domain-connectivity/include/command_handler.h").read_text(encoding="utf-8")
CORE = (ROOT / "components/app-core/src/state_machine_core.c").read_text(encoding="utf-8")


def test_recent_command_cache_is_bounded_and_larger_than_cloud_window():
    assert "#define COMMAND_HANDLER_RECENT_COMMAND_CACHE_LEN 32U" in HANDLER
    assert "s_recent_command_ids[COMMAND_HANDLER_RECENT_COMMAND_CACHE_LEN]" in HANDLER
    assert "command_handler_is_recent_command_id" in HANDLER
    assert "command_handler_remember_command_id" in HANDLER


def test_duplicate_is_checked_before_command_side_effect_staging():
    process = HANDLER.split("esp_err_t command_handler_process", 1)[1]
    duplicate_index = process.index("command_handler_is_recent_command_id(parsed_command_id)")
    verb_index = process.index("COMMAND_NAME_UPDATE_CONFIG")
    assert duplicate_index < verb_index
    assert "*out_duplicate = true" in process


def test_only_successfully_accepted_commands_are_remembered():
    process = HANDLER.split("esp_err_t command_handler_process", 1)[1]
    assert "if (result == ESP_OK && parsed_command_id != 0U)" in process
    assert "command_handler_remember_command_id(parsed_command_id);" in process


def test_app_core_drops_duplicate_without_second_ack_or_action():
    assert "bool duplicate = false;" in CORE
    assert "command_handler_process(payload, &command_id, &deferred, &duplicate)" in CORE
    duplicate_block = CORE.split("if (duplicate)", 1)[1].split("if (command_id == 0U)", 1)[0]
    assert "return;" in duplicate_block
    assert "xQueueSendToBack" not in duplicate_block
    assert "command_handler_process" in HEADER
    assert "bool *out_duplicate" in HEADER
