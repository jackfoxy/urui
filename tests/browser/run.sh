#!/usr/bin/env bash
#
# run.sh — the doubles suite against the fixture's compiled app.js.
#
# With no argument the bundle is compiled from desk sources; pass a path to
# test a bundle served by a running ship instead.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_JS="${1:-}"
WORK=""

if [[ -z "$APP_JS" ]]; then
  WORK="$(mktemp -d)"
  trap 'rm -rf "$WORK"' EXIT
  APP_JS="$WORK/app.js"
  node -e '
    const {compileFixture} = require(process.argv[1]);
    const fs = require("node:fs");
    compileFixture("urui-fixture-web")
      .then((a) => fs.writeFileSync(process.argv[2], a.javascript))
      .catch((cause) => { console.error(String(cause.message || cause));
        process.exit(1); });
  ' "$ROOT/tests/browser/serve-app.js" "$APP_JS"
fi

node --check "$APP_JS"
URUI_APP_JS="$APP_JS" node --test "$ROOT/tests/browser/urui-core.test.js"
node "$ROOT/tests/browser/run-scenarios.js" "$APP_JS"
node --test "$ROOT/tests/browser/ace-config.test.js"
