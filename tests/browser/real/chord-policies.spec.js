'use strict';

// What each `policy` promises, in a real browser, under both keymaps.
//
// `shortcut-conflicts.test.js` checks the declarations against the
// pinned Ace and Vim manifests; it cannot tell whether the dispatcher
// honours them.  This drives every chord the fixture declares and
// asserts which ones the dispatcher claims:
//
//   %override  claimed even while the editor has focus -- that is what
//              being an override means
//   %gated     never claimed while the editor has focus, so the
//              keystroke reaches the editor
//   %preview   claimed only where the consumer reports a live preview
//
// "Claimed" is read from `dispatchEvent`, which answers false when a
// listener called preventDefault.  A bubble-phase listener cannot be
// used instead: the capture-phase dispatcher also calls
// stopPropagation, so a claimed chord never reaches one.
//
// Run under both keymaps.  The dispatcher decides on focus rather than
// on keymap today, so the Vim pass is a guard against that changing
// quietly -- whether the editor then *honours* an unclaimed key is
// vim-keybindings.spec.js's subject, not this one.

const {test, expect} = require('@playwright/test');
const {installBackend} = require('./fixtures/backend.js');
const {table} = require('../chords.js');
const path = require('node:path');

const {chords} = table(path.resolve(__dirname, '../../..'));

test.beforeEach(async ({context}) => {
  await context.addInitScript(() => {
    window.__URUI_BROWSER_TEST__ = {
      acePlatform: 'win',
      keyboardLayout: 'en-US'
    };
  });
});

async function open(page) {
  await installBackend(page, {browse: true, render: '<pre>echoed</pre>'});
  await page.goto('/apps/urui-fixture/');
  await expect(page.locator('#editor-pane-document-tabs .document-tab'))
    .not.toHaveCount(0);
}

async function chooseKeymap(page, choice) {
  await page.locator('#settings').click();
  await page.locator(`#keys-${choice}`).check();
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings-modal')).toBeHidden();
  if (choice === 'vim') {
    await expect.poll(() => page.evaluate(() => {
      const host = document.querySelector('#editor');
      return window.ace.edit(host).getKeyboardHandler()?.$id ?? null;
    })).toBe('ace/keyboard/vim');
  }
}

async function focusEditor(page) {
  await page.evaluate(() => {
    const editor = window.ace.edit(document.querySelector('#editor'));
    editor.moveCursorTo(0, 0);
    editor.clearSelection();
    editor.focus();
  });
}

//  Whether the capture-phase dispatcher claimed the chord.
function claimed(page, binding) {
  return page.evaluate((chord) => {
    const parts = chord.split('-');
    const key = parts.pop();
    const named = {
      Enter: 'Enter', Space: ' ', Delete: 'Delete', Escape: 'Escape'
    };
    const event = new KeyboardEvent('keydown', {
      key: named[key] || (key.length === 1 ? key.toLowerCase() : key),
      ctrlKey: parts.includes('Ctrl'),
      shiftKey: parts.includes('Shift'),
      altKey: parts.includes('Alt'),
      bubbles: true,
      cancelable: true
    });
    const target = document.activeElement || document.body;
    return !target.dispatchEvent(event);
  }, binding);
}

for (const keymap of ['ace', 'vim']) {
  test(`${keymap}: an %override chord is claimed inside the editor`,
    async ({page}) => {
      await open(page);
      if (keymap === 'vim') await chooseKeymap(page, 'vim');
      await focusEditor(page);
      const overrides = chords.filter((item) => item.policy === 'override');
      expect(overrides.length).toBeGreaterThan(0);
      for (const chord of overrides) {
        expect(await claimed(page, chord.binding),
          `${chord.binding} (${chord.command}) was not claimed`).toBe(true);
        await page.keyboard.press('Escape');
        await focusEditor(page);
      }
    });

  test(`${keymap}: a %gated chord is left to the editor`,
    async ({page}) => {
      await open(page);
      if (keymap === 'vim') await chooseKeymap(page, 'vim');
      await focusEditor(page);
      const gated = chords.filter((item) => item.policy === 'gated');
      expect(gated.length).toBeGreaterThan(0);
      for (const chord of gated) {
        expect(await claimed(page, chord.binding),
          `${chord.binding} leaked into the editor`).toBe(false);
      }
    });

  test(`${keymap}: a %preview chord waits for a live preview`,
    async ({page}) => {
      await open(page);
      if (keymap === 'vim') await chooseKeymap(page, 'vim');
      await focusEditor(page);
      const preview = chords.filter((item) => item.when === 'preview');
      expect(preview.length).toBeGreaterThan(0);
      for (const chord of preview) {
        expect(await claimed(page, chord.binding),
          `${chord.binding} fired with no preview`).toBe(false);
      }
    });
}
