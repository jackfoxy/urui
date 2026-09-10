'use strict';

// The harness's own smoke test: the fixture opens in a real browser and the
// three areas the contract promises are present, in order, with their roles.
// Everything else generic moves here in W4.3.

const {test, expect} = require('@playwright/test');

test('fixture page presents the three areas', async ({page}) => {
  await page.goto('/apps/urui-fixture/');
  await expect(page).toHaveTitle('urui fixture');

  const panes = page.locator(
    '#workbench > .explorer-pane, #workspace > section.pane');
  await expect(panes).toHaveCount(3);
  await expect(panes.nth(0)).toHaveAttribute('id', 'explorer');
  await expect(panes.nth(1)).toHaveAttribute('id', 'editor-pane');
  await expect(panes.nth(2)).toHaveAttribute('id', 'result-pane');

  await expect(panes.nth(0)).toHaveAttribute('data-role', 'reference');
  await expect(panes.nth(1)).toHaveAttribute('data-role', 'editor');
  await expect(panes.nth(2)).toHaveAttribute('data-role', 'result');

  await expect(page.locator('#explorer-tabs')).toHaveAttribute(
    'role', 'tablist');
  await expect(page.locator('.document-tabs')).toHaveCount(2);
  await expect(page.locator('[role="separator"]')).toHaveCount(2);
  await expect(page.locator('#help-panel')).toHaveAttribute('role', 'dialog');
  await expect(page.locator('#clay-error-modal')).toHaveAttribute(
    'role', 'dialog');
  await expect(page.locator('#file-context-menu')).toHaveAttribute(
    'role', 'menu');

  //  area 3 has no default: the fixture supplied this body itself
  await expect(page.locator('#fixture-result')).toHaveCount(1);
  await expect(page.locator('#result-editor')).toHaveAttribute(
    'data-mode', 'ace/mode/text');
});

test('fixture serves its own script and stylesheet', async ({page}) => {
  const script = await page.request.get('/apps/urui-fixture/app.js');
  const style = await page.request.get('/apps/urui-fixture/app.css');
  expect(script.status()).toBe(200);
  expect(style.status()).toBe(200);
  expect(await style.text()).toContain('.fixture-result');
});
