'use strict';

const {test, expect} = require('@playwright/test');

test.beforeEach(async ({context}) => {
  await context.addInitScript(() => {
    window.__URUI_BROWSER_TEST__ = {
      acePlatform: 'win', keyboardLayout: 'en-US'
    };
  });
});

test('fixture mounts and exposes both shared editor adapters', async ({page}) => {
  await page.goto('/apps/urui-fixture/');

  await expect(page.locator('#editor .ace_text-input')).toHaveCount(1);
  await expect(page.locator('#result-editor .ace_text-input')).toHaveCount(1);
  await expect(page.locator('#editor-load-error')).toBeHidden();
  await expect(page.locator('#result-editor-load-error')).toBeHidden();

  const mounted = await page.evaluate(() => ({
    primary: window.urui.editor.primary() === window.__URUI_EDITOR_TEST__,
    secondary:
      window.urui.editor.secondary() === window.__URUI_NOTE_EDITOR_TEST__,
    source: window.__URUI_EDITOR_TEST__.getSource(),
    note: window.__URUI_NOTE_EDITOR_TEST__.getSource()
  }));
  expect(mounted).toEqual({
    primary: true, secondary: true, source: 'fixture source', note: ''
  });

  await page.evaluate(() => {
    window.__URUI_EDITOR_TEST__.setSource('first\nsecond', {
      history: 'reset', selection: {start: 6, end: 12}
    });
    window.__URUI_NOTE_EDITOR_TEST__.setSource('note body', {
      history: 'reset'
    });
  });
  await expect(page.locator('#fixture-result')).toHaveText('note body');
  expect(await page.evaluate(() => ({
    source: window.__URUI_EDITOR_TEST__.getSource(),
    selection: window.__URUI_EDITOR_TEST__.getSelection(),
    note: window.__URUI_NOTE_EDITOR_TEST__.getSource(),
    textDirty: window.uruiFixture.runtime.documents.dirty(
      'text', window.uruiFixture.runtime.documents.active('text').id
    ),
    noteDirty: window.uruiFixture.runtime.documents.dirty(
      'note', window.uruiFixture.runtime.documents.active('note').id
    )
  }))).toEqual({
    source: 'first\nsecond', selection: {start: 6, end: 12},
    note: 'note body', textDirty: true, noteDirty: true
  });
});

test('fixture tabs restore each editor source and selection', async ({page}) => {
  await page.goto('/apps/urui-fixture/');
  await page.evaluate(() => {
    const docs = window.uruiFixture.runtime.documents;
    const first = docs.active('text');
    window.__URUI_EDITOR_TEST__.setSource('first text', {
      history: 'reset', selection: {start: 2, end: 7}
    });
    docs.create('text', {
      text: 'second text', selection: {start: 0, end: 6}
    });
    window.__URUI_STAGE6_FIRST__ = first.id;
  });
  await expect.poll(() => page.evaluate(() => {
    return window.__URUI_EDITOR_TEST__.getSource();
  })).toBe('second text');
  await page.evaluate(() => {
    const docs = window.uruiFixture.runtime.documents;
    docs.select('text', window.__URUI_STAGE6_FIRST__);
  });
  expect(await page.evaluate(() => ({
    source: window.__URUI_EDITOR_TEST__.getSource(),
    selection: window.__URUI_EDITOR_TEST__.getSelection()
  }))).toEqual({source: 'first text', selection: {start: 2, end: 7}});
});

test('fixture shows the shared editor failure alert', async ({page}) => {
  await page.route('**/apps/urui-fixture/ace/ace.js', async route => {
    await route.fulfill({
      status: 200, contentType: 'text/javascript', body: ''
    });
  });
  await page.goto('/apps/urui-fixture/');
  await expect(page.locator('#editor-load-error')).toBeVisible();
  await expect(page.locator('#editor-load-error')).toContainText(
    'Editor unavailable');
  await expect(page.locator('#result-editor-load-error')).toBeVisible();
  await expect(page.locator('#editor')).toBeHidden();
  await expect(page.locator('#result-editor')).toBeHidden();
});
