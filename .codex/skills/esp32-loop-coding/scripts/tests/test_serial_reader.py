import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
import serial

import serial_reader


def test_has_any_matches_pattern():
    assert serial_reader._has_any("Guru Meditation Error", ["panic", "Guru Meditation Error"])


def test_has_any_returns_false_without_match():
    assert not serial_reader._has_any("I (100) normal line", ["panic", "assert failed"])


def test_read_serial_returns_serial_error(monkeypatch, tmp_path):
    def raise_serial_exception(*args, **kwargs):
        raise serial.SerialException("port unavailable")

    monkeypatch.setattr(serial_reader.serial, "Serial", raise_serial_exception)

    result = serial_reader.read_serial(
        port="COM999",
        baud=115200,
        log_file=str(tmp_path / "monitor.log"),
        max_seconds=1,
        stable_seconds=1,
        quiet_seconds=1,
    )

    assert result.status == "serial-error"
    assert "unavailable" in result.error_message
