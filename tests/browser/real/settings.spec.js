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
    //  Ace is the default; vim is live and proved in vim-keybindings.
    await expect(page.locator('#keys-ace')).toBeChecked();
    await expect(page.locator('#keys-vim')).not.toBeChecked();
    await expect(page.locator('#keys-ace')).toBeEnabled();
    await expect(page.locator('#keys-vim')).toBeEnabled();

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

//  `layout` is the consumer's starting format.  The fixture declares
//  columns, so the rows case rewrites the served config: this proves the
//  runtime reads the field, and urui-shell's hoon suite proves the page
//  is drawn in it.
test('a configured screen format starts a fresh session, a saved one wins',
  async ({page}) => {
    await page.route('**/apps/urui-fixture/app.js', async (route) => {
      const response = await route.fetch();
      const body = (await response.text())
        .replace('"layout":"columns"', '"layout":"rows"');
      await route.fulfill({response, body});
    });
    await open(page);
    const workspace = page.locator('#workspace');
    await expect(workspace).toHaveAttribute('data-layout', 'rows');
    await expect(page.locator('#splitter'))
      .toHaveAttribute('aria-orientation', 'horizontal');

    await page.locator('#settings').click();
    await page.locator('#layout-columns').click();
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(workspace).toHaveAttribute('data-layout', 'columns');
  });

test('the result pane collapses to its heading in either format',
  async ({page}) => {
    await open(page);
    const workspace = page.locator('#workspace');
    const pane = page.locator('#result-pane');
    const control = page.locator('#result-collapse');
    const splitter = page.locator('#splitter');
    const editorWidth = () => page.evaluate(() => {
      return document.querySelector('#workspace').style
        .getPropertyValue('--editor-width');
    });

    //  The control is the last action in the result heading.
    await expect(control).toHaveCount(1);
    await expect(page.locator('#result-pane-head .pane-actions > :last-child'))
      .toHaveId('result-collapse');
    await expect(control).toHaveAttribute('aria-expanded', 'true');
    await expect(control).toHaveAttribute('aria-label',
      'Collapse Fixture result');
    await expect(control).toHaveText('›');

    await splitter.press('ArrowRight');
    const width = await editorWidth();

    //  Columns: a rail holding only the control, the splitter idle.
    await control.click();
    await expect(control).toHaveAttribute('aria-expanded', 'false');
    await expect(control).toHaveAttribute('aria-label',
      'Expand Fixture result');
    await expect(control).toHaveText('‹');
    await expect(pane).toHaveClass(/collapsed/);
    await expect(workspace).toHaveClass(/result-collapsed/);
    await expect(splitter).toHaveClass(/inactive/);
    await expect(page.locator('#result-pane-tabs')).toBeHidden();
    await expect(page.locator('#result-status')).toBeHidden();
    const rail = await pane.boundingBox();
    expect(rail.width).toBeLessThan(64);
    await splitter.press('ArrowRight');
    expect(await editorWidth()).toBe(width);

    //  Rows: the same state, now a strip under the editor.
    await page.locator('#settings').click();
    await page.locator('#layout-rows').click();
    await page.keyboard.press('Escape');
    await expect(control).toHaveText('⌃');
    await expect(pane).toHaveClass(/collapsed/);
    await expect(page.locator('#result-status')).toBeVisible();
    const strip = await pane.boundingBox();
    const editor = await page.locator('#editor-pane').boundingBox();
    expect(strip.height).toBeLessThan(editor.height / 4);
    expect(strip.y).toBeGreaterThanOrEqual(editor.y + editor.height - 1);

    //  The state survives a reload, and expanding restores the divider.
    await page.reload();
    await expect(control).toHaveAttribute('aria-expanded', 'false');
    await expect(pane).toHaveClass(/collapsed/);
    await control.click();
    await expect(control).toHaveText('⌄');
    await expect(pane).not.toHaveClass(/collapsed/);
    await expect(splitter).not.toHaveClass(/inactive/);
    await page.locator('#settings').click();
    await page.locator('#layout-columns').click();
    await page.keyboard.press('Escape');
    expect(await editorWidth()).toBe(width);
  });
