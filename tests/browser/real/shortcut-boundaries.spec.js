const {test, expect} = require('@playwright/test');
const {installBackend} = require('./fixtures/backend.js');

//  A table of contents with one page, one group, and a group inside that
//  group: enough shape to exercise the nesting the help panel renders.
const toc = [
  '/users-guide/md    Users Guide',
  '/reference         Reference',
  '  /syntax/md         Syntax',
  '  /nested            Nested Reference',
  '    /deep/md           Deep Page'
].join('\n');

async function installRoutes(page, state, options = {}) {
  await installBackend(page, {
    browse: ({kind, path}) => path
      ? {file: true, children: []}
      : {file: false, children: [kind === 'text' ? 'txt' : 'md']},
    render: (source) => {
      state.renders.push(source);
      return `echoed: ${source}`;
    },
    save: ({kind, body}) => {
      state.saves[kind].push(body || '');
    },
    docs: {toc},
    ...options
  });
}

async function setSourceAndEcho(page, state, source) {
  await page.evaluate((nextSource) => {
    const toggle = document.querySelector('#auto-echo');
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    window.__URUI_EDITOR_TEST__.setSource(nextSource, {
      history: 'reset',
      notify: false
    });
  }, source);
  state.renders.length = 0;
  await page.locator('#echo').click();
  await expect.poll(() => state.renders.length).toBe(1);
  await expect(page.locator('#fixture-result')).toContainText('echoed:');
  await page.waitForTimeout(100);
  state.renders.length = 0;
}

test.beforeEach(async ({context}) => {
  await context.addInitScript(() => {
    window.__URUI_BROWSER_TEST__ = {
      acePlatform: 'win',
      keyboardLayout: 'en-US'
    };
  });
});

test('Ace retains displaced and destructive editor commands', async ({
  page
}) => {
  const state = {renders: [], saves: {text: [], note: []}};
  await installRoutes(page, state);
  await page.goto('/apps/urui-fixture/');
  const sortable = 'digraph sort {\n  z\n  a\n}';
  await setSourceAndEcho(page, state, sortable);
  await page.evaluate(() => {
    window.prompt = () => 'must-not-save.text';
    const editor = window.ace.edit(document.querySelector('#editor'));
    editor.selection.setSelectionRange({
      start: {row: 1, column: 0},
      end: {row: 2, column: 3}
    });
    editor.focus();
  });
  await page.keyboard.press('Control+Alt+s');
  await expect.poll(() => page.evaluate(() => {
    return window.__URUI_EDITOR_TEST__.getSource();
  })).toBe('digraph sort {\n  a\n  z\n}');
  expect(state.saves.text).toHaveLength(0);

  await page.evaluate(() => {
    const adapter = window.__URUI_EDITOR_TEST__;
    adapter.setSource('digraph tabs {\nAlpha\n}', {
      history: 'reset',
      notify: false
    });
    const editor = window.ace.edit(document.querySelector('#editor'));
    editor.moveCursorTo(1, 0);
    editor.clearSelection();
    editor.focus();
  });
  await page.keyboard.press('Tab');
  await expect.poll(() => page.evaluate(() => {
    return window.__URUI_EDITOR_TEST__.getSource();
  })).toBe('digraph tabs {\n  Alpha\n}');
  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => page.evaluate(() => {
    return window.__URUI_EDITOR_TEST__.getSource();
  })).toBe('digraph tabs {\nAlpha\n}');

  const source = 'digraph edit {\n  Alpha\n  Beta\n}';
  await setSourceAndEcho(page, state, source);
  await page.evaluate(() => {
    const editor = window.ace.edit(document.querySelector('#editor'));
    editor.moveCursorTo(1, 2);
    editor.clearSelection();
    editor.focus();
  });
  await page.keyboard.press('Delete');
  await expect.poll(() => page.evaluate(() => {
    return window.__URUI_EDITOR_TEST__.getSource();
  })).toBe('digraph edit {\n  lpha\n  Beta\n}');

  await setSourceAndEcho(page, state, source);
  await page.evaluate(() => {
    const editor = window.ace.edit(document.querySelector('#editor'));
    editor.moveCursorTo(1, 3);
    editor.clearSelection();
    editor.focus();
  });
  await page.keyboard.press('Backspace');
  await expect.poll(() => page.evaluate(() => {
    return window.__URUI_EDITOR_TEST__.getSource();
  })).toBe('digraph edit {\n  lpha\n  Beta\n}');
});

test('focus boundaries cover explorer, Help, docs, and the file tree', async ({
  page
}) => {
  const state = {renders: [], saves: {text: [], note: []}};
  await installRoutes(page, state);
  await page.goto('/apps/urui-fixture/');
  await setSourceAndEcho(page, state, 'digraph focus {\n  Alpha\n  Beta\n}');

  await page.locator('#text-files-tab').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#note-files-tab')).toBeFocused();

  await page.locator('#help').click();
  await expect(page.locator('#close-help')).toBeFocused();
  await expect(page.locator('#help-panel')).toHaveAttribute('role', 'dialog');
  await expect(page.locator('#help-tab')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#help-panel')).toBeHidden();
  await expect(page.locator('#help')).toBeFocused();

  await page.locator('#help').click();
  await expect(page.locator('#docs-help-content')).toBeVisible();
  await expect(page.locator('#fallback-help-content')).toBeHidden();
  const groups = page.locator('.docs-help-group');
  await expect(groups).toHaveCount(2);
  expect(await groups.evaluateAll((items) => {
    return items.every((item) => !item.open);
  })).toBe(true);
  const reference = groups.filter({
    has: page.locator('summary').filter({hasText: /^Reference$/})
  });
  await reference.locator('summary').first().click();
  await expect(reference).toHaveJSProperty('open', true);
  const nested = reference.locator('.docs-help-group').filter({
    has: page.locator('summary').filter({hasText: /^Nested Reference$/})
  });
  await expect(nested.locator('summary').first()).toBeVisible();
  await nested.locator('summary').first().click();
  await expect(nested).toHaveJSProperty('open', true);
  await expect(page.getByRole('link', {name: 'Deep Page', exact: true}))
    .toHaveAttribute('href', '/docs/d/urui-fixture/reference/nested/deep');
  await nested.locator('summary').first().click();
  await expect(nested).toHaveJSProperty('open', false);
  await reference.locator('summary').first().click();
  await expect(reference).toHaveJSProperty('open', false);

  await page.getByRole('link', {name: 'Users Guide'}).click();
  const docsTab = page.locator('.docs-tab').filter({hasText: 'Users Guide'});
  await expect(docsTab).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(docsTab).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#note-files-tab')).toBeFocused();

  await page.locator('#text-files-tab').click();
  const action = page.locator('#text-files-tree .file-tree-actions').first();
  await action.click();
  await expect(page.locator('#file-context-open')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(action).toBeFocused();
});

test('Clay dialog Escape restores the invoking control', async ({page}) => {
  const state = {renders: [], saves: {text: [], note: []}};
  await installRoutes(page, state, {
    textLoad: () => ({status: 500, body: 'forced load failure'})
  });
  await page.goto('/apps/urui-fixture/');
  await page.evaluate(() => {
    window.prompt = () => 'broken.text';
  });
  await page.locator('#load-text').click();
  await expect(page.locator('#clay-error-modal')).toBeVisible();
  await expect(page.locator('#close-clay-error')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#clay-error-modal')).toBeHidden();
  await expect(page.locator('#load-text')).toBeFocused();
});
