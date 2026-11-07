'use strict';

// Does the browser hand us the chord at all?
//
// A chord can be free in both keymap manifests and still be unusable:
// the browser may keep it for itself.  Two different failures matter,
// and they need different answers:
//
//   not delivered  no keydown reaches the page.  The chord is unusable;
//                  pick another.
//   not cancelable preventDefault does not stop the browser's own
//                  action, so the app's command runs *and* a tab
//                  switches.  Worse than useless.
//
// Everything here is observation, not assertion about policy: the
// results are recorded in shortcut-exceptions.json and decide which
// chords the binding pass may use.  Only chords that are deliverable
// and cancelable in every engine tested are safe to declare %free.
//
// Chromium is the only engine installed in this checkout.  The spec is
// written to run under whatever projects the config declares, so adding
// a firefox project is all that is needed to widen it -- which the
// Ctrl-1 question in shortcut-exceptions.json is waiting on.

const {test, expect} = require('@playwright/test');
const {installBackend} = require('./fixtures/backend.js');

//  The chords the binding pass wants to use or is still deciding.
const candidates = [
  {binding: 'Ctrl-0', press: 'Control+0', use: 'Fit view'},
  {binding: 'Ctrl-1', press: 'Control+1', use: 'Reset view; browser tab 1'},
  {binding: 'Ctrl-Shift-0', press: 'Control+Shift+0', use: 'Reset view alias'},
  {binding: 'Alt-O', press: 'Alt+o', use: 'Open (Ctrl-O is Vim’s)'},
  {binding: 'Alt-C', press: 'Alt+c', use: 'Copy'},
  {binding: 'Alt-Enter', press: 'Alt+Enter', use: 'Row actions'},
  {binding: 'Ctrl-Alt-V', press: 'Control+Alt+v', use: 'Source/preview'},
  {binding: 'Ctrl-Shift-S', press: 'Control+Shift+S', use: 'Save as'},
  {binding: 'F3', press: 'F3', use: 'Parse; browser find-again'},
  {binding: 'F5', press: 'F5', use: 'Run or refresh; browser reload'}
];

test.beforeEach(async ({context}) => {
  await context.addInitScript(() => {
    window.__URUI_BROWSER_TEST__ = {
      acePlatform: 'win',
      keyboardLayout: 'en-US'
    };
    //  A capture listener of our own, so delivery is observed without
    //  the chord having to be bound by the app.
    window.__delivered = [];
    document.addEventListener('keydown', (event) => {
      window.__delivered.push({
        key: event.key,
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        cancelable: event.cancelable
      });
      event.preventDefault();
    }, {capture: true});
  });
});

test('every candidate chord is delivered and cancelable', async ({
  page
}, testInfo) => {
  await installBackend(page, {browse: true});
  await page.goto('/apps/urui-fixture/');
  await expect(page.locator('#editor-pane-document-tabs .document-tab'))
    .not.toHaveCount(0);

  const results = [];
  for (const candidate of candidates) {
    await page.evaluate(() => { window.__delivered = []; });
    await page.keyboard.press(candidate.press);
    const seen = await page.evaluate(() => window.__delivered.slice());
    results.push({
      binding: candidate.binding,
      use: candidate.use,
      delivered: seen.length > 0,
      cancelable: seen.every((event) => event.cancelable)
    });
  }

  //  Reported, not asserted away: the table is the deliverable.
  await testInfo.attach('chord-delivery', {
    body: JSON.stringify({engine: testInfo.project.name, results}, null, 2),
    contentType: 'application/json'
  });
  for (const row of results) {
    process.stdout.write(
      `  ${row.binding.padEnd(14)}`
      + `${row.delivered ? 'delivered' : 'NOT DELIVERED'}  `
      + `${row.cancelable ? 'cancelable' : 'NOT CANCELABLE'}  ${row.use}\n`
    );
  }

  //  The one hard rule: a chord the page never sees cannot be bound,
  //  whatever the manifests say about it.
  const lost = results.filter((row) => !row.delivered).map((row) => row.binding);
  expect(lost, `${testInfo.project.name} never delivered these`).toEqual([]);
});
