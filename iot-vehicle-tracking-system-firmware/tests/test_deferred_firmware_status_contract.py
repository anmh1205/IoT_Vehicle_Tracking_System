from pathlib import Path


SOURCE = (
    Path(__file__).resolve().parents[1]
    / "components"
    / "app-core"
    / "src"
    / "state_publish_pipeline.c"
).read_text(encoding="utf-8")


def test_firmware_publish_retains_failed_report():
    assert "bool state_machine_publish_firmware_payload" in SOURCE
    assert "if (!accepted)" in SOURCE
    assert "state_machine_defer_firmware_report(firmware);" in SOURCE


def test_deferred_report_clears_only_after_accepted_publish():
    expected = """if (state_machine_publish_firmware_payload(&s_deferred_firmware_report)) {
        s_deferred_firmware_report_pending = false;
    }"""
    assert expected in SOURCE
    assert (
        "state_machine_publish_firmware_payload(&s_deferred_firmware_report);\n"
        "    s_deferred_firmware_report_pending = false;"
    ) not in SOURCE


def test_offline_firmware_status_still_uses_durable_pipeline():
    publish_or_stage = SOURCE.split(
        "void state_machine_publish_or_stage_firmware_status", 1
    )[1].split("void state_machine_try_flush_deferred_firmware_report", 1)[0]
    assert "state_machine_publish_firmware_status(" in publish_or_stage
    assert "tracker_mqtt_is_connected()" not in publish_or_stage
    assert "state_machine_stage_firmware_status_for_online_publish" not in SOURCE
    assert "OFFLINE_RECORD_FIRMWARE" in SOURCE


def test_successful_newer_status_supersedes_pending_same_job():
    assert "state_machine_firmware_report_same_lineage" in SOURCE
    assert (
        "s_deferred_firmware_report_pending &&\n"
        "        state_machine_firmware_report_same_lineage("
        "firmware, &s_deferred_firmware_report)"
    ) in SOURCE
    supersede_block = SOURCE.split("event=firmware_status_deferred_superseded", 1)[1]
    assert "s_deferred_firmware_report_pending = false;" in supersede_block
    helper = SOURCE.split("static bool state_machine_firmware_report_same_lineage", 1)[1]
    helper = helper.split("static void state_machine_fill_firmware_status", 1)[0]
    assert "strcmp(left->job_id, right->job_id) == 0" in helper
    assert "strcmp(left->target_version, right->target_version) == 0" in helper
