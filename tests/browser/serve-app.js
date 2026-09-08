'use strict';

// Static server for the urui fixture, compiled straight from desk sources.
//
// There is no ship in this loop: the fixture's page, css, and app.js are
// produced by `vere eval` over the same files a desk would build, so a
// Playwright run costs one compile instead of a boot, a commit, and an
// install.
//
// `assemble` is exported because a consumer's own server must bind urui's
// faces before its application library — see plan §3.3.  graph-viz's
// serve-app.js delegates here once the sibling checkout exists.

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const vm = require('node:vm');

const {evaluate, parseCords, readSource} = require('./eval-assets.js');

const root = path.resolve(__dirname, '../..');

//  binding order is load-bearing: every lib must appear before the file
//  that imports it, exactly as ford would order them
const URUI_BINDINGS = [
  ['urui', 'desk/sur/urui.hoon'],
  ['uclay', 'desk/lib/urui-clay.hoon'],
  ['ucss', 'desk/lib/urui-css.hoon'],
  ['uace', 'desk/lib/urui-ace.hoon'],
  ['ucfg', 'desk/lib/urui-config.hoon'],
  ['ujs', 'desk/lib/urui-js.hoon'],
  ['shell', 'desk/lib/urui-shell.hoon']
];

// Build one `vere eval` program from [face, file] pairs plus a final
// expression.  Paths are resolved against `base`, defaulting to urui.
function assemble(bindings, expression, base = root) {
  const lines = [];
  for (const [face, relative] of bindings) {
    lines.push(`=+  ^=  ${face}`);
    lines.push(readSource(path.resolve(base, relative)));
  }
  lines.push(expression);
  return lines.join('\n');
}

async function compileFixture(spec) {
  const bindings = [...URUI_BINDINGS, ['fix', `tests/fixture/lib/${spec}.hoon`]];
  const source = assemble(bindings, '[page:fix css:fix javascript:fix]');
  let problem;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const cords = parseCords(await evaluate(source), 3);
      if (!cords[0].includes('</html>')) {
        throw new Error('vere eval returned truncated page HTML');
      }
      new vm.Script(cords[2], {filename: `${spec}.js`});
      return {page: cords[0], css: cords[1], javascript: cords[2]};
    } catch (cause) {
      problem = cause;
    }
  }
  throw problem;
}

function argument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : process.argv[index + 1];
}

async function main() {
  const spec = argument('spec', 'urui-fixture-web');
  const port = Number(argument('port', process.env.URUI_PORT || 4174));
  const base = '/apps/urui-fixture';
  const assets = await compileFixture(spec);
  const aceRoot = path.join(root, 'desk/web/ace');

  const server = http.createServer((request, response) => {
    const url = request.url.split('?')[0];
    const send = (type, body) => {
      response.writeHead(200, {'content-type': type});
      response.end(body);
    };
    if (url === base || url === `${base}/`) {
      return send('text/html; charset=utf-8', assets.page);
    }
    if (url === `${base}/app.js`) {
      return send('text/javascript; charset=utf-8', assets.javascript);
    }
    if (url === `${base}/app.css`) {
      return send('text/css; charset=utf-8', assets.css);
    }
    if (url.startsWith(`${base}/ace/`)) {
      const file = path.join(aceRoot, url.slice(`${base}/ace/`.length));
      if (file.startsWith(aceRoot) && fs.existsSync(file)) {
        return send('text/javascript; charset=utf-8', fs.readFileSync(file));
      }
    }
    response.writeHead(404, {'content-type': 'text/plain'});
    response.end('not found');
  });

  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`urui fixture on http://127.0.0.1:${port}${base}/\n`);
  });
}

module.exports = {assemble, compileFixture, URUI_BINDINGS};

if (require.main === module) {
  main().catch((cause) => {
    process.stderr.write(`${cause.message || cause}\n`);
    process.exit(1);
  });
}
