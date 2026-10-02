#!/usr/bin/env bash
#
# run-real.sh — Playwright against the fixture in a real Chromium.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

cd "$ROOT"
exec ./node_modules/.bin/playwright test \
  --config tests/browser/real/playwright.config.js
