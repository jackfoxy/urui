'use strict';

// runtime.a11y: the tablist and menu keyboard helpers, over markup the
// scenario builds itself, as a consumer would.

const assert = require('node:assert/strict');

const {fixture} = require('./support.js');

module.exports = async (env) => {
  const {runtime} = fixture(env);
  const {Element} = env;
  const active = () => env.document.activeElement;
  const press = (target, key, modifiers = {}) => {
    const event = {
      key,
      target: modifiers.target || active(),
      preventDefault() { this.prevented = true; },
      stopPropagation() {}
    };
    target.listeners.keydown(event);
    return event;
  };

  // ---- tablist: one tab stop, arrows wrap, keys click ------------------
  const list = new Element('div');
  list.setAttribute('role', 'tablist');
  const tabs = [0, 1, 2].map((index) => {
    const tab = new Element('button');
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(index === 0));
    list.append(tab);
    return tab;
  });
  const {sync} = runtime.a11y.tablist(list);
  assert.deepEqual(tabs.map((tab) => tab.tabIndex), [0, -1, -1]);

  assert.equal(press(list, 'ArrowRight', {target: tabs[0]}).prevented, true);
  assert.equal(active(), tabs[1]);
  assert.equal(tabs[1].clicked, true, 'the owner selects on click');
  press(list, 'ArrowLeft', {target: tabs[0]});
  assert.equal(active(), tabs[2], 'Left wraps');
  press(list, 'Home', {target: tabs[2]});
  assert.equal(active(), tabs[0]);
  press(list, 'End', {target: tabs[0]});
  assert.equal(active(), tabs[2]);
  assert.equal(press(list, 'ArrowDown', {target: tabs[0]}).prevented,
    undefined, 'Down is not a horizontal tablist key');

  tabs[0].setAttribute('aria-selected', 'false');
  tabs[2].setAttribute('aria-selected', 'true');
  sync();
  assert.deepEqual(tabs.map((tab) => tab.tabIndex), [-1, -1, 0]);

  // ---- menu: open focuses the first item; arrows skip hidden ones -------
  const menu = new Element('div');
  menu.setAttribute('role', 'menu');
  menu.hidden = true;
  const items = [0, 1, 2].map(() => {
    const item = new Element('button');
    item.setAttribute('role', 'menuitem');
    menu.append(item);
    return item;
  });
  items[2].hidden = true;
  let closed = 0;
  const control = runtime.a11y.menu(menu, {onClose: () => { closed += 1; }});
  const source = new Element('button');

  control.open(source, {type: 'click'});
  assert.equal(menu.hidden, false);
  assert.equal(source['aria-expanded'], 'true');
  assert.equal(active(), items[0]);
  press(menu, 'ArrowDown');
  assert.equal(active(), items[1]);
  press(menu, 'ArrowDown');
  assert.equal(active(), items[0], 'Down wraps past the hidden item');
  press(menu, 'ArrowUp');
  assert.equal(active(), items[1]);
  press(menu, 'Home');
  assert.equal(active(), items[0]);
  press(menu, 'End');
  assert.equal(active(), items[1]);

  // ---- Escape through the dispatcher closes it, focus goes back ---------
  runtime.shortcuts.dispatch({
    key: 'Escape', target: active(),
    preventDefault() {}, stopPropagation() {}
  });
  assert.equal(menu.hidden, true);
  assert.equal(closed, 1);
  assert.equal(active(), source);
  assert.equal(source['aria-expanded'], 'false');

  // ---- clicks: inside and on the source keep it; outside closes ---------
  control.open(source, {type: 'click'});
  env.documentListeners.click({target: items[0]});
  env.documentListeners.click({target: source});
  assert.equal(menu.hidden, false);
  env.documentListeners.click({target: new Element()});
  assert.equal(menu.hidden, true);
  assert.equal(closed, 2);

  // ---- Tab closes it too, back to the source ----------------------------
  control.open(source, {type: 'click'});
  assert.equal(press(menu, 'Tab').prevented, true);
  assert.equal(menu.hidden, true);
  assert.equal(active(), source);
  assert.equal(closed, 3);
};
