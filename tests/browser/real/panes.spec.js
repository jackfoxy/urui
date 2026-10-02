'use strict';

// The pane model, proved in a real browser against the fixture alone.
//
// Every branch of `$band-item` and every `$tab-source` is declared by
// `urui-fixture-web.hoon`: the reference pane carries a %views level and
// a %label, the editor pane a %documents level with its heading listed
// *after* the tabs and a revealable %controls band, and the result pane
// a heading listed *before* three levels — %documents, %fixed, %dynamic.

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

//  the ids of one pane's bands, in document order
function bandNames(page, pane) {
  return page.evaluate((id) => {
    return Array.from(document.querySelector(`#${id}`).children)
      .filter((node) => node.classList.contains('pane-band'))
      .map((node) => node.dataset.band);
  }, pane);
}

test('every band item and tab source is declared by the fixture', async ({
  page
}) => {
  await open(page);

  //  band order is the layout: the editor's heading is below its tabs
  //  and the result's is above them, out of the same two items
  expect(await bandNames(page, 'explorer')).toEqual(['tabs', 'ship', 'body']);
  expect(await bandNames(page, 'editor-pane'))
    .toEqual(['tabs', 'head', 'controls', 'body']);
  expect(await bandNames(page, 'result-pane'))
    .toEqual(['head', 'controls', 'tabs', 'body']);

  //  %label: the ship, in the reference pane and nowhere else
  await expect(page.locator('.pane-label')).toHaveCount(1);
  await expect(page.locator('#explorer-ship .pane-label'))
    .toHaveText(/^~[a-z-]+$/);
  await expect(page.locator('.app-header .pane-label')).toHaveCount(0);

  //  every source, at the depth its level declares
  const sources = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="tablist"]'))
      .map((strip) => [strip.id, strip.dataset.source, strip.dataset.depth]);
  });
  expect(sources).toEqual([
    ['explorer-view-tabs', 'views', '0'],
    ['editor-pane-document-tabs', 'documents', '0'],
    ['result-pane-document-tabs', 'documents', '0'],
    ['result-pane-view-tabs', 'fixed', '1'],
    ['result-pane-set-tabs', 'dynamic', '2']
  ]);
});

test('a read-only pane shows no add control and no close', async ({page}) => {
  await open(page);

  //  the editor pane is read-write and its level asks for a `+`
  await expect(page.locator('#editor-pane')).toHaveAttribute(
    'data-mode', 'read-write');
  await expect(page.locator('#editor-pane-document-tabs .document-tab-add'))
    .toHaveCount(1);
  await expect(page.locator('#editor-pane-document-tabs .document-tab-close'))
    .not.toHaveCount(0);

  //  the reference pane is read-only: no `+` anywhere inside it, and the
  //  seeded views carry no close control
  await expect(page.locator('#explorer')).toHaveAttribute(
    'data-mode', 'read-only');
  await expect(page.locator('#explorer .document-tab-add')).toHaveCount(0);
  await expect(page.locator('#explorer-view-tabs .document-tab-close'))
    .toHaveCount(0);

  //  a level that asks for no `+` gets none in a read-write pane either
  await expect(page.locator('#result-pane-document-tabs .document-tab-add'))
    .toHaveCount(0);
});

test('a revealed band persists a reload', async ({page}) => {
  await open(page);

  const band = page.locator('#editor-pane-controls');
  const toggle = page.locator('#editor-pane-controls-toggle');
  await expect(band).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  await toggle.click();
  await expect(band).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  //  the record names the band by its own reveal key
  await expect.poll(() => page.evaluate((key) => {
    return JSON.parse(localStorage.getItem(key))?.paneBands?.editorControls;
  }, session)).toBe(false);

  await page.reload();
  await expect(page.locator('#editor-pane-controls')).toBeHidden();
  await expect(page.locator('#editor-pane-controls-toggle'))
    .toHaveAttribute('aria-expanded', 'false');

  //  and revealing it again sticks the same way
  await page.locator('#editor-pane-controls-toggle').click();
  await page.reload();
  await expect(page.locator('#editor-pane-controls')).toBeVisible();
});

test('a depth-2 tab selection persists a reload', async ({page}) => {
  await open(page);

  //  auto-echo off first: an echo on reload would open a *new* note
  //  tab, and the path under a tab that is no longer selected is not
  //  the thing this test is about
  await page.locator('#auto-echo').uncheck();

  //  the note is what the two generated levels are about: one %dynamic
  //  tab per blank-line-separated section
  await page.evaluate(() => {
    window.__URUI_NOTE_EDITOR_TEST__.setSource('alpha\n\nbeta\n\ngamma');
  });
  const sets = page.locator('#result-pane-set-tabs .document-tab');
  await expect(sets).toHaveText(['Part 1', 'Part 2', 'Part 3']);

  //  depth 1 is %fixed and needs no call from the consumer
  await expect(page.locator('#result-pane-view-tabs .document-tab'))
    .toHaveText(['Rendered', 'Messages']);

  await sets.nth(2).click();
  await expect(page.locator('.pane-level-content')).toHaveText('gamma');
  await expect.poll(() => page.evaluate((key) => {
    return JSON.parse(localStorage.getItem(key))?.panePaths?.['result-pane'];
  }, session)).toEqual([expect.anything(), 'rendered', 'part-3']);

  await page.reload();
  await expect(page.locator('#result-pane-set-tabs .document-tab'))
    .toHaveText(['Part 1', 'Part 2', 'Part 3']);
  await expect(page.locator(
    '#result-pane-set-tabs [role="tab"][aria-selected="true"]'
  )).toHaveText('Part 3');
  await expect(page.locator('.pane-level-content')).toHaveText('gamma');

  //  selecting a depth-1 tab drops the path below it
  await page.locator('#result-pane-view-tabs .document-tab').nth(1).click();
  await expect(page.locator('.pane-level-content')).toHaveText('3 section(s)');
});
