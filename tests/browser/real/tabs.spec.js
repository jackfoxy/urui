const {test, expect} = require('@playwright/test');
const {installBackend} = require('./fixtures/backend.js');

function renderedSvg(title) {
  return [
    '<note xmlns="http://www.w3.org/2000/note" viewBox="0 0 10 10">',
    `<title>${title}</title><circle cx="5" cy="5" r="4"/></note>`
  ].join('');
}

const dotSources = {
  'left/txt': 'digraph left { A -> B }',
  'menu/txt': 'digraph menu { C -> D }'
};

async function installRoutes(page, state) {
  await installBackend(page, {
    docs: {
      index: '<html><title>Docs</title></html>',
      pagesGlob: '**/docs/d/**',
      pages: '<html><title>Graph Viz > Users Guide</title></html>'
    },
    browse: ({kind, path}) => {
      const leaf = kind === 'text' ? 'txt' : 'md';
      let children = [];
      if (!path) children = kind === 'text' ? ['left', 'menu'] : ['preview'];
      else if (!path.endsWith(`/${leaf}`)) children = [leaf];
      return {file: path.endsWith(`/${leaf}`), children};
    },
    textLoad: (path) => {
      state.textLoads.push(path);
      return dotSources[path];
    },
    noteLoad: () => {
      state.noteLoads += 1;
      return renderedSvg('Loaded file');
    },
    save: ({body, request}) => {
      state.saves.push({
        url: request.url(),
        headers: request.headers(),
        body
      });
    },
    render: (source, request) => {
      state.renders.push(request.postData());
      return renderedSvg(`Render ${state.renders.length}`);
    }
  });
}

function tabControl(page, kind, label) {
  return page.locator(`#${kind}-document-tabs .document-tab-control`)
    .filter({has: page.getByRole('tab', {name: label, exact: true})});
}

async function useStoredSession(page) {
  await page.addInitScript(() => {
    window.__URUI_BROWSER_TEST__ = {
      acePlatform: 'win',
      keyboardLayout: 'en-US'
    };
    if (!localStorage.getItem('urui-fixture.session.v1')) {
      localStorage.setItem('urui-fixture.session.v1', JSON.stringify({
        version: 1,
        source: 'digraph initial {}',
        paneWidth: 44,
        preferences: {autoEcho: false, theme: 'system'}
      }));
    }
  });
}

test('Text tabs focus, render conditionally, save, and guard close', async ({
  page
}) => {
  const state = {textLoads: [], noteLoads: 0, saves: [], renders: []};
  await installRoutes(page, state);
  await useStoredSession(page);
  await page.goto('/apps/urui-fixture/');
  await expect(page.locator('[data-path="left/txt"]')).toBeVisible();
  await expect(page.locator('#close-text-files')).toHaveCount(0);
  await expect(page.locator('#close-note-files')).toHaveCount(0);
  const initialTabCount = await page.locator(
    '#text-document-tabs [role="tab"]'
  ).count();
  await page.getByRole('button', {name: 'Add empty Text tab'}).click();
  await expect(page.locator('#text-document-tabs [role="tab"]'))
    .toHaveCount(initialTabCount + 1);
  await expect.poll(() => page.evaluate(() => {
    return window.__URUI_EDITOR_TEST__.getSource();
  })).toBe('');
  const addedTab = page.locator(
    '#text-document-tabs [role="tab"][aria-selected="true"]'
  );
  await expect(addedTab).toHaveText('Untitled');
  await addedTab.locator('..').locator('.document-tab-close').click();
  await expect(page.locator('#text-document-tabs [role="tab"]'))
    .toHaveCount(initialTabCount);

  await page.locator('[data-path="left/txt"]').click();
  await page.locator('#echo').click();
  await expect.poll(() => state.renders.length).toBe(1);
  await expect(page.locator('#fixture-result')).toContainText('Render 1');
  await expect(tabControl(page, 'note', 'left.note')
    .locator('.document-tab-close')).toHaveText('O');
  page.once('dialog', (dialog) => dialog.accept('rendered/output'));
  await page.evaluate(() => document.querySelector('#save-note').click());
  await expect.poll(() => state.saves.length).toBe(1);
  await expect(tabControl(page, 'note', 'output')
    .locator('.document-tab-close')).toHaveText('X');
  await page.locator('[data-path="menu/txt"]').click();
  await expect(page.getByRole('tab', {name: 'menu.text'}))
    .toHaveAttribute('aria-selected', 'true');
  expect(state.renders).toHaveLength(1);
  await expect(page.locator('#fixture-result')).toContainText('Render 1');

  await page.locator('[data-path="left/txt"]').click();
  expect(state.textLoads).toEqual(['left/txt', 'menu/txt']);
  await expect(page.getByRole('tab', {name: 'left.text'}))
    .toHaveAttribute('aria-selected', 'true');

  await page.evaluate(() => {
    const editor = window.__URUI_EDITOR_TEST__;
    editor.replaceRange(editor.getSource().length, editor.getSource().length,
      '\n// changed');
  });
  await expect(tabControl(page, 'text', 'left.text')
    .locator('.document-tab-close')).toHaveText('O');

  await page.evaluate(() => document.querySelector('#save-text').click());
  await expect.poll(() => state.saves.length).toBe(2);
  expect(state.saves[1].headers['x-urui-fixture-path']).toBe('left/txt');
  expect(state.saves[1].headers['x-urui-fixture-overwrite']).toBe('true');
  await expect(tabControl(page, 'text', 'left.text')
    .locator('.document-tab-close')).toHaveText('X');

  await page.evaluate(() => {
    const editor = window.__URUI_EDITOR_TEST__;
    editor.replaceRange(editor.getSource().length, editor.getSource().length,
      '\n// dirty');
  });
  page.once('dialog', (dialog) => dialog.dismiss());
  await tabControl(page, 'text', 'left.text')
    .locator('.document-tab-close').click();
  await expect(page.getByRole('tab', {name: 'left.text'})).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await tabControl(page, 'text', 'left.text')
    .locator('.document-tab-close').click();
  await expect(page.getByRole('tab', {name: 'left.text'})).toHaveCount(0);

  for (const label of ['menu.text', 'Untitled']) {
    await tabControl(page, 'text', label)
      .locator('.document-tab-close').click();
  }
  await expect(page.getByRole('tab', {name: 'Untitled'})).toHaveCount(1);
  await expect(page.getByRole('tab', {name: 'Untitled'}))
    .toHaveAttribute('aria-selected', 'true');
});

