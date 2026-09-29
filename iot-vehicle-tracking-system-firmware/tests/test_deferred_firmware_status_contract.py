from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (
    ROOT / "components" / "app-core" / "src" / "state_publish_pipeline.c"
).read_text(encoding="utf-8")
HEADER = (
    ROOT / "components" / "app-core" / "include" / "state_publish_pipeline.h"
).read_text(encoding="utf-8")
CORE = (
    ROOT / "components" / "app-core" / "src" / "state_machine_core.c"
).read_text(encoding="utf-8")
OTA_RUNTIME = (
    ROOT / "components" / "app-core" / "src" / "state_ota_runtime.c"
).read_text(encoding="utf-8")
NVS_HEADER = (
    ROOT / "components" / "adapter-kv-nvs" / "include" / "nvs_config.h"
).read_text(encoding="utf-8")
NVS_SOURCE = (
    ROOT / "components" / "adapter-kv-nvs" / "src" / "nvs_config.c"
).read_text(encoding="utf-8")
NVS_KEYS = (
    ROOT / "components" / "adapter-kv-nvs" / "include" / "nvs_store_keys.h"
).read_text(encoding="utf-8")


def test_firmware_publish_retains_failed_report_in_ram_and_nvs():
    assert "bool state_machine_publish_firmware_payload" in SOURCE
    assert "if (!accepted)" in SOURCE
    assert "state_machine_defer_firmware_report(firmware);" in SOURCE
    assert "nvs_config_save_deferred_firmware_report(firmware)" in SOURCE
    assert "s_deferred_firmware_report_pending = true;" in SOURCE
    assert "s_deferred_firmware_report_nvs_persisted = persist_err == ESP_OK;" in SOURCE


def test_retries_do_not_rewrite_same_nvs_report_forever():
    assert "state_machine_firmware_report_same_payload" in SOURCE
    assert "durable=nvs_existing" in SOURCE
    assert (
        "s_deferred_firmware_report_nvs_persisted &&\n"
        "        state_machine_firmware_report_same_payload("
        "firmware, &s_deferred_firmware_report)"
    ) in SOURCE


def test_deferred_report_clears_nvs_only_after_normal_pipeline_acceptance():
    publish = SOURCE.split("bool state_machine_publish_firmware_payload", 1)[1]
    publish = publish.split("bool state_machine_publish_firmware_status", 1)[0]
    assert "if (!accepted)" in publish
    assert "return false;" in publish
    assert "state_machine_clear_deferred_firmware_report_recovery();" in publish
    assert "return true;" in publish
    assert "nvs_config_clear_deferred_firmware_report()" in SOURCE


def test_nvs_recovery_blob_has_save_load_clear_contract():
    assert 'TRACKER_NVS_FIRMWARE_REPORT_KEY "fw_report_v1"' in NVS_KEYS
    assert "firmware_status_t" in NVS_HEADER
    assert "nvs_config_save_deferred_firmware_report" in NVS_HEADER
    assert "nvs_config_load_deferred_firmware_report" in NVS_HEADER
    assert "nvs_config_clear_deferred_firmware_report" in NVS_HEADER
    assert "nvs_set_blob(handle, TRACKER_NVS_FIRMWARE_REPORT_KEY" in NVS_SOURCE
    assert "nvs_get_blob(handle, TRACKER_NVS_FIRMWARE_REPORT_KEY" in NVS_SOURCE
    assert "nvs_erase_key(handle, TRACKER_NVS_FIRMWARE_REPORT_KEY)" in NVS_SOURCE
    assert "nvs_commit(handle)" in NVS_SOURCE


def test_boot_restores_deferred_report_before_ota_confirmation():
    restore = CORE.index("state_machine_restore_deferred_firmware_report();")
    confirm = CORE.index("state_machine_try_confirm_running_firmware();", restore)
    assert restore < confirm
    assert "state_machine_restore_deferred_firmware_report" in HEADER


def test_restart_safety_accepts_nvs_backed_ram_report():
    assert "bool state_machine_firmware_report_restart_safe(void)" in SOURCE
    helper = SOURCE.split("bool state_machine_firmware_report_restart_safe(void)", 1)[1]
    assert (
        "return !s_deferred_firmware_report_pending ||\n"
        "           s_deferred_firmware_report_nvs_persisted;"
    ) in helper


def test_confirm_timeout_does_not_restart_with_ram_only_report():
    confirm = OTA_RUNTIME.split("void state_machine_try_confirm_running_firmware", 1)[1]
    timeout = confirm.split("TRACKER_OTA_ERROR_CONFIRM_TIMEOUT_EXCEEDED", 1)[1]
    timeout = timeout.split("// Publish the confirming state", 1)[0]
    assert "state_machine_firmware_report_restart_safe()" in timeout
    assert "s_restart_after_firmware_report = true;" in timeout
    assert "terminal_report_not_durable" in timeout


def test_command_driven_restart_waits_for_firmware_report_recovery():
    executor = OTA_RUNTIME.split("void state_machine_handle_pending_action", 1)[1]
    executor = executor.split("void state_machine_try_confirm_running_firmware", 1)[0]
    command_restart = executor.split("if (s_restart_after_command_ack)", 1)[1]
    assert "state_machine_firmware_report_restart_safe()" in command_restart
    assert command_restart.index("state_machine_firmware_report_restart_safe()") < command_restart.index("esp_restart();")


def test_offline_firmware_status_still_uses_durable_pipeline():
    publish_or_stage = SOURCE.split(
        "void state_machine_publish_or_stage_firmware_status", 1
    )[1].split("void state_machine_try_flush_deferred_firmware_report", 1)[0]
    assert "state_machine_publish_firmware_status(" in publish_or_stage
    assert "tracker_mqtt_is_connected()" not in publish_or_stage
    assert "OFFLINE_RECORD_FIRMWARE" in SOURCE


def test_successful_newer_status_supersedes_pending_same_job_and_cleans_recovery():
    assert "state_machine_firmware_report_same_lineage" in SOURCE
    publish = SOURCE.split("bool state_machine_publish_firmware_payload", 1)[1]
    publish = publish.split("bool state_machine_publish_firmware_status", 1)[0]
    assert "state_machine_firmware_report_same_lineage(firmware, &s_deferred_firmware_report)" in publish
    assert "s_deferred_firmware_report_pending = false;" in publish
    assert "state_machine_clear_deferred_firmware_report_recovery();" in publish
