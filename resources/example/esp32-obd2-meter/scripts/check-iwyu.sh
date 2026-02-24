#!/usr/bin/env bash

# ─── Argument Parsing ─────────────────────────────────────────────────────────────────────────────────────────────────
FILES=()
VERBOSE=false
IWYU_OUTPUT_FORMAT="clang"

usage() {
  echo "Usage: $(basename "$0") [OPTIONS] [FILES...]"
  echo
  echo "Options:"
  echo "  -o, --output-format FORMAT   Output format: 'clang' (default) or 'iwyu'"
  echo "  -v, --verbose                Enable verbose output"
  echo "  -h, --help                   Show this help message"
  echo
  echo "Arguments:"
  echo "  FILES...                     Source files to check (if omitted, all project *.c files are used)"
  exit 0
}

error() {
  echo -e "\e[31mError: $*\e[0m" >&2
  exit 1
}

info() {
  echo -e "\e[36m$*\e[0m"
}

success() {
  echo -e "\e[32m$*\e[0m"
}

verbose() {
  $VERBOSE && echo -e "\e[90m$*\e[0m"
}

ARGS=("$@")
i=0
while [[ $i -lt ${#ARGS[@]} ]]; do
  arg="${ARGS[$i]}"
  case "$arg" in
    -o|--output-format)
      ((i++))
      [[ "${ARGS[$i]}" == "clang" || "${ARGS[$i]}" == "iwyu" ]] || \
        error "Invalid output format: '${ARGS[$i]}' (choose 'clang' or 'iwyu')"
      IWYU_OUTPUT_FORMAT="${ARGS[$i]}"
      ;;
    -v|--verbose)
      VERBOSE=true
      ;;
    -h|--help)
      usage
      ;;
    --)
      # All following are files
      ((i++))
      while [[ $i -lt ${#ARGS[@]} ]]; do
        FILES+=("${ARGS[$i]}")
        ((i++))
      done
      break
      ;;
    -*)
      error "Unknown option: $arg"
      ;;
    *)
      FILES+=("$arg")
      ;;
  esac
  ((i++))
done

# ─── Check environment ────────────────────────────────────────────────────────────────────────────────────────────────
[[ -n "${IDF_PATH:-}" ]] || error "IDF_PATH is not set"
[[ -n "${ESP_COMPILER_PATH:-}" ]] || error "ESP_COMPILER_PATH is not set"
command -v idf.py >/dev/null || error "idf.py not found in PATH"
command -v iwyu_tool.py >/dev/null || error "iwyu_tool.py not found in PATH"

# ─── Includes and Defines ─────────────────────────────────────────────────────────────────────────────────────────────
BUILD_DIR=.build-iwyu
CCDB="$BUILD_DIR/compile_commands.json"
CCDB_BAK="$BUILD_DIR/compile_commands.iwyu.bak.json"

ESP_SYSROOT="$(dirname "$(dirname "$ESP_COMPILER_PATH")")"
INCLUDES=(
  "-I$IDF_PATH/components/newlib/platform_include"
  "-isystem$ESP_SYSROOT/xtensa-esp-elf/include"
)
DEFINES=(
  -D__XTENSA__
)
CLANG_EXTRA_ARGS=(
  --sysroot="$ESP_SYSROOT"
  --gcc-toolchain="$ESP_SYSROOT"
  -Wno-everything
)
VERBOSE_ARG=()
if $VERBOSE; then
  VERBOSE_ARG+=(--verbose)
fi

if [[ "$IWYU_OUTPUT_FORMAT" == "clang" ]]; then
  GREP_PATTERN='error: (add|superfluous) '
elif [[ "$IWYU_OUTPUT_FORMAT" == "iwyu" ]]; then
  GREP_PATTERN='should (add|remove) these lines:'
fi

# ─── Load Source Files ────────────────────────────────────────────────────────────────────────────────────────────────
if [[ ${#FILES[@]} -eq 0 ]]; then
  # shellcheck disable=SC1091
  . "$(dirname "$0")/project-check-files.sh"
  mapfile -t FILES < <(project_source_files)
fi

# ─── Verbose Summary ──────────────────────────────────────────────────────────────────────────────────────────────────
verbose "BUILD_DIR:"
verbose "  $BUILD_DIR"
verbose "SYSROOT:"
verbose "  $ESP_SYSROOT"
verbose "CLANG_ARGS:"
for arg in "${CLANG_EXTRA_ARGS[@]}"; do
  verbose "  $arg"
done
verbose "DEFINES:"
for def in "${DEFINES[@]}"; do
  verbose "  $def"
done
verbose "INCLUDES:"
for inc in "${INCLUDES[@]}"; do
  verbose "  $inc"
done
verbose "FILES:"
for file in "${FILES[@]}"; do
  verbose "  $file"
done

# ─── Backup & tmpfile ─────────────────────────────────────────────────────────────────────────────────────────────────
cp ./sdkconfig ./sdkconfig.bak
verbose "Backup of sdkconfig created at sdkconfig.bak"
iwyu_results_tmpfile=$(mktemp)

# ─── Build IDF project with CLANG ─────────────────────────────────────────────────────────────────────────────────────
info "Configuring IDF project with CLANG ($BUILD_DIR) ..."
idf_output="/dev/null"
idf_err="/dev/null"
$VERBOSE && idf_output="/dev/stdout" && idf_err="/dev/stderr"
IDF_TOOLCHAIN=clang idf.py \
  --build-dir "$BUILD_DIR" \
  "${VERBOSE_ARG[@]}" \
  reconfigure > "$idf_output" 2> "$idf_err"

# ─── Post-build: backup and strip problematic flags ───────────────────────────────────────────────────────────────────
verbose "Backing up compile_commands.json to $CCDB_BAK"
cp "$CCDB" "$CCDB_BAK"
verbose "Stripping problematic flags from compile_commands.json"
jq 'map(
  if has("command") then
    .command |= (
      split(" ")
      | map(select((startswith("--target=")) | not))
      | join(" ")
    )
  else .
  end
)' "$CCDB_BAK" > "$CCDB"

# ─── Teardown ─────────────────────────────────────────────────────────────────────────────────────────────────────────
# shellcheck disable=SC2317
cleanup() {
  mv -f ./sdkconfig.bak ./sdkconfig
  verbose "Restored sdkconfig from sdkconfig.bak"
  [[ -f "$CCDB_BAK" ]] && mv "$CCDB_BAK" "$CCDB" && verbose "Restored compile_commands.json from backup"
  rm -f "$iwyu_results_tmpfile"
}
trap cleanup EXIT

# ─── Run IWYU ─────────────────────────────────────────────────────────────────────────────────────────────────────────
info "Running include-what-you-use (IWYU) ($BUILD_DIR) ..."
iwyu_tool.py -p "$BUILD_DIR" "${FILES[@]}" \
  --output-format "$IWYU_OUTPUT_FORMAT" \
  -- \
  "${VERBOSE_ARG[@]}" \
  "${CLANG_EXTRA_ARGS[@]}" \
  "${INCLUDES[@]}" \
  "${DEFINES[@]}" \
  | tee >(grep -E "$GREP_PATTERN" > "$iwyu_results_tmpfile")

# ─── Check Results and Exit ───────────────────────────────────────────────────────────────────────────────────────────

iwyu_status=${PIPESTATUS[0]}

if [[ $iwyu_status -ne 0 ]]; then
  error "iwyu_tool.py failed with exit code $iwyu_status"
fi

issue_count=$(wc -l < "$iwyu_results_tmpfile")

if (( issue_count > 0 )); then
  error "IWYU found $issue_count include issue(s) in ${#FILES[@]} source file(s)."
fi

success "IWYU check passed: no include issues found in ${#FILES[@]} source file(s)."
exit 0
