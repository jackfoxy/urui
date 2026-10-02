#!/usr/bin/env bash
# Manually copy the active urui sources into a consumer checkout.
set -euo pipefail
exec python3 "$(dirname "$0")/sync.py" sync "$@"
