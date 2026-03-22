#!/usr/bin/env sh
set -e

cmd=""
verbose=0

PURPLE='\033[0;35m'
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

print_help() {
  cat <<EOF
Usage: $0 [COMMAND] [--verbose|-v]

Commands:
  all, a            Run all checks (format check, clang, shellcheck)
  format, f         Format all files
  check-format, cf  Check formatting only (no changes)
  clang, c          Run 'idf clang-check' (clang-tidy)
  shellcheck, s     Run shellcheck
  iwyyu, i          Run include-what-you-use (IWYU)
  fonts, t          Run font generation script and check that up to date
  --verbose, -v     Enable verbose output
  --help, -h        Show this help message
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    all|a)           cmd="all" ;;
    format|f)        cmd="format" ;;
    check-format|cf) cmd="check-format" ;;
    clang|c)         cmd="clang" ;;
    shellcheck|s)    cmd="shellcheck" ;;
    iwyyu|i)         cmd="iwyyu" ;;
    fonts|t)         cmd="fonts" ;;
    --verbose|-v)    verbose=1 ;;
    --help|-h)       print_help; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; print_help; exit 1 ;;
  esac
  shift
done

# Default to 'all' if no command was given
[ -z "$cmd" ] && cmd="all"

run_clang_format() {
  args="--fix"
  [ "$verbose" -eq 1 ] && args="$args --verbose"
  # shellcheck disable=SC2086
  ./scripts/check-clang-format.sh $args
}

run_check_format() {
  args=""
  [ "$verbose" -eq 1 ] && args="--verbose"
  ./scripts/check-clang-format.sh $args
}

run_cppcheck() {
  args=""
  [ "$verbose" -eq 1 ] && args="--verbose"
  ./scripts/check-idf-clang.sh $args
}

run_shellcheck() {
  args=""
  [ "$verbose" -eq 1 ] && args="--verbose"
  ./scripts/check-shellcheck.sh $args
}

run_iwyu() {
  args=""
  [ "$verbose" -eq 1 ] && args="--verbose"
  ./scripts/check-iwyu.sh $args
}

run_fonts() {
  ./scripts/mkfonts.sh || {
    echo "${RED}Font generation failed!${NC}"
    return 1
  }
  if test -n "$(git status --porcelain ./main/fonts)"; then
    echo "${RED}main/fonts is dirty (modified, staged, or untracked files)${NC}"
    git status --short ./main/fonts
    exit 1
  else
    echo "${GREEN}main/fonts is clean${NC}"
  fi
}

run_all() {
  error_code=0

  echo "${PURPLE}Running clang-format (check only)...${NC}"
  if run_check_format; then
    echo "${GREEN}PASSED: clang-format${NC}"
  else
    echo "${RED}FAILED: clang-format${NC}"
    error_code=1
  fi

  echo "${PURPLE}Running idf clang-check...${NC}"
  if run_cppcheck; then
    echo "${GREEN}PASSED: clang-check${NC}"
  else
    echo "${RED}FAILED: clang-check${NC}"
    error_code=1
  fi

  echo "${PURPLE}Running shellcheck...${NC}"
  if run_shellcheck; then
    echo "${GREEN}PASSED: shellcheck${NC}"
  else
    echo "${RED}FAILED: shellcheck${NC}"
    error_code=1
  fi

  echo "${PURPLE}Running include-what-you-use (IWYU)...${NC}"
  if run_iwyu; then
    echo "${GREEN}PASSED: IWYU${NC}"
  else
    echo "${RED}FAILED: IWYU${NC}"
    error_code=1
  fi

  echo "${PURPLE}Running font generation script...${NC}"
  if run_fonts; then
    echo "${GREEN}PASSED: Font generation${NC}"
  else
    echo "${RED}FAILED: Font generation${NC}"
    error_code=1
  fi

  exit $error_code
}

case "$cmd" in
  all)
    run_all
    ;;
  format)
    run_clang_format
    ;;
  check-format)
    run_check_format
    ;;
  clang)
    run_cppcheck
    ;;
  shellcheck)
    run_shellcheck
    ;;
  iwyyu)
    run_iwyu
    ;;
  fonts)
    run_fonts
    ;;
esac
