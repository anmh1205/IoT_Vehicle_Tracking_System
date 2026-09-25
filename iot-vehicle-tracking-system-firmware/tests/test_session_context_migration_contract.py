from pathlib import Path

HEADER = (
    Path(__file__).resolve().parents[1]
    / "components"
    / "adapter-kv-nvs"
    / "include"
    / "nvs_config.h"
).read_text(encoding="utf-8")
SOURCE = (
    Path(__file__).resolve().parents[1]
    / "components"
    / "adapter-kv-nvs"
    / "src"
    / "nvs_config.c"
).read_text(encoding="utf-8")


def test_session_context_persists_start_boundary_delivery_state():
    assert "bool start_boundary_pending;" in HEADER


def test_loader_migrates_previous_session_blob_without_dropping_active_session():
    assert "session_persist_context_v1_t" in SOURCE
    assert "stored_size == sizeof(session_persist_context_v1_t)" in SOURCE
    assert "out_context->start_boundary_pending = false;" in SOURCE
    assert "Migrated session context v1" in SOURCE
