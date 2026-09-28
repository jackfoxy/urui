'use strict';

// Consumer-neutral scenarios owned by urui.

const shell = [
  'shell', 'runtime', 'tabs', 'panes', 'explorer', 'docs', 'dialogs',
  'files', 'session', 'shortcuts', 'editor-adapter'
];
const app = [];

//  Run against urui-fixture-docs, the store module's own fixture.
const documents = ['documents', 'document-races', 'document-session'];

module.exports = {shell, app, documents, all: [...shell, ...app]};
