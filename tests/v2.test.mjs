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
  const diary = await read('v2/diary-stream.css');
  assert.match(css, /prefers-reduced-motion/);
  assert.match(diary, /prefers-reduced-motion/);
});

test('Diary timeline uses stable notes/assets APIs and directional navigation', async () => {
  const js = await read('v2/diary.js');
  assert.match(js, /\/api\/v1\/notes/);
  assert.match(js, /\/api\/v1\/assets\?path=/);
  assert.match(js, /deltaX/);
  assert.match(js, /pointerdown/);
  assert.match(js, /month-memories/);
  assert.match(js, /DateTimeOriginal|0x9003/);
  assert.match(js, /Recorded/);
  assert.doesNotMatch(js, /api\.github\.com/);
});

test('Diary incrementally renders months and lazy-loads media', async () => {
  const js = await read('v2/diary.js');
  assert.match(js, /notes\\?index=/);
  assert.match(js, /month-append-sentinel/);
  assert.match(js, /IntersectionObserver/);
  assert.match(js, /data-src=/);
  assert.match(js, /appendNextMonth/);
  assert.doesNotMatch(js, /for\s*\(let i=0;i<12;i\+\+\)/);
  assert.doesNotMatch(js, /pointermove[\s\S]{0,500}querySelectorAll\('\.memory-shot'\)/);
});

test('Diary preserves detail navigation and recorded-time fallback', async () => {
  const diary = await read('v2/diary.js');
  const day = await read('v2/day.js');
  assert.match(diary, /day\.html\?date=/);
  assert.match(diary, /Recorded ·/);
  assert.match(day, /pickLayout/);
  assert.match(day, /n===0/);
  assert.match(day, /n===1/);
  assert.match(day, /n===2/);
  assert.match(day, /n===3/);
  assert.match(day, /n<=6/);
});

test('Legacy Notes API remains backward compatible while V2 can read a day index', async () => {
  const worker = await read('src/worker.js');
  const diary = await read('v2/diary.js');
  const day = await read('v2/day.js');
  assert.match(worker, /searchParams\.get\('index'\)/);
  assert.match(worker, /notes\/\$\{value\}\/entries\.json/);
  assert.match(diary, /\/api\/v1\/notes\?index=/);
  assert.match(day, /\/api\/v1\/notes\?index=/);
  assert.match(worker, /path: 'notes\/index\.json'/);
});
