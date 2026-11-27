import re
import unittest

from host_build import FIRMWARE


COMPONENTS = FIRMWARE / "components"
# Match string and character literals first so a URL or an escaped quote cannot
# hide a real include on an adjacent line.
LEXICAL = re.compile(r"""("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(/\*[\s\S]*?\*/|//[^\n]*)""")
INCLUDE = re.compile(r'^\s*#\s*include\s*["<]([^">]+)[">]', re.M)
SDK_HEADER = re.compile(r"^(?:esp_|freertos/|driver/|hal/|soc/|sdkconfig\.h$)")


def sources(root):
    for path in sorted(root.rglob("*")):
        if path.suffix in {".h", ".c"}:
            yield path, LEXICAL.sub(lambda token: token[1] or "\n" * token[0].count("\n") or " ",
                                    path.read_text(encoding="utf-8"))


def production_sources():
    for root in (COMPONENTS, FIRMWARE / "main"):
        yield from sources(root)


class Layers(unittest.TestCase):
    def assert_include_boundaries(self, matches, allowed):
        violations = [
            f"{path.relative_to(FIRMWARE)}: {header}"
            for path, source in production_sources()
            for header in INCLUDE.findall(source)
            if matches(header) and not allowed(path.relative_to(FIRMWARE))
        ]
        self.assertEqual(violations, [])

    def assert_symbols_local(self, symbols, *allowed):
        violations = [
            path.relative_to(COMPONENTS).as_posix()
            for path, source in sources(COMPONENTS)
            if symbols.search(source) and not any(path.is_relative_to(folder) for folder in allowed)
        ]
        self.assertEqual(violations, [])

    def test_core_does_not_include_sdk(self):
        violations = [
            f"{path.relative_to(COMPONENTS)}: {header}"
            for path, source in sources(COMPONENTS / "ivts-core")
            for header in INCLUDE.findall(source)
            if SDK_HEADER.match(header)
        ]
        self.assertEqual(violations, [])

    def test_public_interfaces_do_not_expose_sdk_types(self):
        violations = []
        for folder in sorted(COMPONENTS.iterdir()):
            if folder.name == "platform":
                continue
            for path, source in sources(folder / "include"):
                violations.extend(
                    f"{path.relative_to(COMPONENTS)}: {header}"
                    for header in INCLUDE.findall(source)
                    if SDK_HEADER.match(header)
                )
                if re.search(r"\b(?:esp_err_t|QueueHandle_t|SemaphoreHandle_t)\b", source):
                    violations.append(f"{path.relative_to(COMPONENTS)}: ESP-IDF type")
        self.assertEqual(violations, [])

    def test_sleep_sdk_calls_stay_in_board(self):
        self.assert_symbols_local(re.compile(r"\besp_(?:sleep_\w+|light_sleep_start|deep_sleep_start)\b"),
                                  COMPONENTS / "board")

    def test_clock_and_restart_sdk_calls_stay_in_platform(self):
        self.assert_symbols_local(re.compile(r"\b(?:esp_timer_get_time|esp_restart)\b"),
                                  COMPONENTS / "platform")

    def test_freertos_headers_stay_in_tasks_and_platform(self):
        task_sources = {
            "components/app/src/runtime/app_task.c",
            "components/board/src/board_task.c",
            "components/modem/src/modem_task.c",
            "components/obd/src/obd_task.c",
            "components/ota/src/ota_task.c",
            "components/storage/src/storage_task.c",
        }
        self.assert_include_boundaries(
            lambda header: header.startswith("freertos/"),
            lambda path: path.as_posix() in task_sources
            or path.is_relative_to("components/platform/src"),
        )

    def test_driver_headers_stay_with_their_device_adapters(self):
        adapter_roots = (
            "components/board/src",
            "components/modem/src/transport",
            "components/storage/src/sd",
        )
        self.assert_include_boundaries(
            lambda header: header.startswith(("driver/", "esp_driver_")),
            lambda path: any(path.is_relative_to(root) for root in adapter_roots),
        )

    def test_board_pins_stay_in_board_and_app_wiring(self):
        wiring = COMPONENTS / "app/src/boot/app_wiring.c"
        symbols = re.compile(r"\bBOARD_PIN_\w+\b")
        violations = [
            path.relative_to(FIRMWARE)
            for path, source in production_sources()
            if symbols.search(source) and path != wiring and not path.is_relative_to(COMPONENTS / "board")
        ]
        self.assertEqual(violations, [])
        self.assert_include_boundaries(
            lambda header: header == "board/board_hw.h",
            lambda path: path == wiring.relative_to(FIRMWARE)
            or path.is_relative_to("components/board/src"),
        )

    def test_private_includes_are_relative_to_the_component_source_root(self):
        violations = []
        for component in COMPONENTS.iterdir():
            root = component / "src"
            for path, source in sources(root):
                for header in INCLUDE.findall(source):
                    target = (path.parent / header).resolve()
                    if target.is_file() and target.is_relative_to(root):
                        if header != target.relative_to(root).as_posix():
                            violations.append(f"{path.relative_to(FIRMWARE)}: {header}")
        self.assertEqual(violations, [])

    def test_app_module_dependencies(self):
        root = COMPONENTS / "app/src"
        levels = {
            "boot": 0, "runtime": 0,
            "fw_update": 1, "command": 1, "publish": 1, "session": 1,
            "alarm": 1, "telemetry": 1, "power": 1,
            "device": 2, "persist": 2,
        }
        flat_modules = {
            "fw_update": "fw_update",
            "session_tracker": "session",
            "motion_alarm": "alarm",
            "telemetry": "telemetry",
            "power": "power",
            "sleep_controller": "power",
            "led_pattern": "power",
        }

        def module(relative):
            if len(relative.parts) == 1:
                return flat_modules.get(relative.stem)
            return relative.parts[0]

        paths = dict(sources(root))
        headers = {path.relative_to(root).as_posix(): path for path in paths if path.suffix == ".h"}
        dependencies = {folder: set() for folder in levels}
        violations = []
        for path, source in paths.items():
            relative = path.relative_to(root)
            if re.search(r"\bg_app\b", source) or path.name == "app_priv.h":
                violations.append(f"{relative}: shared app state")
            origin = module(relative)
            if origin not in levels:
                continue
            for header in INCLUDE.findall(source):
                target = headers.get(header, (path.parent / header).resolve())
                if target not in paths:
                    continue
                destination = module(target.relative_to(root))
                if destination not in levels or destination == origin:
                    continue
                dependencies[origin].add(destination)
                if levels[destination] < levels[origin]:
                    violations.append(f"{relative}: includes {target.relative_to(root)}")

        def reachable(folder, seen):
            for dependency in dependencies[folder] - seen:
                yield dependency
                yield from reachable(dependency, seen | {dependency})

        for folder in dependencies:
            if folder in reachable(folder, set()):
                violations.append(f"{folder}: circular module dependency")
        self.assertEqual(violations, [])

    def test_all_components_do_not_export_mutable_variables(self):
        variables = re.compile(r"^\s*extern\s+(?!const\b)[^;\n()]+;", re.M)
        self.assert_symbols_local(variables)
