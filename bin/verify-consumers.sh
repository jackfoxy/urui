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
# The build and suite checks compile each consumer, so a full run takes
# minutes; `--no-build` leaves only the drift check for an inner loop.
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
  CONSUMERS=(obelisk graph-viz heathcliff quiz)
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
  #  The conflict gate is cheap and needs no manifest: it reads the
  #  consumer's own chord table and its own exceptions file.  One
  #  consumer's web library pulls its client javascript in with `/*`,
  #  which `vere eval` cannot build, so it has no digest manifest --
  #  and the gate still applies to it.
  if [[ -f "$dest/tests/browser/shortcut-conflicts.test.js" ]]; then
    if ! (cd "$dest" && node --test \
        tests/browser/shortcut-conflicts.test.js >/dev/null 2>&1); then
      echo "CHORDS   $name (tests/browser/shortcut-conflicts.test.js)" >&2
      status=1
    fi
  fi
  spec="$ROOT/bin/assets-$name.txt"
  if [[ "$BUILD" == "yes" && -f "$spec" ]]; then
    if "$ROOT/bin/asset-digest.sh" --consumer "$dest" --spec "$spec" \
        >/dev/null 2>&1; then
      echo "builds   $name"
    else
      echo "BUILD    $name (asset-digest.sh --spec $(basename "$spec"))" >&2
      status=1
    fi
    #  Every suite the consumer's desk carries, not only the synced
    #  ones.  The synced ones need running here because `/+ *test`
    #  exposes the consumer's lib/test.hoon and whatever its context
    #  imports, which can shadow a lull name for a file urui wrote.
    #  The consumer's own need running because a change in urui can
    #  break what they assert -- a relocated control did, and went
    #  unnoticed for two phases while only `urui-*` was checked.
    #
    #  hoon-test.js refuses a suite that needs a ship (`/*` or `/=`);
    #  that is a skip, not a failure.
    #  Scoped to the suites a urui change can break: the synced ones,
    #  and the consumer's own web suite, which asserts the shared
    #  markup.  Its domain suites -- layout, parsing, ranking -- do not
    #  depend on urui and cost minutes; they belong to its own command.
    for suite in "$dest"/desk/tests/lib/urui-*.hoon \
                 "$dest"/desk/tests/lib/*-web.hoon; do
      [[ -f "$suite" ]] || continue
      relative="desk/tests/lib/$(basename "$suite")"
      #  `if` so a non-zero exit is data, not an abort under `set -e`
      if output="$(node "$ROOT/bin/hoon-test.js" "$dest" "$relative" 2>&1)"
      then
        code=0
      else
        code=$?
      fi
      case "$code" in
        0)  ;;
        2)  ;;  # needs a ship
        *)  echo "SUITE    $name ($relative)" >&2
            printf '%s\n' "$output" | tail -3 >&2
            status=1 ;;
      esac
    done
  fi
  if [[ "$BUILD" == "yes" && ! -f "$spec" ]]; then
    for suite in "$dest"/desk/tests/lib/urui-*.hoon; do
      [[ -f "$suite" ]] || continue
      relative="desk/tests/lib/$(basename "$suite")"
      if output="$(node "$ROOT/bin/hoon-test.js" "$dest" "$relative" 2>&1)"
      then
        code=0
      else
        code=$?
      fi
      case "$code" in
        0|2)  ;;
        *)  echo "SUITE    $name ($relative)" >&2
            printf '%s\n' "$output" | tail -3 >&2
            status=1 ;;
      esac
    done
  fi
done

echo "checked $checked consumer(s)"
exit "$status"
