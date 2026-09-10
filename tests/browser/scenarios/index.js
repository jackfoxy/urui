'use strict';

// Consumer-neutral scenarios owned by urui.

const shell = [
  'shell', 'tabs', 'explorer', 'docs', 'dialogs', 'files', 'session',
  'shortcuts', 'editor-adapter'
];
const app = [];

module.exports = {shell, app, all: [...shell, ...app]};
