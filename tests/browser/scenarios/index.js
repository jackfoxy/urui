'use strict';

// Scenario inventory for the urui doubles suite.
//
// Empty until W4.2 moves the generic scenarios here from graph-viz; the
// runner is wired now so the move is a file copy and one line in this list,
// not a new harness.

const shell = [];
const app = [];

module.exports = {shell, app, all: [...shell, ...app]};
