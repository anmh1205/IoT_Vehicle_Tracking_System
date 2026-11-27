"""An interrupted cursor update preserves a valid queue checkpoint on disk.
Recovery resumes after the last durably acknowledged record, and checkpoint I/O
errors surface so failed operations can be retried safely.
"""

import subprocess

import pytest

from host_build import CORE, FIRMWARE, PLATFORM, build_fixture


@pytest.fixture(scope="module")
def executable(tmp_path_factory):
    tests = FIRMWARE / "tests"
    storage = FIRMWARE / "components/storage"
    executable = tmp_path_factory.mktemp("queue-checkpoint") / "queue-checkpoint-fixture"
    build_fixture(
        executable,
        [tests / "queue_checkpoint_fixture.c", storage / "src/storage_task.c",
         *sorted((storage / "src/queue").glob("*.c")),
         CORE / "src/base/crc32.c", PLATFORM / "src/platform.c"],
        ["-D_POSIX_C_SOURCE=200809L", '-DSD_MOUNT="sd"', "-DBaseType_t=int",
         "-I", tests / "stubs/queue_checkpoint", "-I", tests / "stubs",
         "-I", PLATFORM / "include", "-I", storage / "include", "-I", storage / "src",
         "-ffunction-sections", "-Wl,--gc-sections,--wrap=fopen,--wrap=fwrite,"
         "--wrap=fflush,--wrap=fsync,--wrap=fclose"],
    )
    return executable


def run_case(executable, tmp_path, case):
    subprocess.run([executable, case], cwd=tmp_path, check=True, timeout=5)


@pytest.mark.parametrize("stage", ["open", "torn_write", "buffered_write", "flush", "sync", "close"])
def test_checkpoint_survives_power_cut(executable, tmp_path, stage):
    run_case(executable, tmp_path, stage)


def test_legacy_checkpoint_survives_interrupted_upgrade(executable, tmp_path):
    run_case(executable, tmp_path, "legacy")


def test_corrupt_checkpoint_recovers_from_queue_head(executable, tmp_path):
    run_case(executable, tmp_path, "corrupt")


def test_failed_checkpoint_can_be_retried(executable, tmp_path):
    run_case(executable, tmp_path, "retry")


def test_close_error_preserves_synced_checkpoint(executable, tmp_path):
    run_case(executable, tmp_path, "close_error")


def test_checkpoint_io_error_blocks_recovery(executable, tmp_path):
    run_case(executable, tmp_path, "read_error")


def test_degraded_storage_rejects_pop_without_locking(executable, tmp_path):
    run_case(executable, tmp_path, "degraded")
