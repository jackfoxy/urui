'use strict';

// Every vendored Ace file must be routed by the agent that serves it.
//
// The dev server in `serve-app.js` answers `/ace/<name>` from
// `desk/web/ace/` by filename, so a file that exists is always served
// there. A real ship serves only what the agent Ford-imports and lists,
// and that list is written by hand. Nothing else compares the two, so a
// newly vendored file can pass every browser test and still 404 on a
// ship -- which is exactly how `keybinding-vim.js` shipped broken.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '../..');
const aceDir = path.join(root, 'desk/web/ace');
const agent = fs.readFileSync(
  path.join(root, 'tests/fixture/app/urui-fixture.hoon'),
  'utf8'
);

//  `/*  face  %js  /web/ace/<stem>/js` -- the mark is the extension, so
//  the clay path spells `a.js` as `/web/ace/a/js`.
function importedStems() {
  return new Set(
    [...agent.matchAll(/\/\*\s+\S+\s+%\w+\s+\/web\/ace\/([\w-]+)\/\w+/g)]
      .map((match) => match[1])
  );
}

test('the fixture agent Ford-imports every vendored Ace file', () => {
  const files = fs.readdirSync(aceDir)
    .filter((name) => name !== 'README.md');
  assert.ok(files.length >= 9, 'vendored files are present');

  const imported = importedStems();
  const missing = files.filter((name) => {
    return !imported.has(name.replace(/\.[^.]+$/, ''));
  });
  assert.deepEqual(missing, [], `unrouted Ace assets: ${missing.join(', ')}`);
});

test('the fixture agent serves every file it imports', () => {
  for (const stem of importedStems()) {
    //  `_` is not a clay path character, so the settings menu is stored
    //  as `-` and served at Ace's own `_` url.
    const served = new RegExp(`'/ace/${stem.replace(/-/g, '[-_]')}\\.\\w+'`);
    assert.match(agent, served, `${stem} is imported but not routed`);
  }
});
