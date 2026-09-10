#!/usr/bin/env node
'use strict';

// hoon-parse.js — parse one hoon file through `vere eval`, no ship.
//
// `ream` answers the abstract syntax tree, so this catches exactly the
// class of mistake a substring sweep cannot: source that means something
// other than it looks like, or does not parse at all.  A tape carrying a
// literal brace is the recurring one — `{` opens interpolation, and the
// escape is `\{`.
//
// Usage: node bin/hoon-parse.js FILE [FILE ...]

const fs = require('node:fs');
const path = require('node:path');

const uruiRoot = path.resolve(__dirname, '..');
const {evaluate} =
  require(path.join(uruiRoot, 'tests/browser/eval-assets.js'));

const files = process.argv.slice(2);
if (!files.length) throw new Error('usage: hoon-parse.js FILE [FILE ...]');

//  the file becomes one `'''` cord; only a lone closing fence could end
//  it early, and hoon sources do not contain one at column zero
function program(file) {
  const source = fs.readFileSync(file, 'utf8').replace(/\n+$/, '');
  if (/^'''$/m.test(source)) {
    throw new Error(`${file} contains a bare ''' fence`);
  }
  return `=/  src=@t\n  '''\n${source}\n  '''\n?~((ream src) 0 1)`;
}

(async () => {
  let failed = 0;
  for (const file of files) {
    try {
      const output = await evaluate(program(file));
      const plain = output.replace(/\x1b\[[0-9;]*m/g, '');
      const result = (plain.split('eval (run):')[1] || '').trim();
      if (!result) throw new Error(plain.slice(-400));
      process.stdout.write(`parses  ${file}\n`);
    } catch (cause) {
      failed += 1;
      process.stdout.write(`FAILED  ${file}\n`);
      process.stderr.write(`${String(cause.message || cause).slice(0, 800)}\n`);
    }
  }
  process.exit(failed ? 1 : 0);
})();
