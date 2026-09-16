#!/usr/bin/env bash
#
# stage-desk.sh — materialize a self-contained desk directory.
#
# Assemble urui's disposable fixture from its sources and standard desk
# dependencies. Consumer desks use ordinary synced files and can be copied
# directly. The output of this assembler contains only regular files.
#
# Usage:
#   bin/stage-desk.sh [options] <out-dir>
#
#   --src DIR       desk sources to stage         (default: <repo>/desk)
#   --fixture       also stage tests/fixture/**   (test/agent desk)
#   --base DIR      desk to copy %base standard libs and marks from
#                   (default: ~/gitrepos/graph-viz/desk)
#   --no-base       do not copy %base files
#   --no-kelvin     do not copy sys.kelvin — use when staging *into* a desk
#                   made by |new-desk, which already has the ship's own
#
# The fixture's %base dependency is explicit: a staged desk that needs
# /lib/server.hoon says where it came from.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/desk"
BASE="${URUI_BASE_DESK:-$HOME/gitrepos/graph-viz/desk}"
FIXTURE=0
USE_BASE=1
USE_KELVIN=1
OUT=""

#  the source desk needs one file from %base: the test framework.  The
#  agent's dependencies come along only when a fixture is staged with it.
BASE_LIBS="test.hoon"
FIXTURE_LIBS="server.hoon skeleton.hoon default-agent.hoon dbug.hoon"
FIXTURE_LIBS="$FIXTURE_LIBS docket.hoon"
BASE_MARS="bill.hoon docket-0.hoon hoon.hoon js.hoon json.hoon kelvin.hoon"
BASE_MARS="$BASE_MARS mime.hoon noun.hoon png.hoon svg.hoon txt.hoon"
BASE_MARS="$BASE_MARS txt-diff.hoon md.hoon"
#  /mar/docket-0 needs it, so a desk with a docket needs it staged
BASE_SURS="docket.hoon"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --src)      SRC="$2"; shift 2 ;;
    --base)     BASE="$2"; shift 2 ;;
    --no-base)  USE_BASE=0; shift ;;
    --no-kelvin) USE_KELVIN=0; shift ;;
    --fixture)  FIXTURE=1; shift ;;
    -h|--help)  sed -n '2,25p' "$0"; exit 0 ;;
    *)          OUT="$1"; shift ;;
  esac
done

if [[ -z "$OUT" ]]; then
  echo "stage-desk.sh: no output directory given" >&2
  exit 2
fi

copy_tree() {  # $1 = source dir, $2 = destination dir
  mkdir -p "$2"
  if command -v rsync >/dev/null 2>&1; then
    rsync -rL --exclude '.*' "$1"/ "$2"/
  else
    cp -rL "$1"/. "$2"/
  fi
}

copy_file() {  # $1 = source file, $2 = destination path
  mkdir -p "$(dirname "$2")"
  cp -L "$1" "$2"
}

#  Check required dependencies before replacing an existing staged tree.
if [[ "$USE_BASE" -eq 1 ]]; then
  if [[ ! -d "$BASE" ]]; then
    echo "stage-desk.sh: base desk not found at $BASE" >&2
    echo "  pass --base <desk> or set URUI_BASE_DESK" >&2
    exit 3
  fi
  [[ "$FIXTURE" -eq 1 ]] && BASE_LIBS="$BASE_LIBS $FIXTURE_LIBS"
  for lib in $BASE_LIBS; do
    if [[ ! -f "$BASE/lib/$lib" ]]; then
      echo "stage-desk.sh: required dependency missing: $BASE/lib/$lib" >&2
      echo "  pass --base <desk> containing the test and fixture libraries" >&2
      exit 3
    fi
  done
fi

rm -rf "$OUT"
mkdir -p "$OUT"
copy_tree "$SRC" "$OUT"

#  the fixture merges over the desk: its lib/ and tests/ sit beside
#  urui's own, and it is the only thing that brings an app/
if [[ "$FIXTURE" -eq 1 ]]; then
  copy_tree "$ROOT/tests/fixture" "$OUT"
fi

if [[ "$USE_BASE" -eq 1 ]]; then
  for lib in $BASE_LIBS; do
    copy_file "$BASE/lib/$lib" "$OUT/lib/$lib"
  done
  if [[ "$FIXTURE" -eq 1 ]]; then
    for mar in $BASE_MARS; do
      [[ -f "$BASE/mar/$mar" ]] && copy_file "$BASE/mar/$mar" "$OUT/mar/$mar"
    done
    for sur in $BASE_SURS; do
      [[ -f "$BASE/sur/$sur" ]] && copy_file "$BASE/sur/$sur" "$OUT/sur/$sur"
    done
  fi
  if [[ "$USE_KELVIN" -eq 1 && -f "$BASE/sys.kelvin" ]]; then
    copy_file "$BASE/sys.kelvin" "$OUT/sys.kelvin"
  fi
fi

#  post-condition: a staged desk contains no symlink, ever
links="$(find "$OUT" -type l -print)"
if [[ -n "$links" ]]; then
  echo "stage-desk.sh: staged desk still contains symlinks:" >&2
  echo "$links" >&2
  exit 1
fi

echo "staged $(find "$OUT" -type f | wc -l) files into $OUT"
