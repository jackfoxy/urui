'use strict';

// The fullscreen toggle urui-shell draws: expand and return, its
// tooltips (one replaced by the fixture's `tips`), the toast moving
// inside the expanded element, and a modal leaving fullscreen.

const assert = require('node:assert/strict');

const {fixture} = require('./support.js');

module.exports = async (env) => {
  fixture(env);
  const {elements, document} = env;
  const toggle = elements['#result-fullscreen'];
  const pane = elements['#result-pane'];
  const toast = elements['#urui-toast'];

  assert.equal(toggle.title, 'Expand result to fullscreen');
  assert.equal(toggle['aria-pressed'], 'false');

  await toggle.listeners.click({});
  assert.equal(document.fullscreenElement, pane);
  assert(pane.classes.has('is-fullscreen'));
  assert.equal(toggle['aria-pressed'], 'true');
  assert.equal(toggle.title, 'Back to the workspace', 'the consumer tip');
  assert.equal(toggle['aria-label'], 'Back to the workspace');
  assert.equal(toast.parent, pane, 'feedback stays in view');

  await toggle.listeners.click({});
  assert.equal(document.fullscreenElement, null);
  assert(!pane.classes.has('is-fullscreen'));
  assert.equal(toggle.title, 'Expand result to fullscreen');
  assert.equal(toast.parent, document.body);

  //  a modal lives outside the pane, so opening one leaves fullscreen
  await toggle.listeners.click({});
  elements['#settings'].listeners.click({});
  assert.equal(document.fullscreenElement, null);
  assert(!pane.classes.has('is-fullscreen'));
  elements['#close-settings'].listeners.click({});
};
