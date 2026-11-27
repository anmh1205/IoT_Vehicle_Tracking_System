import subprocess

from host_build import FIRMWARE, build_fixture


def test_control_priority(tmp_path):
    components = FIRMWARE / "components"
    app = components / "app/src"
    executable = tmp_path / "outbox-calc-fixture"
    build_fixture(
        executable,
        [FIRMWARE / "tests/outbox_calc_fixture.c", app / "publish/outbox.c"],
        ["-I", app, "-I", FIRMWARE / "tests/stubs", "-ffunction-sections",
         *[flag for name in ("board", "modem") for flag in ("-I", components / name / "include")]],
        linker_flags=["-Wl,--gc-sections"],
    )
    subprocess.run([executable], check=True, timeout=5)
