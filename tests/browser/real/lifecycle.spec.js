const {test, expect} = require('@playwright/test');
const {installBackend} = require('./fixtures/backend.js');

//  the fixture's own startup source, the way a consumer's starter template
//  is the source a first visit opens with
const starter = 'fixture source';

function renderedSvg(title) {
  return [
    '<note xmlns="http://www.w3.org/2000/note" viewBox="0 0 10 10">',
    `<title>${title}</title><circle cx="5" cy="5" r="4"/></note>`
  ].join('');
}

async function installCommonRoutes(page, options = {}) {
  await installBackend(page, {
    browse: true,
    render: renderedSvg('Rendered'),
    ...options
  });
}

test.beforeEach(async ({context}) => {
  await context.addInitScript(() => {
    window.__URUI_BROWSER_TEST__ = {
      acePlatform: 'win',
      keyboardLayout: 'en-US'
    };
    const addEventListener = window.addEventListener.bind(window);
    window.addEventListener = (type, listener, options) => {
      if (type === 'beforeunload') {
        window.__URUI_BEFOREUNLOAD_TEST__ = listener;
      }
      return addEventListener(type, listener, options);
    };
  });
});

test('startup sources round-trip exactly and start clean history', async ({
  page
}) => {
  await installCommonRoutes(page);
  await page.goto('/apps/urui-fixture/');
  await expect.poll(() => page.evaluate(() => {
    return window.__URUI_EDITOR_TEST__.getSource();
  })).toBe(starter);

  const restored = 'digraph restored {\n  α -> β\n}\n';
  await page.evaluate((text) => {
    localStorage.setItem('urui-fixture.session.v1', JSON.stringify({
      version: 1,
      textTabs: [{id: 'text-1', path: null, draft: 'Untitled', text}],
      activeTextTabId: 'text-1',
      nextTextTab: 2,
      paneWidth: 44,
      preferences: {theme: 'system'}
    }));
    window.removeEventListener(
      'beforeunload',
      window.__URUI_BEFOREUNLOAD_TEST__
    );
  }, restored);
  await page.reload();
  await expect.poll(() => page.evaluate(() => {
    return window.__URUI_EDITOR_TEST__.getSource();
  })).toBe(restored);

  const shared = 'strict digraph shared {\n  "🙂" -> β\n}\n';
  const encoded = Buffer.from(shared, 'utf8').toString('base64url');
  await page.goto(`/apps/urui-fixture/?text=${encoded}`);
  await expect.poll(() => page.evaluate(() => {
    return window.__URUI_EDITOR_TEST__.getSource();
  })).toBe(shared);
  await expect(page.getByRole('tab', {name: 'Shared'}))
    .toHaveAttribute('aria-selected', 'true');
  await page.locator('#editor').click();
  await page.keyboard.press('Control+Z');
  expect(await page.evaluate(() => {
    return window.__URUI_EDITOR_TEST__.getSource();
  })).toBe(shared);

  await expect.poll(() => page.evaluate(() => {
    const record = JSON.parse(localStorage.getItem('urui-fixture.session.v1'));
    return record?.textTabs?.find((tab) => tab.draft === 'Shared')?.text;
  })).toBe(shared);
  expect(await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('urui-fixture.session.v1')).version;
  })).toBe(1);
});

