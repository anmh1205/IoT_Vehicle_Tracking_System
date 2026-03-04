#!/usr/bin/env sh
set -e

verbose=0
if [ "$1" = "-v" ] || [ "$1" = "--verbose" ]; then
  verbose=1
fi

if ! command -v shellcheck >/dev/null 2>&1; then
  echo "Error: shellcheck is not installed." >&2
  exit 1
fi

# shellcheck disable=SC1091
. "$(dirname "$0")/project-check-files.sh"
files=$(project_script_files)

if [ "$verbose" -eq 1 ]; then
  shellcheck_path=$(command -v shellcheck)
  shellcheck_version=$("$shellcheck_path" --version | awk 'NR==2')
  echo "shellecheck: $shellcheck_path ($shellcheck_version)"
  echo "cmd: shellcheck -o=all <files>"
  echo "files:"
  for f in $files; do
    echo "  $f"
  done
fi

# shellcheck disable=SC2086
shellcheck -o=all $files
