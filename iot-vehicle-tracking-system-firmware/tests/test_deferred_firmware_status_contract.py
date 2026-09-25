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
