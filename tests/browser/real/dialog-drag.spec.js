'use strict';

// Settings and Help move by their header.
//
// A dialog covers whatever is behind it, and the thing a user wants to
// compare it against is often exactly there. Dragging is the escape.
//
// The card is centred by its backdrop's grid, so it moves by transform:
// nothing else about it — the height bound, the scrolling, the focus
// trap — has to know. What is asserted here is that it moves, that it
// cannot be dragged out of reach, that the header's buttons still work,
// and that closing it puts it back.

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

async function open(page, dialog = 'settings') {
  await installBackend(page, {browse: true, render: '<pre>echoed</pre>'});
  await page.goto('/apps/urui-fixture/');
  await expect(page.locator('#editor-pane-document-tabs .document-tab'))
    .not.toHaveCount(0);
  await page.locator(`#${dialog}`).click();
  const card = page.locator(
    dialog === 'settings' ? '#settings-card' : '#editor-help-card'
  );
  await expect(card).toBeVisible();
  return card;
}

const box = async (card) => card.boundingBox();

async function dragHeader(page, card, byX, byY) {
  const header = card.locator('.pane-header');
  const from = await header.boundingBox();
  //  a point on the header clear of its title and its close button
  const start = {x: from.x + from.width * 0.45, y: from.y + from.height / 2};
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  //  more than one move: a single jump can be coalesced
  await page.mouse.move(start.x + byX / 2, start.y + byY / 2);
  await page.mouse.move(start.x + byX, start.y + byY);
  await page.mouse.up();
}

test('Settings follows the pointer from its header', async ({page}) => {
  const card = await open(page, 'settings');
  const before = await box(card);
  await dragHeader(page, card, 120, 70);
  const after = await box(card);
  expect(Math.round(after.x - before.x)).toBeGreaterThan(100);
  expect(Math.round(after.y - before.y)).toBeGreaterThan(50);
  //  moved, not resized
  expect(Math.round(after.width)).toBe(Math.round(before.width));
});

test('Help moves too, and the header marks itself as a handle',
  async ({page}) => {
    const card = await open(page, 'help');
    await expect(card).toHaveClass(/is-draggable/);
    await expect(card.locator('.pane-header')).toHaveCSS('cursor', 'move');
    const before = await box(card);
    await dragHeader(page, card, -90, 60);
    const after = await box(card);
    expect(Math.round(after.x - before.x)).toBeLessThan(-70);
  });

test('it cannot be dragged out of reach', async ({page}) => {
  const card = await open(page, 'settings');
  await dragHeader(page, card, 5000, 5000);
  const after = await box(card);
  const size = page.viewportSize();
  //  still overlapping the viewport, by at least the clamp's margin
  expect(after.x).toBeLessThan(size.width);
  expect(after.y).toBeLessThan(size.height);
  expect(after.x + after.width).toBeGreaterThan(0);
  expect(after.y + after.height).toBeGreaterThan(0);
});

test('the close button still closes, mid-header-drag or not',
  async ({page}) => {
    const card = await open(page, 'settings');
    await dragHeader(page, card, 60, 40);
    //  a click on Close is not swallowed by the handle around it
    await page.locator('#close-settings').click();
    await expect(page.locator('#settings-modal')).toBeHidden();
  });

test('double-clicking the header recentres it', async ({page}) => {
  const card = await open(page, 'settings');
  const before = await box(card);
  await dragHeader(page, card, 140, 80);
  expect((await box(card)).x).not.toBe(before.x);
  const header = card.locator('.pane-header');
  const spot = await header.boundingBox();
  await page.mouse.dblclick(
    spot.x + spot.width * 0.45, spot.y + spot.height / 2
  );
  const after = await box(card);
  expect(Math.round(after.x)).toBe(Math.round(before.x));
  expect(Math.round(after.y)).toBe(Math.round(before.y));
});

test('reopening a dialog brings it back to the middle', async ({page}) => {
  const card = await open(page, 'settings');
  const before = await box(card);
  await dragHeader(page, card, 150, 90);
  expect((await box(card)).x).not.toBe(before.x);
  //  a remembered position can land off-screen after a resize, so a
  //  dialog always opens centred
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings-modal')).toBeHidden();
  await page.locator('#settings').click();
  const after = await box(card);
  expect(Math.round(after.x)).toBe(Math.round(before.x));
  expect(Math.round(after.y)).toBe(Math.round(before.y));
});

test('a moved dialog still traps Tab and still scrolls', async ({page}) => {
  const card = await open(page, 'settings');
  await dragHeader(page, card, 100, 60);
  //  the card is still the scroll container
  await expect(card).toHaveCSS('overflow-y', 'auto');
  //  and focus is still trapped inside the dialog
  const inside = () => page.evaluate(() => {
    return document.querySelector('#settings-modal')
      .contains(document.activeElement);
  });
  for (let press = 0; press < 8; press += 1) {
    await page.keyboard.press('Tab');
    expect(await inside(), `focus left after ${press + 1} tabs`).toBe(true);
  }
});
