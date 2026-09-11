const {test, expect} = require('@playwright/test');
const {installBackend} = require('./fixtures/backend.js');

test.beforeEach(async ({context, page}) => {
  await context.addInitScript(() => {
    window.__URUI_BROWSER_TEST__ = {
      acePlatform: 'win',
      keyboardLayout: 'en-US'
    };
  });
  await installBackend(page, {browse: true, render: 'echoed'});
});

test('explicit and system themes preserve complete editor state', async ({
  page
}) => {
  await page.emulateMedia({colorScheme: 'light'});
  await page.goto('/apps/urui-fixture/');
  const base = [
    'digraph themes {',
    ...Array.from({length: 45}, (_, index) => `  node_${index}`),
    '}'
  ].join('\n');
  const edited = base.replace('  node_0', '  Xnode_0');
  await page.evaluate((source) => {
    const adapter = window.__URUI_EDITOR_TEST__;
    adapter.setSource(source, {history: 'reset', notify: false});
    const aceEditor = window.ace.edit(document.querySelector('#editor'));
    aceEditor.session.insert({row: 1, column: 2}, 'X');
    aceEditor.selection.setSelectionRange({
      start: {row: 31, column: 2},
      end: {row: 31, column: 9}
    });
    aceEditor.scrollToLine(31, true, true);
    aceEditor.focus();
  }, base);
  await page.waitForTimeout(100);

  const state = async () => page.evaluate(() => {
    const aceEditor = window.ace.edit(document.querySelector('#editor'));
    const range = aceEditor.selection.getRange();
    return {
      source: aceEditor.getValue(),
      selection: {start: range.start, end: range.end},
      scrollTop: aceEditor.session.getScrollTop(),
      scrollLeft: aceEditor.session.getScrollLeft(),
      revision: aceEditor.session.getUndoManager().getRevision(),
      focused: document.activeElement === aceEditor.textInput.getElement(),
      theme: aceEditor.getTheme()
    };
  });
  const before = await state();
  expect(before.source).toBe(edited);

  await page.evaluate(() => {
    const control = document.querySelector('#theme');
    control.value = 'dark';
    control.dispatchEvent(new Event('change'));
  });
  await expect.poll(async () => (await state()).theme)
    .toBe('ace/theme/monokai');
  expect(await state()).toEqual({...before, theme: 'ace/theme/monokai'});

  await page.evaluate(() => {
    const control = document.querySelector('#theme');
    control.value = 'system';
    control.dispatchEvent(new Event('change'));
  });
  await page.emulateMedia({colorScheme: 'dark'});
  await expect.poll(async () => (await state()).theme)
    .toBe('ace/theme/monokai');
  expect((await state()).source).toBe(edited);

  await page.evaluate(() => {
    const control = document.querySelector('#theme');
    control.value = 'light';
    control.dispatchEvent(new Event('change'));
  });
  await expect.poll(async () => (await state()).theme)
    .toBe('ace/theme/github');
  await page.emulateMedia({colorScheme: 'dark'});
  expect((await state()).theme).toBe('ace/theme/github');

  await page.keyboard.press('Control+Z');
  await expect.poll(async () => (await state()).source).toBe(base);
  await page.keyboard.press('Control+Y');
  await expect.poll(async () => (await state()).source).toBe(edited);
});

