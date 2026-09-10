#!/usr/bin/env node
'use strict';

// hoon-test.js — run a /tests/lib arm set through `vere eval`, no ship.
//
// The desk suites need a booted pier; this does not.  Each `/-` and `/+`
// of the test file becomes an `=+  ^=  face` binding in dependency order,
// with `lib/test.hoon` composed into the subject so `expect` resolves.
// A `tang` of length 0 is a passing arm.
//
// Usage: node bin/hoon-test.js CONSUMER TEST_FILE [arm ...]

const fs = require('node:fs');
const path = require('node:path');

const uruiRoot = path.resolve(__dirname, '..');
const {assemble} = require(path.join(uruiRoot, 'tests/browser/serve-app.js'));
const {evaluate, readSource} =
  require(path.join(uruiRoot, 'tests/browser/eval-assets.js'));

const [consumerArg, testArg, ...only] = process.argv.slice(2);
if (!consumerArg || !testArg) {
  throw new Error('usage: hoon-test.js CONSUMER TEST_FILE [arm ...]');
}
const consumer = path.resolve(consumerArg);
const testFile = path.resolve(consumer, testArg);
const source = fs.readFileSync(testFile, 'utf8');

//  `/*` pulls a file out of clay.  There is no clay here, so a suite
//  built on a corpus needs the desk runner and a booted ship.
if (/^\/\*/m.test(source)) {
  process.stderr.write(
    `${path.relative(consumer, testFile)} imports clay files with /*; `
    + 'run it with -test on a ship\n'
  );
  process.exit(2);
}

//  Resolve one import to [face, path], preferring the consumer's own
//  copy and falling back to urui's for a shared library.
function resolve(kind, token) {
  const [face, name] = token.includes('=')
    ? token.split('=')
    : [token, token];
  const folder = kind === '/-' ? 'sur' : 'lib';
  const relative = `desk/${folder}/${name}.hoon`;
  if (fs.existsSync(path.join(consumer, relative))) return [face, relative];
  if (fs.existsSync(path.join(uruiRoot, relative))) return [face, relative];
  throw new Error(`cannot resolve ${kind} ${name}`);
}

function imports(file) {
  const text = fs.readFileSync(file, 'utf8');
  const found = [];
  for (const line of text.split('\n')) {
    const match = /^(\/[-+])\s+(.*)$/.exec(line.trim());
    if (!match) continue;
    for (const token of match[2].split(',').map((item) => item.trim())) {
      if (!token || token.startsWith('*')) continue;
      found.push(resolve(match[1], token));
    }
  }
  return found;
}

//  Depth first, so every library is bound before the file importing it —
//  the order ford would use.
const bindings = [];
const seen = new Set();
function collect(file) {
  for (const [face, relative] of imports(file)) {
    if (seen.has(relative)) continue;
    seen.add(relative);
    const resolved = fs.existsSync(path.join(consumer, relative))
      ? path.join(consumer, relative)
      : path.join(uruiRoot, relative);
    collect(resolved);
    bindings.push([face, relative]);
  }
}
collect(testFile);
bindings.push(['tst', path.relative(consumer, testFile)]);

const arms = only.length ? only : Array.from(
  source.matchAll(/^\+\+ {2}(test-[a-z0-9-]+)/gm), (match) => match[1]
);
if (!arms.length) throw new Error('no test arms found');

const expression = `:*  ${arms.map((arm) => `(lent ${arm}:tst)`).join('  ')}  ==`;
const program = `=>  ${readSource(path.join(uruiRoot, 'desk/lib/test.hoon'))}\n`
  + assemble(bindings, expression, consumer);

evaluate(program).then((output) => {
  const plain = output.replace(/\x1b\[[0-9;]*m/g, '');
  const result = plain.split('eval (run):')[1] || '';
  const counts = Array.from(result.matchAll(/\d[\d.]*/g),
    (match) => Number(match[0].replace(/\./g, '')));
  if (counts.length !== arms.length) {
    process.stderr.write(`unexpected eval output: ${result.trim()}\n`);
    process.exit(1);
  }
  let failed = 0;
  arms.forEach((arm, index) => {
    if (counts[index] === 0) return;
    failed += 1;
    process.stdout.write(`FAIL  ${arm}  (${counts[index]} in tang)\n`);
  });
  const label = path.relative(consumer, testFile);
  process.stdout.write(failed
    ? `${label}: ${arms.length - failed}/${arms.length} arms ok\n`
    : `${label}: ${arms.length} arms ok\n`);
  process.exit(failed ? 1 : 0);
}).catch((cause) => {
  process.stderr.write(`${String(cause.message || cause).slice(0, 3000)}\n`);
  process.exit(1);
});
