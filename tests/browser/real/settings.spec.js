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

//  The settings modal is urui frame furniture: the consumer declares no
//  part of it, so the fixture proves it for every consumer.

test('Settings opens a modal holding theme, keybindings, and format',
  async ({page}) => {
    await open(page);
    const modal = page.locator('#settings-modal');
    const toggle = page.locator('#settings');

    await expect(modal).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    //  Exactly one theme control in the page, and it is urui's.
    await expect(page.locator('#theme')).toHaveCount(1);

    await toggle.click();
    await expect(modal).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#close-settings')).toBeFocused();
    for (const id of ['#theme', '#keys-ace', '#keys-vim',
      '#layout-columns', '#layout-rows']) {
      await expect(page.locator(id)).toBeVisible();
    }
    //  Ace is the default and vim is declared but inert.
    await expect(page.locator('#keys-ace')).toBeChecked();
    await expect(page.locator('#keys-vim')).not.toBeChecked();

    //  Escape closes and restores focus to the button that opened it.
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(toggle).toBeFocused();
  });

test('Settings sits right-justified beside Help', async ({page}) => {
  await open(page);
  const header = await page.locator('.app-header').boundingBox();
  const settings = await page.locator('#settings').boundingBox();
  const help = await page.locator('#help').boundingBox();

  //  Right-justified: hard against the header's right edge, not floating
  //  in the middle of it as a `space-between` third child would.
  const settingsRight = settings.x + settings.width;
  const headerRight = header.x + header.width;
  expect(headerRight - settingsRight).toBeLessThan(header.width / 2);

  //  Immediately left of Help, on the same line, with a gap that reads
  //  as padding rather than as separation.
  expect(settingsRight).toBeLessThanOrEqual(help.x + 1);
  const gap = help.x - settingsRight;
  expect(gap).toBeGreaterThan(0);
  expect(gap).toBeLessThanOrEqual(24);
  expect(Math.round(settings.y)).toBe(Math.round(help.y));
});

test('screen format switches pane orientation and persists a reload',
  async ({page}) => {
    await open(page);
    const workspace = page.locator('#workspace');
    const splitter = page.locator('#splitter');

    //  Columns is the default: editor left of render.
    await expect(workspace).toHaveAttribute('data-layout', 'columns');
    await expect(splitter).toHaveAttribute('aria-orientation', 'vertical');

    const columnBoxes = await page.evaluate(() => {
      const kids = [...document.querySelector('#workspace').children];
      return kids.map((kid) => kid.getBoundingClientRect().top);
    });
    //  Side by side: every child shares a top edge.
    expect(new Set(columnBoxes.map(Math.round)).size).toBe(1);

    await page.locator('#settings').click();
    await page.locator('#layout-rows').click();
    await expect(page.locator('#layout-rows'))
      .toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#layout-columns'))
      .toHaveAttribute('aria-pressed', 'false');
    await expect(workspace).toHaveAttribute('data-layout', 'rows');
    await expect(splitter).toHaveAttribute('aria-orientation', 'horizontal');

    const rowBoxes = await page.evaluate(() => {
      const kids = [...document.querySelector('#workspace').children];
      return kids.map((kid) => kid.getBoundingClientRect());
    });
    //  Stacked: editor sits above the splitter, which sits above render.
    expect(rowBoxes[0].bottom).toBeLessThanOrEqual(rowBoxes[1].top + 1);
    expect(rowBoxes[1].bottom).toBeLessThanOrEqual(rowBoxes[2].top + 1);
    //  The reference pane is still vertical and to the left of both.
    const reference = await page.locator('#explorer').boundingBox();
    expect(reference.x + reference.width).toBeLessThanOrEqual(
      Math.round(rowBoxes[0].left) + 1
    );

    await page.keyboard.press('Escape');
    await page.reload();
    await expect(workspace).toHaveAttribute('data-layout', 'rows');
    await expect(splitter).toHaveAttribute('aria-orientation', 'horizontal');
    await page.locator('#settings').click();
    await expect(page.locator('#layout-rows'))
      .toHaveAttribute('aria-pressed', 'true');
  });

test('each format keeps its own divider position', async ({page}) => {
  await open(page);
  const editorWidth = () => page.evaluate(() => {
    return document.querySelector('#workspace').style
      .getPropertyValue('--editor-width');
  });
  const editorHeight = () => page.evaluate(() => {
    return document.querySelector('#workspace').style
      .getPropertyValue('--editor-height');
  });

  //  Resize in columns, then switch to rows and resize there.
  await page.locator('#splitter').press('ArrowRight');
  const widthAfter = await editorWidth();
  expect(widthAfter).not.toBe('');

  await page.locator('#settings').click();
  await page.locator('#layout-rows').click();
  await page.keyboard.press('Escape');
  //  Arrow keys follow the axis: down grows the editor row.
  await page.locator('#splitter').press('ArrowDown');
  const heightAfter = await editorHeight();
  expect(heightAfter).not.toBe('');

  //  Switching back leaves the column width exactly as it was.
  await page.locator('#settings').click();
  await page.locator('#layout-columns').click();
  await page.keyboard.press('Escape');
  expect(await editorWidth()).toBe(widthAfter);
  expect(await editorHeight()).toBe(heightAfter);
});
