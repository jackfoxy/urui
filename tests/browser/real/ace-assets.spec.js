'use strict';

const {test, expect} = require('@playwright/test');

const base = '/apps/urui-fixture/ace';

test('fixture loads a real text editor and shared Ace modules', async ({
  page, request, baseURL
}) => {
  const requested = [];
  page.on('request', item => requested.push(item.url()));
  for (const name of [
    'ace.js', 'config.js', 'theme-github.js', 'theme-monokai.js',
    'ext-beautify.js', 'ext-prompt.js', 'ext-searchbox.js',
    'ext-settings_menu.js'
  ]) {
    const response = await request.get(`${base}/${name}`);
    expect(response.status(), name).toBe(200);
    expect(response.headers()['content-type'], name)
      .toBe('text/javascript; charset=utf-8');
    const longest = Math.max(...(await response.text()).split('\n')
      .map(line => Buffer.byteLength(line)));
    expect(longest, name).toBeLessThan(32 * 1024);
  }
  const license = await request.get(`${base}/license.txt`);
  expect(license.status()).toBe(200);
  expect(license.headers()['content-type']).toBe('text/plain; charset=utf-8');
  expect(await license.text()).toContain('Copyright (c) 2010, Ajax.org B.V.');
  expect((await request.get(`${base}/not-shipped.js`)).status()).toBe(404);

  await page.goto('/apps/urui-fixture/');
  await page.addScriptTag({url: `${base}/ace.js`});
  await page.addScriptTag({url: `${base}/config.js`});
  const state = await page.evaluate(async () => {
    const config = window.uruiFixtureAceAssets;
    const load = name => new Promise((resolve, reject) => {
      window.ace.config.loadModule(name, module => {
        if (module) resolve(module);
        else reject(new Error(`missing module ${name}`));
      });
    });
    const modules = await Promise.all([
      config.mode, config.lightTheme, config.darkTheme, ...config.extensions
    ].map(load));
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;width:320px;height:160px';
    document.body.append(host);
    const editor = window.ace.edit(host);
    editor.session.setUseWorker(config.useWorker);
    editor.session.setMode(config.mode);
    editor.setTheme(config.lightTheme);
    editor.setValue('fixture text\nsecond line', -1);
    const result = {
      config, version: window.ace.version,
      mode: editor.session.getMode().$id, source: editor.getValue(),
      worker: editor.session.getUseWorker(),
      frozen: Object.isFrozen(config) && Object.isFrozen(config.extensions),
      modules: modules.map(module => typeof module)
    };
    editor.destroy();
    host.remove();
    return result;
  });
  expect(state).toEqual({
    config: {
      version: '1.44.0', basePath: base, mode: 'ace/mode/text',
      lightTheme: 'ace/theme/github', darkTheme: 'ace/theme/monokai',
      extensions: ['ace/ext/beautify', 'ace/ext/prompt',
        'ace/ext/searchbox', 'ace/ext/settings_menu'],
      useWorker: false
    },
    version: '1.44.0', mode: 'ace/mode/text',
    source: 'fixture text\nsecond line', worker: false, frozen: true,
    modules: Array(7).fill('object')
  });
  expect(requested.every(url => new URL(url).origin === new URL(baseURL).origin))
    .toBe(true);
});
