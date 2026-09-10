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
  assert.match(js, /notes\?index=/);
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
  const core = await read('src/core.js');
  const diary = await read('v2/diary.js');
  const day = await read('v2/day.js');
  assert.match(worker, /searchParams\.get\('index'\)/);
  assert.match(core, /notes\/\$\{value\}\/entries\.json/);
  assert.match(diary, /\/api\/v1\/notes\?index=/);
  assert.match(day, /\/api\/v1\/notes\?index=/);
  assert.match(core, /path: 'notes\/index\.json'/);
});


test('P0 diary first paint renders one month shell before incremental append', async () => {
  const js = await read('v2/diary.js');
  assert.match(js, /timeline\.replaceChildren\(section\)/);
  assert.match(js, /const section=makeMonthSection\(viewYear,viewMonth\)/);
  assert.doesNotMatch(js, /for\s*\([^)]*12[^)]*\)/);
});

test('P0 diary vertical continuation appends exactly the next month', async () => {
  const js = await read('v2/diary.js');
  assert.match(js, /appendObserver/);
  assert.match(js, /appendNextMonth\(section\)/);
  assert.match(js, /timeline\.append\(next\)/);
  assert.match(js, /addMonth\(y,m,1\)/);
});

test('P0 diary horizontal navigation targets one month and preserves deep-link state', async () => {
  const js = await read('v2/diary.js');
  assert.match(js, /shiftMonth\(delta\)/);
  assert.match(js, /renderTimeline\(delta\)/);
  assert.match(js, /history\.replaceState/);
  assert.match(js, /deltaX/);
});

test('P0 real note rendering keeps text, images, authors and deleted history semantics', async () => {
  const diary = await read('v2/diary.js');
  assert.match(diary, /entry\.text/);
  assert.match(diary, /entry\.images/);
  assert.match(diary, /entry\.author/);
  assert.match(diary, /!item\.deletedAt/);
  assert.match(diary, /fetchDay/);
});

test('P0 day detail reads its daily index and keeps content-driven layout engine', async () => {
  const day = await read('v2/day.js');
  assert.match(day, /index=\$\{encodeURIComponent\(requested\)\}/);
  assert.match(day, /pickLayout\(images\.length\)/);
  assert.match(day, /editorial/);
  assert.match(day, /essay/);
});

test('P0 legacy aggregate notes endpoint remains unchanged for historical consumers', async () => {
  const worker = await read('src/worker.js');
  const core = await read('src/core.js');
  assert.match(worker, /resolveNotesIndexPath\(index\)/);
  assert.match(core, /path: 'notes\/index\.json'/);
  assert.match(worker, /stable Notes API: load the complete historical index/);
});

test('Home V2 is a living scene with restrained motion and real navigation', async () => {
  const html = await read('v2/index.html');
  const css = await read('v2/styles.css');
  const js = await read('v2/app.js');
  assert.match(html, /Living memory garden/);
  assert.match(html, /scene-layer--left/);
  assert.match(html, /scene-layer--right/);
  assert.match(html, /\.\/diary\.html/);
  assert.match(html, /\.\.\/dates\//);
  assert.match(html, /\.\.\/notes\//);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /clip-path/);
  assert.match(css, /rainFall/);
  assert.match(js, /getNotes/);
  assert.match(js, /getDateIdeas/);
  assert.match(js, /pointermove/);
  assert.doesNotMatch(html, /memory-card/);
});
