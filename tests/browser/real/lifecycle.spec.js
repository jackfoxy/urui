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
  await page.evaluate((source) => {
    localStorage.setItem('urui-fixture.session.v1', JSON.stringify({
      version: 1,
      source,
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
  await page.locator('#editor').click();
  await page.keyboard.press('Control+Z');
  expect(await page.evaluate(() => {
    return window.__URUI_EDITOR_TEST__.getSource();
  })).toBe(shared);

  await expect.poll(() => page.evaluate(() => {
    return JSON.parse(localStorage.getItem('urui-fixture.session.v1'))?.source;
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
    browse: ({kind, path}) => {
      const leaf = path.endsWith('/txt') || path.endsWith('/md');
      const children = path === ''
        ? (kind === 'text' ? ['left', 'menu'] : ['preview'])
        : leaf
          ? []
          : [kind === 'text' ? 'txt' : 'md'];
      return {file: leaf, children};
    },
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

test('Text and Note save retries preserve exact action-time bodies', async ({
  page
}) => {
  const previewSource = renderedSvg('Exact preview');
  const saves = {text: [], note: []};
  await installCommonRoutes(page, {
    render: previewSource,
    save: ({kind, body, request}) => {
      saves[kind].push({body, headers: request.headers()});
      return {
        status: saves[kind].length === 1 ? 409 : 200,
        body: saves[kind].length === 1 ? 'exists' : 'saved'
      };
    }
  });
  page.on('dialog', async (dialog) => {
    if (dialog.type() === 'prompt') {
      await dialog.accept(dialog.message().startsWith('Text')
        ? 'exact/source'
        : 'exact/preview');
    } else {
      await dialog.accept();
    }
  });
  await page.goto('/apps/urui-fixture/');
  const dotSource = 'digraph exact {\n  "🙂" -> β\n}\n';
  await page.evaluate((source) => {
    window.__URUI_EDITOR_TEST__.setSource(source, {
      history: 'reset',
      notify: false
    });
  }, dotSource);

  await page.locator('#save-text').click();
  await expect.poll(() => saves.text.length).toBe(2);
  await page.locator('#save-note').click();
  await expect.poll(() => saves.note.length).toBe(2);

  expect(saves.text.map((request) => request.body))
    .toEqual([dotSource, dotSource]);
  expect(saves.note.map((request) => request.body))
    .toEqual([previewSource, previewSource]);
  expect(saves.text[0].headers['x-urui-fixture-path']).toBe('exact/source');
  expect(saves.note[0].headers['x-urui-fixture-path']).toBe('exact/preview');
  expect(saves.text[1].headers['x-urui-fixture-overwrite']).toBe('true');
  expect(saves.note[1].headers['x-urui-fixture-overwrite']).toBe('true');
});

