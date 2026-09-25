'use strict';

// Vim keymap, proved in a real browser against the fixture.
//
// The manifest in `ace-win-linux-shortcuts.json` pins Ace's *default*
// keymap; these are the bindings that manifest cannot describe, because
// selecting Vim replaces the keymap wholesale. The point of each case is
// that the keymap is genuinely in force -- a modal editor's `dd` is not
// a chord Ace default would honour -- and that Ace's own bindings come
// back intact when the user switches away.

const {test, expect} = require('@playwright/test');
const {installBackend} = require('./fixtures/backend.js');

const session = 'urui-fixture.session.v1';

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

function source(page) {
  return page.evaluate(() => window.__URUI_EDITOR_TEST__.getSource());
}

async function setSource(page, text) {
  await page.evaluate((next) => {
    window.__URUI_EDITOR_TEST__.setSource(next, {
      history: 'reset',
      notify: false
    });
  }, text);
}

//  The keymap is a preference, so selecting it goes through the modal
//  exactly as a user would.
async function chooseKeymap(page, mode) {
  await page.locator('#settings').click();
  await page.locator(`#keys-${mode}`).check();
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('data-keybindings', mode);
}

function keymapId(page) {
  return page.evaluate(() => {
    const host = document.querySelector('#editor');
    return window.ace.edit(host).getKeyboardHandler()?.$id ?? null;
  });
}

//  Focus and a known cursor, the way the manifest specs prepare a
//  binding: an unplaced cursor makes a line operator ambiguous.
async function focusEditor(page) {
  await page.evaluate(() => {
    const editor = window.ace.edit(document.querySelector('#editor'));
    editor.moveCursorTo(0, 0);
    editor.clearSelection();
    editor.resize(true);
    editor.focus();
  });
}

test('choosing Vim installs the keymap and Ace restores it', async ({
  page
}) => {
  await open(page);
  //  Ace default is the absence of a handler, not a handler named ace.
  expect(await keymapId(page)).toBe(null);

  await chooseKeymap(page, 'vim');
  expect(await keymapId(page)).toBe('ace/keyboard/vim');

  await chooseKeymap(page, 'ace');
  expect(await keymapId(page)).toBe(null);
});

test('Vim normal mode runs motions, operators, and insert', async ({
  page
}) => {
  await open(page);
  await chooseKeymap(page, 'vim');
  await setSource(page, 'alpha\nbravo\ncharlie');
  await focusEditor(page);

  //  `dd` deletes a line -- meaningless to Ace's default keymap, so its
  //  effect is proof the modal keymap is handling the keys.
  await page.keyboard.press('Escape');
  await page.keyboard.type('gg');
  await page.keyboard.type('dd');
  await expect.poll(() => source(page)).toBe('bravo\ncharlie');

  //  `x` deletes one character under the cursor.
  await page.keyboard.type('x');
  await expect.poll(() => source(page)).toBe('ravo\ncharlie');

  //  `i` enters insert mode and ordinary typing is literal again.
  await page.keyboard.type('i');
  await page.keyboard.type('B');
  await expect.poll(() => source(page)).toBe('Bravo\ncharlie');

  //  Escape returns to normal mode: `dd` is an operator once more,
  //  rather than the letters d and d.
  await page.keyboard.press('Escape');
  await page.keyboard.type('dd');
  await expect.poll(() => source(page)).toBe('charlie');
});

test('Vim yank and put duplicate a line', async ({page}) => {
  await open(page);
  await chooseKeymap(page, 'vim');
  await setSource(page, 'one\ntwo');
  await focusEditor(page);

  await page.keyboard.press('Escape');
  await page.keyboard.type('gg');
  await page.keyboard.type('yy');
  await page.keyboard.type('p');
  await expect.poll(() => source(page)).toBe('one\none\ntwo');
});

test('Ace default chords are displaced by Vim and return with it',
  async ({page}) => {
    await open(page);
    await setSource(page, 'alpha\nbravo');
    await focusEditor(page);

    //  Ctrl-D is Ace's "remove line" in the pinned manifest.
    await page.keyboard.press('Control+d');
    await expect.poll(() => source(page)).toBe('bravo');

    //  Under Vim, Ctrl-D is half-page down and removes nothing.
    await chooseKeymap(page, 'vim');
    await setSource(page, 'alpha\nbravo');
    await focusEditor(page);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+d');
    await expect.poll(() => source(page)).toBe('alpha\nbravo');

    //  Switching back restores Ace's own binding.
    await chooseKeymap(page, 'ace');
    await focusEditor(page);
    await page.keyboard.press('Control+d');
    await expect.poll(() => source(page)).toBe('bravo');
  });

test('the Vim choice persists a reload and reaches a later editor',
  async ({page}) => {
    await open(page);
    await chooseKeymap(page, 'vim');
    await expect.poll(() => page.evaluate((key) => {
      return JSON.parse(localStorage.getItem(key))?.preferences?.keybindings;
    }, session)).toBe('vim');

    await open(page);
    await expect(page.locator('html'))
      .toHaveAttribute('data-keybindings', 'vim');
    //  An editor mounted after the preference was restored still gets it.
    expect(await keymapId(page)).toBe('ace/keyboard/vim');
    await page.locator('#settings').click();
    await expect(page.locator('#keys-vim')).toBeChecked();
  });
