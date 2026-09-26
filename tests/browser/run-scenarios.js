'use strict';

// Doubles-suite runner: one process per scenario, each booting its own copy
// of the fixture's app.js.  Mirrors graph-viz's runner so a scenario moved
// between the two repos needs no edits.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {fork} = require('node:child_process');

const scenarios = require('./scenarios/index.js');

const application = process.argv[2];
if (!application) throw new Error('usage: node run-scenarios.js APP_JS');

const runner = path.join(__dirname, 'run-scenario.js');

let target = path.resolve(application);
let scratch;
if (application === '-') {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'urui-web-'));
  target = path.join(scratch, 'app.js');
  fs.writeFileSync(target, fs.readFileSync(0, 'utf8'));
}

function runScenario(name) {
  return new Promise((resolve) => {
    const child = fork(runner, [target, name], {stdio: 'inherit'});
    child.on('exit', (code) => resolve(code === 0));
  });
}

(async () => {
  const failed = [];
  for (const name of scenarios.all) {
    if (!await runScenario(name)) failed.push(name);
  }
  if (scratch) fs.rmSync(scratch, {recursive: true, force: true});
  if (failed.length) {
    console.error(`urui browser: failed ${failed.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  console.log(`urui browser: ok (${scenarios.all.length} scenarios)`);
})();
