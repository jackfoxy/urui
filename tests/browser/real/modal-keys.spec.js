'use strict';

// Keyboard navigation inside Help and Settings, in a real browser.
//
// The contract, identical in every app on this shell:
//
//   Esc                close, and give focus back to what opened it
//   Tab / Shift-Tab    cycle the controls, trapped in the dialog
//   Enter / Space      activate the focused control
//   arrows             move within Theme, Keybindings and Screen format
//   Home / End         first and last option in a group
//   PageUp / PageDown  page the content
//   the opening chord  close it again
//
// Most of that is the browser's own behaviour once two things hold: the
// card is the scroll container and has focus, and each group is a real
// radiogroup or select rather than a row of buttons.  What is asserted
// here is those two, plus the parts urui implements itself.

const {test, expect} = require('@playwright/test');
const {installBackend} = require('./fixtures/backend.js');

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

const focusedId = (page) => page.evaluate(() => document.activeElement?.id);

test('Settings opens on its card, which is the scroll container',
  async ({page}) => {
    await open(page);
    await page.locator('#settings').click();
    await expect(page.locator('#settings-modal')).toBeVisible();
    //  the card, so PageUp and PageDown have something to scroll
    expect(await focusedId(page)).toBe('settings-card');
    const scrollable = await page.evaluate(() => {
      const card = document.querySelector('#settings-card');
      const style = getComputedStyle(card);
      return {
        overflow: style.overflowY,
        bounded: card.getBoundingClientRect().height
          <= window.innerHeight
      };
    });
    expect(scrollable.overflow).toBe('auto');
    expect(scrollable.bounded).toBe(true);
    //  and the close button is the first control a Tab reaches
    await page.keyboard.press('Tab');
    expect(await focusedId(page)).toBe('close-settings');
  });

test('Screen format is a radiogroup the arrows move', async ({page}) => {
  await open(page);
  await page.locator('#settings').click();
  const group = page.locator('.layout-choices');
  await expect(group).toHaveAttribute('role', 'radiogroup');
  await expect(page.locator('#layout-columns')).toHaveAttribute('role', 'radio');

  //  the fixture starts in columns, so that is the checked one and the
  //  only one in the tab order
  await expect(page.locator('#layout-columns'))
    .toHaveAttribute('aria-checked', 'true');
  expect(await page.locator('#layout-rows')
    .evaluate((node) => node.tabIndex)).toBe(-1);

  await page.locator('#layout-columns').focus();
  await page.keyboard.press('ArrowRight');
  //  a radiogroup selects as it moves: nothing to confirm after
  await expect(page.locator('#layout-rows'))
    .toHaveAttribute('aria-checked', 'true');
  expect(await focusedId(page)).toBe('layout-rows');
  await expect(page.locator('#workspace'))
    .toHaveAttribute('data-layout', 'rows');

  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#layout-columns'))
    .toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#workspace'))
    .toHaveAttribute('data-layout', 'columns');
});

test('Theme and Keybindings arrow natively', async ({page}) => {
  await open(page);
  await page.locator('#settings').click();
  //  a select and a radio group; urui adds nothing, and that is the
  //  point -- Screen format was the odd one out
  await expect(page.locator('#theme')).toHaveJSProperty('tagName', 'SELECT');
  await expect(page.locator('#keys-ace')).toHaveAttribute('type', 'radio');
  await expect(page.locator('#keys-vim')).toHaveAttribute('type', 'radio');
  await page.locator('#keys-ace').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#keys-vim')).toBeChecked();
});

test('Escape closes and gives focus back to the opener', async ({page}) => {
  await open(page);
  await page.locator('#settings').click();
  await expect(page.locator('#settings-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings-modal')).toBeHidden();
  expect(await focusedId(page)).toBe('settings');

  await page.locator('#help').click();
  await expect(page.locator('#help-panel')).toBeVisible();
  expect(await focusedId(page)).toBe('editor-help-card');
  await page.keyboard.press('Escape');
  await expect(page.locator('#help-panel')).toBeHidden();
  expect(await focusedId(page)).toBe('help');
});

test('the opening chord closes the dialog it opened', async ({page}) => {
  await open(page);
  //  F2 opened Settings and then did nothing: the dispatcher swallowed
  //  every bound chord behind an open modal
  await page.keyboard.press('F2');
  await expect(page.locator('#settings-modal')).toBeVisible();
  await page.keyboard.press('F2');
  await expect(page.locator('#settings-modal')).toBeHidden();
  expect(await focusedId(page)).toBe('settings');

  await page.keyboard.press('F1');
  await expect(page.locator('#help-panel')).toBeVisible();
  await page.keyboard.press('F1');
  await expect(page.locator('#help-panel')).toBeHidden();
});

test('another app chord stays swallowed behind a modal', async ({page}) => {
  await open(page);
  await page.keyboard.press('F2');
  await expect(page.locator('#settings-modal')).toBeVisible();
  //  Ctrl-Enter echoes in the fixture; behind a modal it must do
  //  nothing at all, and must not close the dialog either
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('#settings-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings-modal')).toBeHidden();
});

test('Tab is trapped inside the dialog', async ({page}) => {
  await open(page);
  await page.locator('#settings').click();
  const inside = async () => page.evaluate(() => {
    return document.querySelector('#settings-modal')
      .contains(document.activeElement);
  });
  for (let press = 0; press < 12; press += 1) {
    await page.keyboard.press('Tab');
    expect(await inside(), `focus left the dialog after ${press + 1} tabs`)
      .toBe(true);
  }
  await page.keyboard.press('Shift+Tab');
  expect(await inside()).toBe(true);
});
