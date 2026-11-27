import subprocess

from host_build import CORE, FIRMWARE, build_fixture


def test_board_calculations(tmp_path):
    board = FIRMWARE / "components/board/src"
    executable = tmp_path / "board-calc-fixture"
    build_fixture(
        executable,
        [
            FIRMWARE / "tests/board_calc_fixture.c",
            board / "board_calc.c",
            CORE / "src/base/civil.c",
        ],
        ["-I", board],
        linker_flags=["-lm"],
    )
    subprocess.run([executable], check=True, timeout=5)
