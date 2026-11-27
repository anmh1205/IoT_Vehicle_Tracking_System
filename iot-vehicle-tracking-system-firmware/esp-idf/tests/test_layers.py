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
            "fw": 1, "command": 1, "publish": 1, "session": 1, "power": 1,
            "device": 2, "persist": 2,
        }

        def module(relative):
            return relative.parts[0] if len(relative.parts) > 1 else None

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


LOG_CALL = re.compile(r'\bIVTS_LOG[EWID]\(\s*([A-Za-z_"][^,]*?)\s*,\s*((?:"(?:\\.|[^"\\])*"\s*)+)')
RETURN_ON_CALL = re.compile(r'\bESP_RETURN_ON_\w+\((?:[^;"]*?),\s*((?:"(?:\\.|[^"\\])*"\s*)+)')
LOG_TAGS = {"board", "modem", "at", "storage", "obd", "ota", "app", "sys"}
LOG_TAG_MACROS = {"BOARD_TAG": "board", "MODEM_TAG": "modem", "AT_TAG": "at", "STORAGE_TAG": "storage",
                  "OBD_TAG": "obd", "OTA_TAG": "ota", "APP_TAG": "app"}
# First word: a lower-case subject, an AT/ELM traffic arrow, or a preformatted status line.
LOG_SUBJECT = re.compile(r'^(?:[a-z][a-z0-9_]*(?: |$)|[<>] |%s$)')


def raw_sources():
    for root in (COMPONENTS, FIRMWARE / "main"):
        for path in sorted(root.rglob("*")):
            if path.suffix in {".h", ".c"}:
                yield path, path.read_text(encoding="utf-8")


def literal(chunks):
    return "".join(re.findall(r'"((?:\\.|[^"\\])*)"', chunks))


class LogFormat(unittest.TestCase):
    """Console UART lines follow components/platform/include/platform/log.h."""

    def test_sdk_log_macros_stay_behind_the_standard_header(self):
        header = COMPONENTS / "platform/include/platform/log.h"
        violations = [
            path.relative_to(FIRMWARE).as_posix()
            for path, source in production_sources()
            if path != header and (re.search(r"\bESP_LOG[EWIDV]\s*\(", source) or "esp_log.h" in INCLUDE.findall(source))
        ]
        self.assertEqual(violations, [])

    def test_log_lines_use_known_tags_and_a_lower_case_subject(self):
        violations, count = [], 0
        for path, source in raw_sources():
            for tag, chunks in LOG_CALL.findall(source):
                count += 1
                text = literal(chunks)
                where = f"{path.relative_to(FIRMWARE)}: {text[:50]!r}"
                name = LOG_TAG_MACROS.get(tag, tag.strip('"'))
                if name not in LOG_TAGS:
                    violations.append(f"{where}: tag {tag}")
                if not LOG_SUBJECT.match(text):
                    violations.append(f"{where}: subject")
                if not text.isascii() or any(not (c.isprintable()) for c in text):
                    violations.append(f"{where}: non-ASCII")
        self.assertGreater(count, 50)
        self.assertEqual(violations, [])

    def test_sdk_error_messages_are_ascii(self):
        violations = [
            f"{path.relative_to(FIRMWARE)}: {literal(chunks)[:50]!r}"
            for path, source in raw_sources()
            for chunks in RETURN_ON_CALL.findall(source)
            if not literal(chunks).isascii()
        ]
        self.assertEqual(violations, [])

    def test_tag_macros_match_the_documented_tag_list(self):
        header = (COMPONENTS / "platform/include/platform/log.h").read_text(encoding="utf-8")
        listed = set(re.findall(r'"([a-z]+)"', re.search(r"IVTS_LOG_TAGS\s*\{([^}]*)\}", header)[1]))
        self.assertEqual(listed, LOG_TAGS)
        defined = {
            name: value
            for _, source in raw_sources()
            for name, value in re.findall(r'#define\s+(\w+_TAG)\s+"([^"]+)"', source)
        }
        self.assertEqual(defined, LOG_TAG_MACROS)
