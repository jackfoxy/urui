'use strict';

// The key badge urui appends to a header control.
//
// Two consumers had styled this themselves, back when each wrote the
// <kbd> into its own markup by hand; the third had never had a badge
// and so had never needed the rule. When Phase 1 made the badge urui's,
// that app got an unstyled one hard against its label — "SettingsF2".
// The element and its styling belong to the same owner, and this is
// what holds them together.
//
// The gap is a margin, not a character, so `textContent` reads
// "SettingsF2" in every app; what must match is the computed style.

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

test('a header control carries its binding as a spaced badge',
  async ({page}) => {
    await open(page);
    for (const [id, binding] of [['settings', 'F2'], ['help', 'F1']]) {
      const badge = page.locator(`#${id} kbd`);
      await expect(badge).toHaveText(binding);
      //  the space between label and key is urui's margin
      await expect(badge).not.toHaveCSS('margin-left', '0px');
      //  and the key is set smaller than the label it follows
      const sizes = await page.locator(`#${id}`).evaluate((node) => {
        const label = node.querySelector('span');
        const key = node.querySelector('kbd');
        return [
          Number.parseFloat(getComputedStyle(label).fontSize),
          Number.parseFloat(getComputedStyle(key).fontSize)
        ];
      });
      expect(sizes[1]).toBeLessThan(sizes[0]);
    }
  });

test('a pane control carries no badge, only the binding in its tooltip',
  async ({page}) => {
    await open(page);
    //  pane rows are tight and several to a line; a <kbd> after the
    //  label widened them unevenly
    for (const id of ['text-save', 'note-save']) {
      const control = page.locator(`#${id}`);
      if (!await control.count()) continue;
      await expect(control.locator('kbd')).toHaveCount(0);
      await expect(control).toHaveAttribute('aria-keyshortcuts', /\S/);
      await expect(control).toHaveAttribute('title', /Ctrl-/);
    }
  });