test('tab strips show thin horizontal scrollbars only on overflow', async ({
  page
}) => {
  const state = {textLoads: [], noteLoads: 0, saves: [], renders: []};
  await installRoutes(page, state);
  await useStoredSession(page);
  await page.goto('/apps/urui-fixture/');
  const metrics = await page.evaluate(() => {
    const selectors = [
      '#explorer-tabs',
      '#text-document-tabs',
      '#note-document-tabs'
    ];
    return selectors.map((selector) => {
      const strip = document.querySelector(selector);
      const initialOverflow = strip.scrollWidth > strip.clientWidth;
      const source = strip.firstElementChild;
      let copies = 0;
      while (strip.scrollWidth <= strip.clientWidth && copies < 20) {
        const clone = source.cloneNode(true);
        clone.dataset.scrollTest = 'true';
        clone.removeAttribute('id');
        clone.querySelectorAll('[id]').forEach((node) => {
          node.removeAttribute('id');
        });
        strip.append(clone);
        copies += 1;
      }
      const overflow = strip.scrollWidth > strip.clientWidth;
      const overflowX = getComputedStyle(strip).overflowX;
      const scrollbarHeight = parseFloat(
        getComputedStyle(strip, '::-webkit-scrollbar').height
      );
      strip.querySelectorAll('[data-scroll-test]').forEach((node) => {
        node.remove();
      });
      return {
        initialOverflow,
        overflow,
        overflowX,
        restoredOverflow: strip.scrollWidth > strip.clientWidth,
        scrollbarHeight
      };
    });
  });
  for (const strip of metrics) {
    expect(strip.initialOverflow).toBe(false);
    expect(strip.overflow).toBe(true);
    expect(strip.overflowX).toBe('auto');
    expect(strip.restoredOverflow).toBe(false);
    expect(strip.scrollbarHeight).toBeGreaterThan(0);
    expect(strip.scrollbarHeight).toBeLessThanOrEqual(6);
  }
});

