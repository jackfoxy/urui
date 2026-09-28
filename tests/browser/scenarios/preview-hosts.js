'use strict';

// Previewers are per store, against urui-fixture-docs: `page` and `memo`
// both preview md, each into its own host, and neither touches the
// other.  Registering md again disposes both instances and rebuilds the
// one on screen.

const assert = require('node:assert/strict');

const {fileWire} = require('./support.js');

module.exports = async (env) => {
  const {elements, descendants} = env;
  const fixture = env.window.uruiDocsFixture;
  assert.equal(fixture?.ready, true);
  const docs = fixture.runtime.documents;
  const el = (id) => elements[`#${id}`];
  const {reply, entries} = fileWire(env);
  const heading = (host) => {
    const views = descendants(host).filter((node) => {
      return node.className === 'markdown-view' && !node.hidden;
    });
    const h1 = views.flatMap((view) => descendants(view))
      .find((node) => node.localName === 'h1');
    return h1 ? descendants(h1).map((node) => node.textContent).join('') : '';
  };
  const click = (toggle, display) => {
    el(toggle).children.find((button) => {
      return button.dataset.display === display;
    }).listeners.click();
  };

  // ---- start: one page draft, one memo draft ----------------------------
  await reply(entries());
  await reply(entries());
  const page = docs.active('page');
  const memo = docs.active('memo');
  assert.equal(memo.display, 'preview', 'memo starts in preview');

  // ---- each store previews into its own host ----------------------------
  docs.update('memo', memo.id, {text: '# Memo B'});
  assert.equal(el('memo-preview').hidden, false);
  assert.equal(heading(el('memo-preview')), 'Memo B');

  docs.update('page', page.id, {text: '# Page A'});
  click('page-display', 'preview');
  assert.equal(el('page-preview').hidden, false);
  assert.equal(heading(el('page-preview')), 'Page A');
  assert.equal(heading(el('memo-preview')), 'Memo B');

  // ---- an update to one leaves the other alone --------------------------
  docs.update('page', page.id, {text: '# Page A2'});
  assert.equal(heading(el('page-preview')), 'Page A2');
  assert.equal(heading(el('memo-preview')), 'Memo B');

  // ---- hiding one leaves the other showing ------------------------------
  click('page-display', 'source');
  assert.equal(el('page-preview').hidden, true);
  assert.equal(el('memo-preview').hidden, false);
  assert.equal(heading(el('memo-preview')), 'Memo B');

  // ---- a previewer must be a factory ------------------------------------
  assert.throws(() => docs.previews.register('md', {show() {}}), TypeError);

  // ---- registering again disposes every instance of the mark ------------
  const made = [];
  const disposed = [];
  const factory = ({host, store}) => {
    made.push(store);
    const view = new env.Element('div');
    view.className = 'probe-view';
    host.append(view);
    return {
      show(tab) { view.hidden = false; view.textContent = tab.text; },
      hide() { view.hidden = true; },
      dispose() { disposed.push(store); view.remove(); }
    };
  };
  docs.previews.register('md', factory);
  assert.equal(heading(el('page-preview')), '', 'the built-in is gone');
  assert.equal(heading(el('memo-preview')), '');
  assert.deepEqual(made, ['memo'], 'the store on screen rebuilds');
  const probe = el('memo-preview').children.find((node) => {
    return node.className === 'probe-view';
  });
  assert.equal(probe.textContent, '# Memo B');

  docs.previews.register('md', factory);
  assert.deepEqual(disposed, ['memo']);
  assert.equal(el('memo-preview').children.includes(probe), false);
  assert.deepEqual(made, ['memo', 'memo']);
};
