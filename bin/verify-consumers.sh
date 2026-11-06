#!/usr/bin/env bash
#
# verify-consumers.sh — strict drift check across every sibling consumer.
#
# Usage:
#   verify-consumers.sh [consumer ...]
#
# With no arguments it checks each of the known consumers that exists
# beside this checkout.  A consumer that is not cloned is skipped, not
# failed: a fresh urui checkout on its own must still pass.  Any
# consumer that is present and has drifted fails the whole run, so the
# vendored copies cannot silently diverge again.
#
# Purity is checked once, first: consumer vocabulary in desk/ is drift
# of a different kind.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONSUMERS=("$@")
if [[ ${#CONSUMERS[@]} -eq 0 ]]; then
  CONSUMERS=(obelisk graph-viz heathcliff)
fi

"$ROOT/bin/check-purity.sh"

status=0
checked=0
for name in "${CONSUMERS[@]}"; do
  case "$name" in
    /*)  dest="$name" ;;
    *)   dest="$ROOT/../$name" ;;
  esac
  if [[ ! -d "$dest/desk" ]]; then
    echo "skip     $name (not cloned beside urui)"
    continue
  fi
  checked=$((checked + 1))
  if python3 "$ROOT/bin/sync.py" verify --strict --quiet --dest "$dest"; then
    echo "in sync  $name"
  else
    echo "DRIFT    $name" >&2
    status=1
  fi
done

echo "checked $checked consumer(s)"
exit "$status"
