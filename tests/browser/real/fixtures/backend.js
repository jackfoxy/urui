'use strict';

// Shared Playwright double for the %urui-fixture HTTP surface.
//
// `installBackend(page, options)` installs one route per option present, so
// a spec declares only the endpoints it depends on.  Every handler may be:
//   * a function returning a body string, a fulfillment object, or nothing
//   * a literal body string
//   * `true`, for the endpoint's default answer
// Functions receive the decoded request so a spec can record observations.

const EMPTY_DIRECTORY = {file: false, children: []};

// A handler returns DEFER to keep the route for itself, e.g. to park it.
const DEFER = Symbol('backend.defer');

function fulfillment(result, base) {
  if (result === undefined || result === null) return base;
  if (typeof result === 'string') return {...base, body: result};
  return {...base, ...result};
}

function requestKind(request) {
  return request.url().includes('/file/text/') ? 'text' : 'note';
}

function requestPath(request) {
  return request.headers()['x-urui-fixture-path'] || '';
}

async function call(handler, argument) {
  return typeof handler === 'function' ? await handler(argument) : undefined;
}

async function installBackend(page, options = {}) {
  const {browse, render, textLoad, noteLoad, save, docs} = options;

  if (browse !== undefined) {
    await page.route('**/apps/urui-fixture/file/*/browse', async route => {
      const request = route.request();
      const listing = await call(browse, {
        kind: requestKind(request),
        path: requestPath(request),
        request
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(listing ?? EMPTY_DIRECTORY)
      });
    });
  }

  if (render !== undefined) {
    await page.route('**/apps/urui-fixture/echo', async route => {
      const request = route.request();
      const source = request.postData() || '';
      const result = typeof render === 'function'
        ? await render(source, request, route)
        : render;
      if (result === DEFER) return;
      await route.fulfill(fulfillment(result, {
        status: 200,
        contentType: 'text/plain',
        body: ''
      }));
    });
  }

  for (const [kind, handler] of [['text', textLoad], ['note', noteLoad]]) {
    if (handler === undefined) continue;
    await page.route(
      `**/apps/urui-fixture/file/${kind}/load`,
      async route => {
        const request = route.request();
        const result = typeof handler === 'function'
          ? await handler(requestPath(request), request)
          : handler;
        await route.fulfill(fulfillment(result, {
          status: 200,
          contentType: 'text/plain',
          body: ''
        }));
      }
    );
  }

  if (save !== undefined) {
    await page.route('**/apps/urui-fixture/file/*/save', async route => {
      const request = route.request();
      const result = await call(save, {
        kind: requestKind(request),
        path: requestPath(request),
        body: request.postData(),
        request
      });
      await route.fulfill(fulfillment(result, {
        status: 200,
        contentType: 'text/plain',
        body: 'ok'
      }));
    });
  }

  if (docs !== undefined) {
    const {
      index = '<!doctype html><title>Fixture Docs</title>',
      toc = '/users-guide/md    Users Guide',
      pagesGlob = '**/docs/**',
      pages = '<!doctype html><title>Fixture / Users Guide</title>'
    } = docs === true ? {} : docs;
    await page.route('**/docs', async route => {
      await route.fulfill({status: 200, contentType: 'text/html', body: index});
    });
    await page.route('**/apps/urui-fixture/doc.toc', async route => {
      await route.fulfill({status: 200, contentType: 'text/plain', body: toc});
    });
    await page.route(pagesGlob, async route => {
      await route.fulfill({status: 200, contentType: 'text/html', body: pages});
    });
  }
}

module.exports = {installBackend, EMPTY_DIRECTORY, DEFER};