test('Add Ref creates persistent, synced, read-only Text and Note tabs', async ({
  page
}) => {
  const state = {textLoads: [], noteLoads: 0, saves: [], renders: []};
  await installRoutes(page, state);
  await useStoredSession(page);
  await page.goto('/apps/urui-fixture/');

  const addDotRef = page.locator('#add-text-ref');
  await expect(addDotRef).toBeEnabled();
  await addDotRef.click();
  await expect(addDotRef).toBeDisabled();
  const dotRef = page.locator('#explorer-tabs .ref-tab').filter({
    hasText: 'Untitled'
  });
  await expect(dotRef).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.ref-source'))
    .toHaveText('digraph initial {}');

  await page.evaluate(() => {
    const editor = window.__URUI_EDITOR_TEST__;
    editor.replaceRange(editor.getSource().length, editor.getSource().length,
      '\n// synced reference');
  });
  await expect(page.locator('.ref-source'))
    .toContainText('// synced reference');

  page.once('dialog', (dialog) => dialog.accept());
  await tabControl(page, 'text', 'Untitled')
    .locator('.document-tab-close').click();
  await expect(dotRef).toBeVisible();
  await page.waitForTimeout(200);
  await page.reload();
  await expect(page.locator('.ref-source'))
    .toContainText('// synced reference');

  await page.locator('#echo').click();
  await expect.poll(() => state.renders.length).toBeGreaterThan(0);
  const addSvgRef = page.locator('#add-note-ref');
  await expect(addSvgRef).toBeEnabled();
  await addSvgRef.click();
  await expect(addSvgRef).toBeDisabled();
  await expect(page.locator('.ref-source').last())
    .toContainText(`<title>Render ${state.renders.length}</title>`);

  const before = state.renders.length;
  await page.locator('#echo').click();
  await expect.poll(() => state.renders.length).toBe(before + 1);
  await expect(page.locator('.ref-source').last())
    .toContainText(`<title>Render ${before + 1}</title>`);
  await page.locator('.ref-tab-close').last().click();
  await expect(addSvgRef).toBeEnabled();
});

test('tabs stay draggable; only an available Ref drops on the explorer',
  async ({page}) => {
  const state = {textLoads: [], noteLoads: 0, saves: [], renders: []};
  await installRoutes(page, state);
  await useStoredSession(page);
  await page.goto('/apps/urui-fixture/');

  const dotTab = tabControl(page, 'text', 'Untitled');
  await expect.poll(() => dotTab.evaluate((node) => node.draggable))
    .toBe(true);
  await dotTab.dragTo(page.locator('#explorer-tabs'));
  await expect(page.locator('#explorer-tabs .ref-tab')).toHaveText('Untitled');
  await expect(page.locator('#add-text-ref')).toBeDisabled();

  await expect.poll(() => dotTab.evaluate((node) => node.draggable))
    .toBe(true);
  await dotTab.dragTo(page.locator('#explorer-tabs'));
  await expect(page.locator('#explorer-tabs .ref-tab')).toHaveCount(1);

  await page.getByRole('button', {name: 'Add empty Text tab'}).click();
  const emptyTab = tabControl(page, 'text', 'Untitled').last();
  await expect(page.locator('#add-text-ref')).toBeDisabled();
  await expect.poll(() => emptyTab.evaluate((node) => node.draggable))
    .toBe(true);
  await emptyTab.dragTo(page.locator('#explorer'));
  await expect(page.locator('#explorer-tabs .ref-tab')).toHaveCount(1);

  await dotTab.first().locator('.document-tab').click();
  await expect(page.locator('#add-note-ref')).toBeDisabled();
  await page.locator('#echo').click();
  await expect.poll(() => state.renders.length).toBe(1);
  const svgTab = tabControl(page, 'note', 'Preview');
  await expect.poll(() => svgTab.evaluate((node) => node.draggable))
    .toBe(true);
  await svgTab.dragTo(page.locator('#explorer'));
  await expect(page.locator('#explorer-tabs .ref-tab'))
    .toHaveCount(2);
  await expect(page.locator('#add-note-ref')).toBeDisabled();
});

