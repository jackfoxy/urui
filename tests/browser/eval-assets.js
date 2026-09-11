'use strict';

// `vere eval` plumbing shared by serve-app.js and bin/asset-digest.js.
//
// Desk sources are compiled outside a ship by emulating ford imports: every
// /lib and /sur file becomes an `=+  ^=  face` binding with its own import
// lines stripped.  The result is printed by the interpreter as Hoon cords,
// which parseCords decodes back into JavaScript strings.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');

function findVere() {
  const candidates = [
    process.env.VERE,
    path.join(os.homedir(), 'piers/urbit'),
    path.join(os.homedir(), 'piers/vere-v4.5-linux-x86_64'),
    'vere'
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (!candidate.includes('/') || fs.existsSync(candidate)) return candidate;
  }
  throw new Error('set VERE to an executable that supports `eval`');
}

function readSource(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\/[+-].*\n/gm, '');
}

function decodeCord(source) {
  const chunks = [];
  for (let index = 0; index < source.length;) {
    if (source[index] !== '\\') {
      const point = source.codePointAt(index);
      const character = String.fromCodePoint(point);
      chunks.push(Buffer.from(character));
      index += character.length;
      continue;
    }
    const hex = source.slice(index + 1, index + 3);
    if (/^[0-9a-f]{2}$/i.test(hex)) {
      chunks.push(Buffer.from([Number.parseInt(hex, 16)]));
      index += 3;
      continue;
    }
    if (index + 1 >= source.length) throw new Error('invalid cord escape');
    chunks.push(Buffer.from(source[index + 1]));
    index += 2;
  }
  return Buffer.concat(chunks).toString('utf8');
}

// `count` is a parameter because urui's fixture emits three cords where
// graph-viz emits two.
function parseCords(output, count = 2) {
  const plain = output.replace(/\x1b\[[0-9;]*m/g, '');
  const start = plain.indexOf('eval (run):');
  if (start < 0) throw new Error('vere eval returned no result');
  const cords = [];
  let index = start;
  while (index < plain.length && cords.length < count) {
    if (plain[index] !== "'") {
      index += 1;
      continue;
    }
    index += 1;
    let encoded = '';
    while (index < plain.length) {
      if (plain[index] === "'") {
        index += 1;
        break;
      }
      if (plain[index] === '\\') {
        encoded += plain[index];
        index += 1;
        if (index >= plain.length) throw new Error('unterminated cord');
        encoded += plain[index];
        if (/[0-9a-f]/i.test(plain[index])
          && /[0-9a-f]/i.test(plain[index + 1] || '')) {
          index += 1;
          encoded += plain[index];
        }
        index += 1;
        continue;
      }
      encoded += plain[index];
      index += 1;
    }
    cords.push(decodeCord(encoded));
  }
  if (cords.length !== count) {
    throw new Error(`vere eval returned ${cords.length} cords, want ${count}`);
  }
  return cords;
}

function evaluate(source) {
  return new Promise((resolve, reject) => {
    const child = spawn(findVere(), ['eval']);
    const output = [];
    child.stdout.on('data', (chunk) => output.push(chunk));
    child.stderr.on('data', (chunk) => output.push(chunk));
    child.on('error', reject);
    child.on('close', (status) => {
      const result = Buffer.concat(output).toString('utf8');
      if (status === 0) resolve(result);
      else reject(new Error(result || 'vere eval failed'));
    });
    child.stdin.end(source);
  });
}

module.exports = {evaluate, parseCords, decodeCord, findVere, readSource};
