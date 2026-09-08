#!/usr/bin/env bash
#
# link.sh — create or repair a consumer's urui links.
#
# Refuses to overwrite a regular file, so an un-migrated consumer is never
# clobbered: move the file out of the way first, deliberately.
#
# Usage:
#   link.sh --consumer DIR [--dry-run]
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONSUMER=""
DRY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --consumer)  CONSUMER="$(cd "$2" && pwd)"; shift 2 ;;
    --dry-run)   DRY=1; shift ;;
    -h|--help)   sed -n '2,12p' "$0"; exit 0 ;;
    *)           echo "link.sh: unknown argument $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$CONSUMER" ]]; then
  echo "link.sh: --consumer DIR is required" >&2
  exit 2
fi

made=0
while read -r link target; do
  [[ -z "${link:-}" || "${link:0:1}" == "#" ]] && continue
  path="$CONSUMER/$link"
  if [[ -e "$path" && ! -L "$path" ]]; then
    echo "refusing to replace regular file: $link" >&2
    exit 1
  fi
  if [[ "$DRY" -eq 1 ]]; then
    echo "would link $link -> $target"
    continue
  fi
  mkdir -p "$(dirname "$path")"
  ln -sfn "$target" "$path"
  made=$((made + 1))
done < "$ROOT/bin/links.txt"

[[ "$DRY" -eq 1 ]] || echo "linked $made paths in $CONSUMER"
