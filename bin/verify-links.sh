#!/usr/bin/env bash
#
# verify-links.sh — check a consumer's urui links.
#
# Run from the consumer checkout, or pass it with --consumer.  Reports one
# line per link and exits non-zero on anything but `ok`, so it can be the
# first line of a consumer's check.sh and test runners: a broken link then
# fails in a second with a sentence, instead of as a Hoon build error three
# hundred lines later.
#
# Usage:
#   verify-links.sh [--consumer DIR] [--strict] [--quiet]
#
#   --strict   also fail when a linked path has been replaced by a regular
#              file (the "I edited the shared file, and it stopped being
#              shared" failure)
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONSUMER="$PWD"
STRICT=0
QUIET=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --consumer)  CONSUMER="$(cd "$2" && pwd)"; shift 2 ;;
    --strict)    STRICT=1; shift ;;
    --quiet)     QUIET=1; shift ;;
    -h|--help)   sed -n '2,17p' "$0"; exit 0 ;;
    *)           echo "verify-links.sh: unknown argument $1" >&2; exit 2 ;;
  esac
done

URUI_CHECKOUT="$(cd "$CONSUMER/.." && pwd)/urui"
if [[ ! -d "$URUI_CHECKOUT" ]]; then
  echo "urui checkout not found at ../urui — clone it beside this repo" >&2
  exit 4
fi

status=0
while read -r link target; do
  [[ -z "${link:-}" || "${link:0:1}" == "#" ]] && continue
  path="$CONSUMER/$link"
  if [[ -L "$path" ]]; then
    actual="$(readlink "$path")"
    if [[ "$actual" != "$target" ]]; then
      echo "wrong-target  $link -> $actual (want $target)"
      status=1
    elif [[ ! -e "$path" ]]; then
      echo "dangling      $link -> $target"
      status=1
    else
      [[ "$QUIET" -eq 1 ]] || echo "ok            $link"
    fi
  elif [[ -e "$path" ]]; then
    echo "not-a-symlink $link"
    #  --strict makes this fatal: the file is no longer shared with urui,
    #  so edits to it are silently invisible to every other consumer.
    if [[ "$STRICT" -eq 1 ]]; then status=1; fi
  else
    echo "missing       $link"
    status=1
  fi
done < "$ROOT/bin/links.txt"

if [[ "$status" -ne 0 ]]; then
  echo "verify-links.sh: run urui/bin/link.sh --consumer $CONSUMER to repair" >&2
fi
exit "$status"
