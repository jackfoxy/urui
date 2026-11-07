#!/usr/bin/env node
'use strict';

// keyboard-docs.js — generate the keyboard documentation that has a
// single source, and check that the copies on disk still match.
//
// Usage:
//   node bin/keyboard-docs.js [--consumer DIR]      # write
//   node bin/keyboard-docs.js --check [--consumer DIR]
//
// Two things were written by hand in several places and drifted:
//
//   the Ace reference  the same hundred-row table lived in two apps'
//                      docs and in ace-win-linux-shortcuts.json, which
//                      the conflict gate reads.  Now urui generates
//                      desk/doc/ace-keys.md from that manifest and
//                      syncs it, so the gate and the docs cannot
//                      disagree about what Ace binds.
//
//   an app's chords    each app listed its own chords in prose beside
//                      the ++shortcuts arm that declares them.  The
//                      table between the generated markers comes from
//                      that arm now; the prose around it stays the
//                      app's own.
//
// A consumer's doc keeps everything outside the markers, so what is
// specific to it -- why Alt-O rather than Ctrl-O, why Save As has no
// chord -- is written once, by hand, where it belongs.

const fs = require('node:fs');
const path = require('node:path');

const uruiRoot = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const check = args.includes('--check');
const consumerFlag = args.indexOf('--consumer');
const consumer = consumerFlag >= 0
  ? path.resolve(args[consumerFlag + 1])
  : uruiRoot;

const {table, claims} = require(
  path.join(uruiRoot, 'tests/browser/chords.js')
);

const OPEN = '<!-- generated: app-chords -->';
const CLOSE = '<!-- /generated -->';

function aceDoc() {
  const manifest = JSON.parse(fs.readFileSync(
    path.join(uruiRoot, 'tests/browser/ace-win-linux-shortcuts.json'), 'utf8'
  ));
  const groups = new Map();
  for (const row of manifest.rows) {
    if (!groups.has(row.group)) groups.set(row.group, []);
    groups.get(row.group).push(row);
  }
  const lines = [
    '# Ace editor keys',
    '',
    'The default keybindings of the vendored Ace editor, on Windows and',
    'Linux. **Generated** from `tests/browser/ace-win-linux-shortcuts.json`',
    'by `bin/keyboard-docs.js`, which is the same manifest the cross-app',
    'conflict gate reads — so this page and the gate cannot disagree about',
    'what Ace binds. Do not edit it by hand.',
    '',
    `Pinned at Ace ${manifest.source.version ?? '1.44.0'}, revision`,
    `\`${manifest.source.revision.slice(0, 12)}\`. Selecting **Vim** under`,
    'Settings → Keybindings replaces this keymap wholesale; those bindings',
    'are pinned separately in `tests/browser/vim-chords.json`.',
    '',
    'An application chord that displaces one of these is recorded in the',
    "app's `tests/browser/shortcut-exceptions.json`, with what it displaces",
    'and how that stays reachable. See `key-policy.md`.',
    ''
  ];
  for (const [group, rows] of groups) {
    lines.push(`## ${group}`, '');
    lines.push('| Windows/Linux | Action |', '|:----|:-------|');
    for (const row of rows) {
      const keys = row.bindings.length ? row.bindings.join(', ') : '—';
      lines.push(`| ${keys} | ${row.action} |`);
    }
    lines.push('');
  }
  const excluded = manifest.rows.filter((row) => !row.bindings.length);
  if (excluded.length) {
    lines.push(
      '## Unbound on Windows and Linux',
      '',
      'These rows have a Mac binding only, so nothing here claims them:',
      ''
    );
    for (const row of excluded) {
      lines.push(`- ${row.group}: ${row.action}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function chordTable(root) {
  const {chords} = table(root);
  const lines = [
    OPEN,
    '',
    '| Key | Action | Where |',
    '|:----|:-------|:------|'
  ];
  const where = {
    always: 'Everywhere',
    'no-editor': 'Outside the editor',
    editor: 'In the editor',
    preview: 'With a live preview'
  };
  for (const chord of chords) {
    const displaced = claims(chord.binding)
      .filter((entry) => entry.keymap === 'ace')
      .map((entry) => entry.action);
    const note = chord.policy === 'override' && displaced.length
      ? ` (displaces Ace’s ${displaced[0]})`
      : '';
    lines.push(
      `| ${chord.binding} | ${chord.label}${note} | ${where[chord.when]} |`
    );
  }
  lines.push('', CLOSE);
  return lines.join('\n');
}

function spliced(current, generated) {
  const start = current.indexOf(OPEN);
  const end = current.indexOf(CLOSE);
  if (start < 0 || end < 0) {
    throw new Error(
      `no ${OPEN} / ${CLOSE} markers in the document; add them around the`
      + ' chord table'
    );
  }
  return current.slice(0, start) + generated
    + current.slice(end + CLOSE.length);
}

const targets = [];
//  the Ace reference lives in urui and is synced from there
if (consumer === uruiRoot) {
  targets.push([path.join(uruiRoot, 'desk/doc/ace-keys.md'), aceDoc()]);
}
//  the chord table, in whichever document carries the markers
const doc = path.join(consumer, 'desk/doc/keyboard-shortcuts.md');
if (fs.existsSync(doc)) {
  targets.push([doc, spliced(fs.readFileSync(doc, 'utf8'), chordTable(consumer))]);
}

let stale = 0;
for (const [file, built] of targets) {
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const label = path.relative(consumer, file);
  if (current === built) {
    if (!check) process.stdout.write(`unchanged  ${label}\n`);
    continue;
  }
  if (check) {
    process.stderr.write(
      `${label} is out of date; run node bin/keyboard-docs.js`
      + (consumer === uruiRoot ? '\n' : ` --consumer ${consumer}\n`)
    );
    stale += 1;
    continue;
  }
  fs.writeFileSync(file, built);
  process.stdout.write(`wrote      ${label}\n`);
}
process.exit(stale ? 1 : 0);
