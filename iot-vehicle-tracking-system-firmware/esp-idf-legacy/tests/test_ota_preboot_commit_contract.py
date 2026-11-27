from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OTA_EXECUTOR = (
    ROOT / "components" / "domain-ota" / "src" / "util_ota_update.c"
).read_text(encoding="utf-8")
OTA_RUNTIME = (
    ROOT / "components" / "app-core" / "src" / "state_ota_runtime.c"
).read_text(encoding="utf-8")
OTA_HEADER = (
    ROOT / "components" / "domain-ota" / "include" / "ota_executor.h"
).read_text(encoding="utf-8")
OTA_CONTRACT = (
    ROOT / "components" / "contracts-device-cloud" / "include" / "ota_contract.h"
).read_text(encoding="utf-8")


def test_confirm_context_is_committed_before_boot_partition_promotion():
    finalize = OTA_EXECUTOR.split("static esp_err_t util_ota_finalize_image", 1)[1]
    finalize = finalize.split("static void util_ota_cleanup_update", 1)[0]
    commit = finalize.index("preboot_commit_callback(cmd, out_status, preboot_commit_ctx)")
    promote = finalize.index("esp_ota_set_boot_partition(ctx->update_partition)")
    rebooting = finalize.index("TRACKER_OTA_STATUS_REBOOTING")
    assert commit < promote < rebooting
    assert "TRACKER_OTA_ERROR_CONTEXT_PERSIST_FAILED" in finalize


def test_app_core_preboot_hook_persists_complete_confirm_contract():
    callback = OTA_RUNTIME.split(
        "static esp_err_t state_machine_ota_preboot_commit_callback", 1
    )[1]
    callback = callback.split("void state_machine_handle_pending_action", 1)[0]
    assert "g_rtc_context.ota_job_id" in callback
    assert "g_rtc_context.ota_target_version" in callback
    assert "g_rtc_context.ota_previous_version" in callback
    assert "g_rtc_context.ota_partition" in callback
    assert "g_rtc_context.ota_pending_confirm = true;" in callback
    assert "return state_machine_persist_ota_context();" in callback
    assert "typedef esp_err_t (*ota_preboot_commit_callback_t)" in OTA_HEADER


def test_failed_boot_promotion_cleans_precommitted_context():
    process = OTA_RUNTIME.split("esp_err_t state_machine_process_ota_command", 1)[1]
    assert "bool had_pending_confirm = g_rtc_context.ota_pending_confirm;" in process
    assert "state_machine_clear_persisted_ota_context();" in process


def test_reboot_confirmation_requires_running_partition_to_match_context():
    confirm = OTA_RUNTIME.split("void state_machine_try_confirm_running_firmware", 1)[1]
    confirm = confirm.split("esp_err_t state_machine_process_ota_command", 1)[0]
    assert "strcmp(running->label, g_rtc_context.ota_partition) != 0" in confirm
    assert "TRACKER_OTA_ERROR_CONFIRM_PARTITION_MISMATCH" in confirm
    assert "esp_ota_mark_app_valid_cancel_rollback()" in confirm
    mismatch = confirm.index("TRACKER_OTA_ERROR_CONFIRM_PARTITION_MISMATCH")
    mark_valid = confirm.index("esp_ota_mark_app_valid_cancel_rollback()")
    assert mismatch < mark_valid
    assert "TRACKER_OTA_ERROR_CONFIRM_PARTITION_MISMATCH" in OTA_CONTRACT
