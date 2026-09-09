#!/usr/bin/env bash
# Warn about drift by default; --strict makes drift a release failure.
set -euo pipefail
exec python3 "$(dirname "$0")/sync.py" verify "$@"
