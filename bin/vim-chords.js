#!/usr/bin/env node
'use strict';

// vim-chords.js — pin the Vim keymap's chords from the vendored bundle.
//
// Usage:
//   node bin/vim-chords.js            # write tests/browser/vim-chords.json
//   node bin/vim-chords.js --check    # fail if the file is out of date
//
// Every app can switch its editor to the Vim keymap in Settings, which
// replaces Ace's bindings wholesale.  So a chord that is free against
// `ace-win-linux-shortcuts.json` may still be taken, and the conflict
// gate needs both manifests.  This reads `defaultKeymap` out of
// `desk/web/ace/keybinding-vim.js` -- the pinned bundle, not upstream --
// and records each entry's keys, context and action.
//
// Only chords that could collide with an application chord are kept: a
// bare letter in normal mode is Vim's to own, but it is also what an
// app must never bind globally, so it stays.  A multi-key sequence is
// recorded by its leading key, as `prefix`.  Only `<character>`
// placeholders are dropped.

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const bundle = path.join(root, 'desk/web/ace/keybinding-vim.js');
const output = path.join(root, 'tests/browser/vim-chords.json');

//  `<C-x>` / `<S-Left>` / `<A-j>` in the bundle's spelling, to the
//  `Ctrl-X` / `Shift-Left` / `Alt-J` spelling $shortcut uses.
const special = new Map([
  ['Left', 'Left'], ['Right', 'Right'], ['Up', 'Up'], ['Down', 'Down'],
  ['Space', 'Space'], ['BS', 'Backspace'], ['Del', 'Delete'],
  ['CR', 'Enter'], ['Esc', 'Escape'], ['Tab', 'Tab'],
  ['Home', 'Home'], ['End', 'End'], ['PageUp', 'PageUp'],
  ['PageDown', 'PageDown'], ['Ins', 'Insert']
]);

//  One leading key of a `keys` string, and what is left after it.
function lead(keys) {
  //  a bracketed key, optionally with modifiers: <C-S-Left>
  const bracketed = /^<((?:[CSA]-)*)([A-Za-z]+|\d)>/.exec(keys);
  if (bracketed) {
    const [whole, modifiers, name] = bracketed;
    if (name === 'character') return null;
    const parts = [];
    if (modifiers.includes('C-')) parts.push('Ctrl');
    if (modifiers.includes('A-')) parts.push('Alt');
    if (modifiers.includes('S-')) parts.push('Shift');
    const base = special.get(name)
      || (name.length === 1 ? name.toUpperCase() : name);
    parts.push(base);
    return {binding: parts.join('-'), rest: keys.slice(whole.length)};
  }
  if (!keys.length) return null;
  //  a bare character: Vim's own, and never an app's to take
  return {binding: keys[0], rest: keys.slice(1)};
}

//  A sequence is recorded by its leading key, as `prefix`.
//  `f<character>` means Vim claims the `f` keydown and then waits, so
//  an app that bound bare `f` would swallow the motion -- the very
//  collision the gate must see, though no single keydown matches the
//  whole sequence.
function normalize(keys) {
  const found = lead(keys);
  if (!found) return null;
  return {binding: found.binding, match: found.rest ? 'prefix' : 'exact'};
}

function rows() {
  const source = fs.readFileSync(bundle, 'utf8');
  const start = source.indexOf('var defaultKeymap = [');
  if (start < 0) throw new Error('defaultKeymap not found in the bundle');
  const end = source.indexOf('\n];', start);
  if (end < 0) throw new Error('defaultKeymap is not terminated');
  const table = source.slice(start, end);

  const found = new Map();
  const entry = /\{\s*keys:\s*'([^']*)'([^}]*)\}/g;
  for (const match of table.matchAll(entry)) {
    const [, keys, rest] = match;
    const normalized = normalize(keys);
    if (!normalized) continue;
    const {binding, match: how} = normalized;
    const type = /type:\s*'([^']*)'/.exec(rest)?.[1] || '';
    const action = /action:\s*'([^']*)'/.exec(rest)?.[1] || '';
    const toKeys = /toKeys:\s*'([^']*)'/.exec(rest)?.[1] || '';
    const context = /context:\s*'([^']*)'/.exec(rest)?.[1] || 'normal';
    const key = `${binding} ${context} ${how}`;
    if (found.has(key)) continue;
    found.set(key, {
      binding,
      keys,
      context,
      match: how,
      type,
      action: action || (toKeys ? `maps to ${toKeys}` : type)
    });
  }
  return [...found.values()].sort((left, right) => {
    return left.binding.localeCompare(right.binding)
      || left.context.localeCompare(right.context);
  });
}

function manifest() {
  const bytes = fs.statSync(bundle).size;
  const list = rows();
  const contexts = [...new Set(list.map((row) => row.context))].sort();
  return {
    source: {
      file: 'desk/web/ace/keybinding-vim.js',
      bytes,
      note: 'the pinned vendored bundle, not upstream Ace'
    },
    scope: {
      keymap: 'vim',
      acePlatform: 'win',
      hostPlatform: 'linux',
      keyboardLayout: 'en-US'
    },
    coverage: {
      contexts,
      chords: list.length,
      exact: list.filter((row) => row.match === 'exact').length,
      prefix: list.filter((row) => row.match === 'prefix').length,
      dropped: '<character> placeholders'
    },
    rows: list
  };
}

const built = `${JSON.stringify(manifest(), null, 2)}\n`;

if (process.argv.includes('--check')) {
  const current = fs.existsSync(output) ? fs.readFileSync(output, 'utf8') : '';
  if (current !== built) {
    process.stderr.write(
      'tests/browser/vim-chords.json is out of date; '
      + 'run node bin/vim-chords.js\n'
    );
    process.exit(1);
  }
  process.stdout.write('vim-chords.json matches the pinned bundle\n');
} else {
  fs.writeFileSync(output, built);
  process.stdout.write(`${output}: ${manifest().coverage.chords} chords\n`);
}
