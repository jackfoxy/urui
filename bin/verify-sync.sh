#!/usr/bin/env bash
# Warn about drift; --strict also rejects drift and consumer symlinks.
set -euo pipefail
exec python3 "$(dirname "$0")/sync.py" verify "$@"
