#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PATTERN='graph-viz|gviz|obelisk|heathcliff|dot-language'
if matches="$(LC_ALL=C grep -rniE "$PATTERN" "$ROOT/desk")"; then
  echo 'urui purity check failed: consumer vocabulary found in desk/' >&2
  echo "$matches" >&2
  exit 1
else
  status=$?
  if [[ "$status" -ne 1 ]]; then
    exit "$status"
  fi
fi
