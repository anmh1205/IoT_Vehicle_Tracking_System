import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from env_loader import load_skill_env


@pytest.fixture(autouse=True)
def restore_esp32_baud_env():
    previous = os.environ.get("ESP32_BAUD")
    yield
    if previous is None:
        os.environ.pop("ESP32_BAUD", None)
    else:
        os.environ["ESP32_BAUD"] = previous


def test_load_skill_env_keeps_process_env_priority(tmp_path):
    os.environ["ESP32_BAUD"] = "921600"
    loaded = load_skill_env("esp32-loop-coding", cwd=str(tmp_path))
    assert isinstance(loaded, dict)
    assert os.environ["ESP32_BAUD"] == "921600"
