from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HANDLER = (ROOT / "components/domain-connectivity/src/command_handler.c").read_text(encoding="utf-8")
HEADER = (ROOT / "components/domain-connectivity/include/command_handler.h").read_text(encoding="utf-8")
RUNTIME = (ROOT / "components/app-core/src/state_ota_runtime.c").read_text(encoding="utf-8")
NVS = (ROOT / "components/adapter-kv-nvs/src/nvs_config.c").read_text(encoding="utf-8")
NVS_KEYS = (ROOT / "components/adapter-kv-nvs/include/nvs_store_keys.h").read_text(encoding="utf-8")


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


def test_enable_tracking_is_restored_from_dedicated_nvs_state():
    init = HANDLER.split("esp_err_t command_handler_init", 1)[1].split(
        "static bool command_parse_ota_update", 1
    )[0]
    assert "nvs_config_load_tracking_enabled" in init
    assert "s_tracking_enabled = tracking_enabled_found ? persisted_tracking_enabled : true;" in init
    assert 'TRACKER_NVS_TRACKING_ENABLED_KEY "track_en_v1"' in NVS_KEYS
    assert "nvs_get_u8(handle, TRACKER_NVS_TRACKING_ENABLED_KEY" in NVS


def test_enable_tracking_persists_before_ram_success_state():
    apply = HANDLER.split(
        "esp_err_t command_handler_apply_pending_tracking_enabled", 1
    )[1].split("bool command_handler_take_ota_command", 1)[0]
    persist = apply.index("nvs_config_save_tracking_enabled(enabled)")
    ram = apply.index("s_tracking_enabled = enabled;", persist)
    assert persist < ram
    assert "return persist_err;" in apply
    assert "durable=1" in apply