test('Text, Note, and explorer tab order and content persist', async ({page}) => {
  const state = {textLoads: [], noteLoads: 0, saves: [], renders: []};
  await installRoutes(page, state);
  await useStoredSession(page);
  await page.goto('/apps/urui-fixture/');
  await expect(page.locator('[data-path="left/txt"]')).toBeVisible();
  await page.locator('[data-path="left/txt"]').click();
  await page.locator('[data-path="menu/txt"]').click();

  await page.evaluate(() => {
    const autoEcho = document.querySelector('#auto-echo');
    autoEcho.checked = true;
    autoEcho.dispatchEvent(new Event('change'));
  });
  await expect.poll(() => state.renders.length).toBeGreaterThan(0);
  const rendersBeforeLeft = state.renders.length;
  await page.getByRole('tab', {name: 'left.text'}).click();
  await expect.poll(() => state.renders.length).toBe(rendersBeforeLeft + 1);
  const rendersBeforeMenu = state.renders.length;
  await page.getByRole('tab', {name: 'menu.text'}).click();
  await expect.poll(() => state.renders.length).toBe(rendersBeforeMenu + 1);
  await page.evaluate(() => {
    const autoEcho = document.querySelector('#auto-echo');
    autoEcho.checked = false;
    autoEcho.dispatchEvent(new Event('change'));
  });

  await page.locator('#note-files-tab').click();
  await expect(page.locator('[data-path="preview/md"]')).toBeVisible();
  await page.locator('[data-path="preview/md"]').click();
  await expect(page.getByRole('tab', {name: 'preview.note'}))
    .toHaveAttribute('aria-selected', 'true');
  expect(state.renders).toHaveLength(rendersBeforeMenu + 1);
  await expect(page.locator('#auto-echo')).not.toBeChecked();

  await tabControl(page, 'text', 'menu.text').dragTo(
    tabControl(page, 'text', 'left.text'),
    {targetPosition: {x: 1, y: 10}}
  );
  await tabControl(page, 'note', 'preview.note').dragTo(
    tabControl(page, 'note', 'left.note'),
    {targetPosition: {x: 1, y: 10}}
  );

  await page.locator('#help').click();
  await page.getByRole('link', {name: 'Users Guide'}).click();
  await expect(page.getByRole('tab', {name: 'Users Guide'})).toBeVisible();
  await expect(page.getByRole('tab', {name: 'Users Guide'})
    .locator('..').locator('.docs-tab-close')).toHaveText('X');
  const tabHeights = await page.evaluate(() => {
    const explorerTabs = document.querySelector('#explorer-tabs');
    const referenceTab = document.querySelector('.docs-tab');
    const referenceControl = referenceTab.parentElement;
    const labelRange = document.createRange();
    labelRange.selectNodeContents(referenceTab);
    const labelBounds = labelRange.getBoundingClientRect();
    const controlBounds = referenceControl.getBoundingClientRect();
    const permanentTab = document.querySelector('#text-files-tab');
    const permanentRange = document.createRange();
    permanentRange.selectNodeContents(permanentTab);
    const permanentLabel = permanentRange.getBoundingClientRect();
    const permanentControl = permanentTab.getBoundingClientRect();
    return {
      explorer: explorerTabs.getBoundingClientRect().height,
      explorerOverflow: explorerTabs.scrollWidth > explorerTabs.clientWidth,
      documents: document.querySelector('#text-document-tabs')
        .getBoundingClientRect().height,
      reference: document.querySelector('.docs-tab-control')
        .getBoundingClientRect().height,
      editor: document.querySelector(
        '#text-document-tabs .document-tab-control'
      ).getBoundingClientRect().height,
      labelCenter: labelBounds.left + labelBounds.width / 2,
      controlCenter: controlBounds.left + controlBounds.width / 2,
      permanentLabelCenter:
        permanentLabel.top + permanentLabel.height / 2,
      permanentControlCenter:
        permanentControl.top + permanentControl.height / 2
    };
  });
  expect(tabHeights.explorerOverflow).toBe(true);
  expect(Math.abs(
    tabHeights.explorer - tabHeights.documents
  )).toBeLessThanOrEqual(1);
  expect(Math.abs(
    tabHeights.reference - tabHeights.editor
  )).toBeLessThanOrEqual(1);
  expect(Math.abs(
    tabHeights.labelCenter - tabHeights.controlCenter
  )).toBeLessThanOrEqual(1);
  expect(Math.abs(
    tabHeights.permanentLabelCenter - tabHeights.permanentControlCenter
  )).toBeLessThanOrEqual(1);
  await page.locator('#note-files-tab').locator('..').dragTo(
    page.locator('#text-files-tab').locator('..'),
    {targetPosition: {x: 1, y: 10}}
  );
  await page.getByRole('tab', {name: 'Users Guide'}).locator('..').dragTo(
    page.locator('#note-files-tab').locator('..'),
    {targetPosition: {x: 1, y: 10}}
  );

  await page.getByRole('tab', {name: 'menu.text'}).click();
  await page.evaluate(() => {
    const editor = window.__URUI_EDITOR_TEST__;
    editor.replaceRange(editor.getSource().length, editor.getSource().length,
      '\n// persisted dirty');
  });
  await page.getByRole('tab', {name: 'preview.note'}).click();
  await page.waitForTimeout(250);

  const dotOrder = await page.locator('#text-document-tabs .document-tab')
    .allTextContents();
  const svgOrder = await page.locator('#note-document-tabs .document-tab')
    .allTextContents();
  const explorerOrder = await page.locator('#explorer-tabs [role="tab"]')
    .allTextContents();
  await page.reload();

  await expect(page.getByRole('tab', {name: 'menu.text'}))
    .toHaveAttribute('aria-selected', 'true');
  expect(await page.locator('#text-document-tabs .document-tab')
    .allTextContents()).toEqual(dotOrder);
  expect(await page.locator('#note-document-tabs .document-tab')
    .allTextContents()).toEqual(svgOrder);
  expect(await page.locator('#explorer-tabs [role="tab"]')
    .allTextContents()).toEqual(explorerOrder);
  await expect(tabControl(page, 'text', 'menu.text')
    .locator('.document-tab-close')).toHaveText('O');
  await expect(page.locator('#fixture-result')).toContainText('Loaded file');
});
