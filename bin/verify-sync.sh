#!/usr/bin/env bash
# Warn about drift; --strict also rejects drift and consumer symlinks.
set -euo pipefail
"$(dirname "$0")/check-purity.sh"
exec python3 "$(dirname "$0")/sync.py" verify "$@"
