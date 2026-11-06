#!/usr/bin/env bash
#
# verify-consumers.sh — strict drift check across every sibling consumer.
#
# Usage:
#   verify-consumers.sh [--no-build] [consumer ...]
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
BUILD=yes
CONSUMERS=()
for argument in "$@"; do
  case "$argument" in
    --no-build)  BUILD=no ;;
    *)           CONSUMERS+=("$argument") ;;
  esac
done
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
  #  In sync is not the same as building.  A synced mold change can
  #  leave a consumer's own web lib or its spec behind, and that only
  #  shows up when the consumer's whole web layer is compiled -- which
  #  the asset digest does, binding sur, every urui lib, and the
  #  consumer's own.  Compiling a synced test file instead would miss
  #  it, because those files do not import the consumer.
  #
  #  Needs a per-consumer manifest; skipped where there is none, and by
  #  --no-build.
  spec="$ROOT/bin/assets-$name.txt"
  if [[ "$BUILD" == "yes" && -f "$spec" ]]; then
    if "$ROOT/bin/asset-digest.sh" --consumer "$dest" --spec "$spec" \
        >/dev/null 2>&1; then
      echo "builds   $name"
    else
      echo "BUILD    $name (asset-digest.sh --spec $(basename "$spec"))" >&2
      status=1
    fi
  fi
done

echo "checked $checked consumer(s)"
exit "$status"