test('resize cycles preserve Ace geometry at divider extremes', async ({
  page
}) => {
  await page.setViewportSize({width: 1280, height: 850});
  await page.goto('/apps/urui-fixture/');
  await page.evaluate(() => {
    const aceEditor = window.ace.edit(document.querySelector('#editor'));
    const resize = aceEditor.resize.bind(aceEditor);
    window.__URUI_RESIZES_TEST__ = 0;
    aceEditor.resize = (force) => {
      window.__URUI_RESIZES_TEST__ += 1;
      return resize(force);
    };
    aceEditor.gotoLine(4, 4, false);
  });

  await page.locator('#help').click();
  await expect(page.locator('#help-panel')).toBeVisible();
  await page.locator('#close-help').click();
  expect(await page.evaluate(() => {
    return window.__URUI_RESIZES_TEST__;
  })).toBe(0);

  for (let index = 0; index < 12; index += 1) {
    await page.locator('#splitter').press('ArrowRight');
  }
  for (let index = 0; index < 24; index += 1) {
    await page.locator('#splitter').press('ArrowLeft');
  }
  await expect.poll(() => page.evaluate(() => {
    return getComputedStyle(document.querySelector('#workspace'))
      .getPropertyValue('--editor-width').trim();
  })).toBe('25%');

  let divider = await page.locator('#explorer-resizer').boundingBox();
  await page.mouse.move(divider.x + divider.width / 2, divider.y + 20);
  await page.mouse.down();
  await page.mouse.move(1278, divider.y + 20, {steps: 4});
  await page.mouse.up();
  const maximum = await page.evaluate(() => {
    const workbench = document.querySelector('#workbench');
    return {
      actual: parseFloat(getComputedStyle(workbench)
        .getPropertyValue('--explorer-width')),
      expected: workbench.getBoundingClientRect().width - 10
    };
  });
  expect(Math.abs(maximum.actual - maximum.expected)).toBeLessThan(2);

  divider = await page.locator('#explorer-resizer').boundingBox();
  await page.mouse.move(divider.x + divider.width / 2, divider.y + 20);
  await page.mouse.down();
  await page.mouse.move(2, divider.y + 20, {steps: 4});
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => {
    return parseFloat(getComputedStyle(document.querySelector('#workbench'))
      .getPropertyValue('--explorer-width'));
  })).toBe(180);

  for (let cycle = 0; cycle < 2; cycle += 1) {
    await page.setViewportSize({width: 700, height: 900});
    await page.setViewportSize({width: 1280, height: 850});
  }
  await page.evaluate(() => {
    const aceEditor = window.ace.edit(document.querySelector('#editor'));
    aceEditor.gotoLine(4, 4, false);
    aceEditor.focus();
  });
  await expect.poll(() => page.evaluate(() => {
    const aceEditor = window.ace.edit(document.querySelector('#editor'));
    const host = document.querySelector('#editor').getBoundingClientRect();
    const container = aceEditor.renderer.container.getBoundingClientRect();
    const scroller = aceEditor.renderer.scroller.getBoundingClientRect();
    const cursor = document.querySelector('#editor .ace_cursor')
      .getBoundingClientRect();
    return {
      resizeCount: window.__URUI_RESIZES_TEST__,
      hostWidth: host.width,
      hostHeight: host.height,
      widthDifference: Math.abs(host.width - container.width),
      scrollerInside: scroller.left >= host.left
        && scroller.right <= host.right + 1,
      cursorVisible: cursor.left >= host.left && cursor.left <= host.right
        && cursor.top >= host.top && cursor.top <= host.bottom
    };
  })).toMatchObject({
    resizeCount: expect.any(Number),
    hostWidth: expect.any(Number),
    hostHeight: expect.any(Number),
    cursorVisible: true
  });
  const geometry = await page.evaluate(() => {
    const aceEditor = window.ace.edit(document.querySelector('#editor'));
    const host = document.querySelector('#editor').getBoundingClientRect();
    const container = aceEditor.renderer.container.getBoundingClientRect();
    const scroller = aceEditor.renderer.scroller.getBoundingClientRect();
    return {
      resizeCount: window.__URUI_RESIZES_TEST__,
      hostWidth: host.width,
      hostHeight: host.height,
      widthDifference: Math.abs(host.width - container.width),
      scrollerWidth: scroller.width,
      scrollerInside: scroller.left >= host.left
        && scroller.right <= host.right + 1
    };
  });
  expect(geometry.resizeCount).toBeGreaterThan(20);
  expect(geometry.hostWidth).toBeGreaterThan(100);
  expect(geometry.hostHeight).toBeGreaterThan(100);
  expect(geometry.widthDifference).toBeLessThan(2);
  expect(geometry.scrollerWidth).toBeGreaterThan(50);
  expect(geometry.scrollerInside).toBe(true);
});

test('explorer collapse toggles and persists', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 850});
  await page.goto('/apps/urui-fixture/');
  const collapse = page.getByRole('button', {name: 'Collapse explorer'});
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  await expect(collapse).toHaveText('‹');
  await collapse.click();
  const expand = page.getByRole('button', {name: 'Expand explorer'});
  await expect(expand).toHaveAttribute('aria-expanded', 'false');
  await expect(expand).toHaveText('›');
  await expect(page.locator('#explorer')).toHaveClass(/collapsed/);
  await expect(page.locator('#workbench')).toHaveClass(/explorer-collapsed/);
  await expect(page.locator('#explorer-resizer')).toBeDisabled();
  await expect(page.locator('#explorer-tabs')).toBeHidden();
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('urui-fixture.session.v1'));
    return saved?.explorerOpen;
  })).toBe(false);

  await page.reload();
  await expect(page.getByRole('button', {name: 'Expand explorer'}))
    .toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', {name: 'Expand explorer'}).click();
  await expect(page.getByRole('button', {name: 'Collapse explorer'}))
    .toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#explorer-resizer')).toBeEnabled();
  await expect(page.getByRole('tab', {name: 'Text Files'})).toBeVisible();
});

test('editor exposes label, keyboard focus, and failure semantics', async ({
  page
}) => {
  await page.goto('/apps/urui-fixture/');
  await expect(page.getByRole('region', {name: 'Source'})).toBeVisible();
  const semantics = await page.evaluate(() => {
    const host = document.querySelector('#editor');
    const aceEditor = window.ace.edit(host);
    const input = aceEditor.textInput.getElement();
    input.focus();
    const style = getComputedStyle(host);
    return {
      labelledBy: host.getAttribute('aria-labelledby'),
      describedBy: host.getAttribute('aria-describedby'),
      inputLabelledBy: input.getAttribute('aria-labelledby'),
      inputDescribedBy: input.getAttribute('aria-describedby'),
      inputInvalid: input.getAttribute('aria-invalid'),
      inputTabIndex: input.tabIndex,
      focused: document.activeElement === input,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth
    };
  });
  expect(semantics).toEqual({
    labelledBy: 'text-source-heading',
    describedBy: 'error editor-load-error',
    inputLabelledBy: 'text-source-heading',
    inputDescribedBy: 'error editor-load-error',
    inputInvalid: 'false',
    inputTabIndex: 0,
    focused: true,
    outlineStyle: 'solid',
    outlineWidth: '3px'
  });
  await expect(page.locator('#editor-load-error')).toHaveAttribute(
    'role',
    'alert'
  );
  await expect(page.locator('#error')).toHaveAttribute('role', 'alert');
  await expect(page.getByRole('separator', {
    name: 'Resize editor and preview'
  })).toHaveAttribute('tabindex', '0');
  await expect(page.getByRole('separator', {
    name: 'Resize explorer'
  })).toBeVisible();
});
