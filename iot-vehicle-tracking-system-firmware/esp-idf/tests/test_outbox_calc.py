import subprocess

from host_build import FIRMWARE, build_fixture


def test_control_priority(tmp_path):
    components = FIRMWARE / "components"
    app = components / "app/src"
    executable = tmp_path / "outbox-calc-fixture"
    build_fixture(
        executable,
        [FIRMWARE / "tests/outbox_calc_fixture.c", app / "publish/outbox_calc.c"],
        ["-I", app, "-I", components / "modem/include"],
    )
    subprocess.run([executable], check=True, timeout=5)
