#!/usr/bin/env bash
#
# asset-digest.sh — fingerprint a consumer's browser assets offline.
#
# Usage:
#   asset-digest.sh [--consumer DIR] [--spec FILE] [--assets "a b c"]
#
#   --consumer DIR   consumer checkout           (default: $PWD)
#   --spec FILE      binding manifest            (default: auto-detect)
#   --assets "..."   arm names to digest         (default: page css javascript)
#
# Emits one line per asset:
#
#   <sha256>  <bytes>  <asset>
#
# The digests are the Phase 3 gate. W3.3 accepts new CSS digests and a new
# graph-viz page digest (its CSS is inline); W3.5 changes JavaScript and
# W3.6 changes the fixture page. Other assets remain byte-identical.
#
# Compilation goes through `vere eval` rather than a ship: each /- or /+
# dependency becomes an `=+  ^=  face` binding, in dependency order, read
# from the manifest.  The hashing happens *inside* Hoon — `shax` over the
# cord — so a 130-kilobyte asset is never printed to a terminal and cannot
# be truncated on the way out.  `shax` is sha-256 over the cord's atom,
# which is the byte string little-endian; reversing the 32 bytes reproduces
# `sha256sum`.
#
# A manifest is one `face  path` pair per line, in binding order, ending
# with the library that defines the asset arms.
#
# Requirements: a vere binary (VERE env or the default below), python3.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERE="${VERE:-$HOME/piers/urbit}"
CONSUMER="$PWD"
SPEC=""
ASSETS="page css javascript"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --consumer)  CONSUMER="$(cd "$2" && pwd)"; shift 2 ;;
    --spec)      SPEC="$2"; shift 2 ;;
    --assets)    ASSETS="$2"; shift 2 ;;
    -h|--help)   sed -n '2,31p' "$0"; exit 0 ;;
    *)           echo "asset-digest.sh: unknown argument $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$SPEC" ]]; then
  if [[ -f "$CONSUMER/bin/assets.txt" ]]; then
    SPEC="$CONSUMER/bin/assets.txt"
  else
    SPEC="$ROOT/bin/assets-graph-viz.txt"
  fi
fi

[[ -x "$VERE" ]] || { echo "no vere binary at $VERE (set VERE)" >&2; exit 1; }
[[ -f "$SPEC" ]] || { echo "no manifest at $SPEC" >&2; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

WEB=""
{
  while read -r face relative; do
    [[ -z "${face:-}" || "${face:0:1}" == "#" ]] && continue
    echo "=+  ^=  $face"
    grep -v '^/[-+*]' "$CONSUMER/$relative"
    WEB="$face"
  done < "$SPEC"
  for asset in $ASSETS; do
    echo "=/  $asset-cord=@t  $asset:$WEB"
  done
  echo ':*'
  for asset in $ASSETS; do
    echo "  (met 3 $asset-cord)  (shax $asset-cord)"
  done
  echo '=='
} > "$WORK/digest.hoon"

"$VERE" eval < "$WORK/digest.hoon" 2>&1 \
  | grep -vE 'loom|lite|eval \(run\)|^$' > "$WORK/digest.out"

python3 - "$WORK/digest.out" "$ASSETS" <<'PY'
import re, sys

raw = re.sub(r'\x1b\[[0-9;]*m', '', open(sys.argv[1]).read())
raw = raw.replace('\r', ' ').replace('\n', ' ').strip()
assets = sys.argv[2].split()

fields = [int(field.replace('.', ''))
          for field in re.findall(r'\d[\d.]*', raw)]
if len(fields) != 2 * len(assets):
    sys.exit(f'unexpected eval output: {raw[:400]}')

for index, asset in enumerate(assets):
    size, digest = fields[2 * index], fields[2 * index + 1]
    print(f"{digest.to_bytes(32, 'little').hex()}  {size}  {asset}")
PY
