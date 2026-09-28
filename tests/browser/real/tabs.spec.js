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
    browse: () => [['left', 'txt'], ['menu', 'txt'], ['preview', 'md']],
    textLoad: (path) => {
      state.textLoads.push(path);
      return dotSources[path];
    },
    noteLoad: () => {
      state.noteLoads += 1;
      return renderedSvg('Loaded file');
    },
    save: ({path, body, overwrite, base}) => {
      state.saves.push({path, body, overwrite, base});
    },
    render: (source, request) => {
      state.renders.push(request.postData());
      return renderedSvg(`Render ${state.renders.length}`);
    }
  });
}

//  a store's strip is the one its %documents level declared, and the
//  fixture puts the text store in the editor pane and the note store in
//  the result pane
const stripFor = (kind) => {
  return kind === 'text'
    ? '#editor-pane-document-tabs'
    : '#result-pane-document-tabs';
};

function tabControl(page, kind, label) {
  return page.locator(`${stripFor(kind)} .document-tab-control`)
    .filter({has: page.getByRole('tab', {name: label, exact: true})});
}

//  urui's confirm dialog, answered
async function answer(page, accept) {
  await expect(page.locator('#urui-confirm')).toBeVisible();
  await page.locator(accept ? '#urui-confirm-ok' : '#urui-confirm-cancel')
    .click();
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
        textTabs: [{
          id: 'text-1', path: null, draft: 'Untitled',
          text: 'digraph initial {}'
        }],
        activeTextTabId: 'text-1',
        nextTextTab: 2,
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
    '#editor-pane-document-tabs [role="tab"]'
  ).count();
  await page.getByRole('button', {name: 'Add empty Text tab'}).click();
  await expect(page.locator('#editor-pane-document-tabs [role="tab"]'))
    .toHaveCount(initialTabCount + 1);
  //  a new tab starts from the store's starter text
  await expect.poll(() => page.evaluate(() => {
    return window.__URUI_EDITOR_TEST__.getSource();
  })).toBe('fixture source');
  const addedTab = page.locator(
    '#editor-pane-document-tabs [role="tab"][aria-selected="true"]'
  );
  await expect(addedTab).toHaveText('Untitled 2');
  await addedTab.locator('..').locator('.document-tab-close').click();
  await expect(page.locator('#editor-pane-document-tabs [role="tab"]'))
    .toHaveCount(initialTabCount);

  await page.locator('[data-path="left/txt"]').click();
  await page.locator('#echo').click();
  await expect.poll(() => state.renders.length).toBe(1);
  await expect(page.locator('#fixture-result')).toContainText('Render 1');
  await expect(tabControl(page, 'note', 'left.note')
    .locator('.document-tab-close')).toHaveText('●');
  await page.locator('#note-save').click();
  await page.locator('#urui-file-dialog-path').fill('rendered/output');
  await page.locator('#urui-file-dialog-confirm').click();
  await expect.poll(() => state.saves.length).toBe(1);
  expect(state.saves[0].path).toBe('rendered/output/md');
  await expect(tabControl(page, 'note', 'output.note')
    .locator('.document-tab-close')).toHaveText('×');
  await page.locator('[data-path="menu/txt"]').click();
  await expect(page.getByRole('tab', {name: 'menu.text'}))
    .toHaveAttribute('aria-selected', 'true');
  expect(state.renders).toHaveLength(1);
  await expect(page.locator('#fixture-result')).toContainText('Render 1');

  //  reopening a clean tab reloads it from Clay
  await page.locator('[data-path="left/txt"]').click();
  await expect(page.getByRole('tab', {name: 'left.text'}))
    .toHaveAttribute('aria-selected', 'true');
  expect(state.textLoads).toEqual(['left/txt', 'menu/txt', 'left/txt']);

  await page.evaluate(() => {
    const editor = window.__URUI_EDITOR_TEST__;
    editor.replaceRange(editor.getSource().length, editor.getSource().length,
      '\n// changed');
  });
  await expect(tabControl(page, 'text', 'left.text')
    .locator('.document-tab-close')).toHaveText('●');

  await page.locator('#text-save').click();
  await expect.poll(() => state.saves.length).toBe(2);
  expect(state.saves[1].path).toBe('left/txt');
  expect(state.saves[1].overwrite).toBe(false);
  expect(state.saves[1].base).toMatch(/^0v/);
  await expect(tabControl(page, 'text', 'left.text')
    .locator('.document-tab-close')).toHaveText('×');

  await page.evaluate(() => {
    const editor = window.__URUI_EDITOR_TEST__;
    editor.replaceRange(editor.getSource().length, editor.getSource().length,
      '\n// dirty');
  });
  await tabControl(page, 'text', 'left.text')
    .locator('.document-tab-close').click();
  await answer(page, false);
  await expect(page.getByRole('tab', {name: 'left.text'})).toBeVisible();
  await tabControl(page, 'text', 'left.text')
    .locator('.document-tab-close').click();
  await answer(page, true);
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
      '#explorer-view-tabs',
      '#editor-pane-document-tabs',
      '#result-pane-document-tabs'
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

  const addDotRef = page.locator('#text-ref');
  await expect(addDotRef).toBeEnabled();
  await addDotRef.click();
  const dotRef = page.locator('#explorer-view-tabs .ref-tab').filter({
    hasText: 'Untitled'
  });
  await expect(dotRef).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.ref-source'))
    .toHaveText('digraph initial {}');
  //  a second Add Ref shows the reference it already has
  await addDotRef.click();
  await expect(page.locator('#explorer-view-tabs .ref-tab')).toHaveCount(1);

  //  The reference document fills the explorer, rather than collapsing
  //  to the height of its own text.  The panels live inside the %tabs
  //  band, so this breaks whenever the pane's own box model assumes a
  //  fixed band order.
  const fill = await page.evaluate(() => {
    const height = (selector) => {
      return document.querySelector(selector)?.getBoundingClientRect().height;
    };
    return {
      pane: height('.explorer-pane'),
      panel: height('.ref-explorer-panel')
    };
  });
  expect(fill.pane).toBeGreaterThan(200);
  expect(fill.panel).toBeGreaterThan(fill.pane * 0.7);

  await page.evaluate(() => {
    const editor = window.__URUI_EDITOR_TEST__;
    editor.replaceRange(editor.getSource().length, editor.getSource().length,
      '\n// synced reference');
  });
  await expect(page.locator('.ref-source'))
    .toContainText('// synced reference');

  await tabControl(page, 'text', 'Untitled')
    .locator('.document-tab-close').click();
  await answer(page, true);
  await expect(dotRef).toBeVisible();
  await page.waitForTimeout(200);
  await page.reload();
  await expect(page.locator('.ref-source'))
    .toContainText('// synced reference');

  //  a note is Markdown: its reference is rendered, not quoted
  await page.locator('#echo').click();
  await expect.poll(() => state.renders.length).toBeGreaterThan(0);
  const addSvgRef = page.locator('#note-ref');
  await expect(addSvgRef).toBeEnabled();
  await addSvgRef.click();
  const noteRef = page.locator('.ref-explorer-panel').last();
  await expect(noteRef)
    .toContainText(`<title>Render ${state.renders.length}</title>`);

  const before = state.renders.length;
  await page.locator('#echo').click();
  await expect.poll(() => state.renders.length).toBe(before + 1);
  await expect(noteRef)
    .toContainText(`<title>Render ${before + 1}</title>`);
  await page.locator('.ref-tab-close').last().click();
  await expect(page.locator('#explorer-view-tabs .ref-tab')).toHaveCount(1);
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
  await dotTab.dragTo(page.locator('#explorer-view-tabs'));
  await expect(page.locator('#explorer-view-tabs .ref-tab'))
    .toHaveText('Untitled');

  await expect.poll(() => dotTab.evaluate((node) => node.draggable))
    .toBe(true);
  await dotTab.dragTo(page.locator('#explorer-view-tabs'));
  await expect(page.locator('#explorer-view-tabs .ref-tab')).toHaveCount(1);

  //  an empty tab has nothing to refer to
  await page.getByRole('button', {name: 'Add empty Text tab'}).click();
  await page.evaluate(() => {
    window.__URUI_EDITOR_TEST__.setSource('', {history: 'reset'});
  });
  const emptyTab = tabControl(page, 'text', 'Untitled 2');
  await expect(page.locator('#text-ref')).toBeDisabled();
  await expect.poll(() => emptyTab.evaluate((node) => node.draggable))
    .toBe(true);
  await emptyTab.dragTo(page.locator('#explorer'));
  await expect(page.locator('#explorer-view-tabs .ref-tab')).toHaveCount(1);

  await dotTab.first().locator('.document-tab').click();
  await expect(page.locator('#note-ref')).toBeDisabled();
  await page.locator('#echo').click();
  await expect.poll(() => state.renders.length).toBe(1);
  const svgTab = tabControl(page, 'note', 'Preview');
  await expect.poll(() => svgTab.evaluate((node) => node.draggable))
    .toBe(true);
  await svgTab.dragTo(page.locator('#explorer'));
  await expect(page.locator('#explorer-view-tabs .ref-tab'))
    .toHaveCount(2);
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
    const explorerTabs = document.querySelector('#explorer-view-tabs');
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
      documents: document.querySelector('#editor-pane-document-tabs')
        .getBoundingClientRect().height,
      reference: document.querySelector('.docs-tab-control')
        .getBoundingClientRect().height,
      editor: document.querySelector(
        '#editor-pane-document-tabs .document-tab-control'
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

  const dotOrder = await page
    .locator('#editor-pane-document-tabs .document-tab').allTextContents();
  const svgOrder = await page
    .locator('#result-pane-document-tabs .document-tab').allTextContents();
  const explorerOrder = await page.locator('#explorer-view-tabs [role="tab"]')
    .allTextContents();
  await page.reload();

  await expect(page.getByRole('tab', {name: 'menu.text'}))
    .toHaveAttribute('aria-selected', 'true');
  expect(await page.locator('#editor-pane-document-tabs .document-tab')
    .allTextContents()).toEqual(dotOrder);
  expect(await page.locator('#result-pane-document-tabs .document-tab')
    .allTextContents()).toEqual(svgOrder);
  expect(await page.locator('#explorer-view-tabs [role="tab"]')
    .allTextContents()).toEqual(explorerOrder);
  await expect(tabControl(page, 'text', 'menu.text')
    .locator('.document-tab-close')).toHaveText('●');
  await expect(page.locator('#fixture-result')).toContainText('Loaded file');
});