test('Text explorer opens reset history and Note opens preserve Text', async ({
  page
}) => {
  let renderCount = 0;
  const dotSources = {
    'left/txt': 'digraph left {\n  A -> B\n}\n',
    'menu/txt': 'digraph menu {\n  C -> D\n}\n'
  };
  const loadedSvg = renderedSvg('Loaded Note');
  await installCommonRoutes(page, {
    render: () => {
      renderCount += 1;
      return renderedSvg(`Render ${renderCount}`);
    },
    browse: () => [['left', 'txt'], ['menu', 'txt'], ['preview', 'md']],
    textLoad: (path) => dotSources[path],
    noteLoad: loadedSvg
  });
  await page.goto('/apps/urui-fixture/');
  await expect(page.locator('[data-path="left/txt"]')).toBeVisible();

  await page.locator('[data-path="left/txt"]').click();
  await expect.poll(() => page.evaluate(() => {
    return window.__URUI_EDITOR_TEST__.getSource();
  })).toBe(dotSources['left/txt']);
  await page.locator('#editor').click();
  await page.keyboard.press('Control+Z');
  expect(await page.evaluate(() => {
    return window.__URUI_EDITOR_TEST__.getSource();
  })).toBe(dotSources['left/txt']);

  await page.locator('[data-path="menu/txt"]').click({button: 'right'});
  await page.locator('#file-context-open').click();
  await expect.poll(() => page.evaluate(() => {
    return window.__URUI_EDITOR_TEST__.getSource();
  })).toBe(dotSources['menu/txt']);
  await page.locator('#editor').click();
  await page.keyboard.press('Control+Z');
  expect(await page.evaluate(() => {
    return window.__URUI_EDITOR_TEST__.getSource();
  })).toBe(dotSources['menu/txt']);

  await page.evaluate(() => {
    const editor = window.__URUI_EDITOR_TEST__;
    document.querySelector('#auto-echo').checked = true;
    editor.replaceRange(editor.getSource().length, editor.getSource().length,
      '\n// queued');
  });
  await page.locator('#note-files-tab').click();
  await expect(page.locator('[data-path="preview/md"]')).toBeVisible();
  const dotBeforeSvg = await page.evaluate(() => {
    return window.__URUI_EDITOR_TEST__.getSource();
  });
  const rendersBeforeSvg = renderCount;
  await page.locator('[data-path="preview/md"]').click();
  await expect(page.locator('#auto-echo')).toBeChecked();
  expect(await page.evaluate(() => {
    return window.__URUI_EDITOR_TEST__.getSource();
  })).toBe(dotBeforeSvg);
  await page.waitForTimeout(450);
  expect(renderCount).toBeGreaterThan(rendersBeforeSvg);
});

//  A first save asks for a path in urui's file dialog; `exists` asks
//  before overwriting, and the retry sends the same text.
async function saveAs(page, store, path) {
  await page.locator(`#${store}-save`).click();
  await expect(page.locator('#urui-file-dialog')).toBeVisible();
  await page.locator('#urui-file-dialog-path').fill(path);
  await page.locator('#urui-file-dialog-confirm').click();
  await expect(page.locator('#urui-confirm')).toBeVisible();
  await page.locator('#urui-confirm-ok').click();
}

test('Text and Note save retries preserve exact action-time bodies', async ({
  page
}) => {
  const previewSource = renderedSvg('Exact preview');
  const saves = {text: [], note: []};
  await installCommonRoutes(page, {
    render: previewSource,
    save: ({kind, path, body, overwrite}) => {
      saves[kind].push({path, body, overwrite});
      return {status: saves[kind].length === 1 ? 409 : 200};
    }
  });
  await page.goto('/apps/urui-fixture/');
  await expect(page.locator('#fixture-result')).toContainText('Exact preview');
  const dotSource = 'digraph exact {\n  "🙂" -> β\n}\n';
  await page.evaluate((source) => {
    window.__URUI_EDITOR_TEST__.setSource(source, {
      history: 'reset',
      notify: false
    });
  }, dotSource);

  await saveAs(page, 'text', 'exact/source');
  await expect.poll(() => saves.text.length).toBe(2);
  await saveAs(page, 'note', 'exact/preview');
  await expect.poll(() => saves.note.length).toBe(2);

  expect(saves.text.map((request) => request.body))
    .toEqual([dotSource, dotSource]);
  expect(saves.note.map((request) => request.body))
    .toEqual([previewSource, previewSource]);
  expect(saves.text[0].path).toBe('exact/source/txt');
  expect(saves.note[0].path).toBe('exact/preview/md');
  expect(saves.text.map((request) => request.overwrite)).toEqual([false, true]);
  expect(saves.note.map((request) => request.overwrite)).toEqual([false, true]);
});
