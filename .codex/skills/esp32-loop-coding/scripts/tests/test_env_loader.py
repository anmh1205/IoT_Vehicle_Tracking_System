import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

import env_loader
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


def test_load_skill_env_prefers_repo_over_home(monkeypatch, tmp_path):
    home = tmp_path / "home"
    repo = tmp_path / "repo"
    monkeypatch.setattr(env_loader.Path, "home", lambda: home)

    home_skill_env = home / ".claude" / "skills" / "esp32-loop-coding" / ".env"
    repo_skill_env = repo / ".claude" / "skills" / "esp32-loop-coding" / ".env"
    home_skill_env.parent.mkdir(parents=True)
    repo_skill_env.parent.mkdir(parents=True)
    home_skill_env.write_text("ESP32_REMOTE_HOST=home-host\n", encoding="utf-8")
    repo_skill_env.write_text("ESP32_REMOTE_HOST=repo-host\n", encoding="utf-8")

    os.environ.pop("ESP32_REMOTE_HOST", None)
    loaded = load_skill_env("esp32-loop-coding", cwd=str(repo))

    assert loaded["ESP32_REMOTE_HOST"] == "repo-host"
    assert os.environ["ESP32_REMOTE_HOST"] == "repo-host"
