import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('V2 uses stable Worker APIs instead of GitHub directly', async () => {
  const api = await read('v2/api.js');
  assert.match(api, /\/api\/session/);
  assert.match(api, /\/api\/v1\/notes/);
  assert.match(api, /\/api\/v1\/date-ideas/);
  assert.doesNotMatch(api, /api\.github\.com/);
  assert.doesNotMatch(api, /github_pat/i);
});

test('V2 remains isolated from legacy production pages', async () => {
  const html = await read('v2/index.html');
  assert.match(html, /Living memory garden/);
  assert.match(html, /\.\/app\.js/);
  assert.doesNotMatch(html, /gh-token\.enc\.json/);
});

test('V2 includes reduced-motion support', async () => {
  const css = await read('v2/styles.css');
  assert.match(css, /prefers-reduced-motion/);
});
