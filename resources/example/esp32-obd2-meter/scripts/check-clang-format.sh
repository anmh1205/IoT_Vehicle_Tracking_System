#!/usr/bin/env sh
set -e

verbose=0
fix=0

while [ $# -gt 0 ]; do
  case "$1" in
    -v|--verbose)
      verbose=1
      ;;
    --fix)
      fix=1
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
  shift
done

if ! command -v clang-format >/dev/null 2>&1; then
  echo "Error: clang-format is not installed." >&2
  exit 1
fi

# shellcheck disable=SC1091
. "$(dirname "$0")/project-check-files.sh"
files=$(project_c_files)

if [ "$verbose" -eq 1 ]; then
  clang_format_path=$(command -v clang-format)
  clang_format_version=$("$clang_format_path" --version)
  echo "clang-format: $clang_format_path ($clang_format_version)"
  echo "cmd: clang-format --dry-run --Werror <file>"
  if [ "$fix" -eq 1 ]; then
    echo "cmd: clang-format -i <file>"
  fi
  echo "files:"
  for f in $files; do
    echo "  $f"
  done
fi

if [ "$fix" -eq 0 ]; then
  # Dry-run: print output, collect exit code
  fail=0
  for file in $files; do
    if ! clang-format --dry-run --Werror "$file"; then
      fail=1
    fi
  done
  exit $fail
else
  # --fix: suppress dry-run output, collect files needing formatting
  needs_formatting=""
  for file in $files; do
    if ! clang-format --dry-run --Werror "$file" >/dev/null 2>&1; then
      needs_formatting="$needs_formatting $file"
    fi
  done

  if [ -z "$needs_formatting" ]; then
    exit 0
  fi

  for f in $needs_formatting; do
    clang-format -i "$f"
    echo "formatted $f"
  done
  exit 0
fi
