import assert from 'node:assert/strict';

const base = (process.env.BASE_URL || '').replace(/\/$/, '');
const pass = process.env.SMOKE_SITE_PASS || '';
if (!base) throw new Error('BASE_URL is required');
if (!pass) throw new Error('SMOKE_SITE_PASS is required');

async function req(path, init = {}, cookie = '') {
  const headers = new Headers(init.headers || {});
  if (cookie) headers.set('cookie', cookie);
  const res = await fetch(base + path, { ...init, headers, redirect: 'manual' });
  return res;
}

console.log('1/7 health');
let res = await req('/api/health');
assert.equal(res.status, 200);
let body = await res.json();
assert.equal(body.configured.sitePass, true);
assert.equal(body.configured.sessionSecret, true);
assert.equal(body.configured.githubToken, true);

console.log('2/7 anonymous protection');
res = await req('/notes/');
assert.equal(res.status, 302);

console.log('3/7 login + session');
res = await req('/api/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ user: 'Evie', pass }),
});
assert.equal(res.status, 200);
const cookie = (res.headers.get('set-cookie') || '').split(';')[0];
assert.match(cookie, /^theo_session=/);
res = await req('/api/session', {}, cookie);
assert.equal(res.status, 200);

console.log('4/7 notes contract');
res = await req('/api/v1/notes', {}, cookie);
assert.equal(res.status, 200);
body = await res.json();
assert.equal(body.ok, true);
assert.ok(Array.isArray(body.items));
assert.ok(body.items.length > 0, 'historical notes must not disappear');
assert.ok(body.items.some(x => x && x.day), 'notes must contain day');

console.log('5/7 dates contract');
res = await req('/api/v1/date-ideas', {}, cookie);
assert.equal(res.status, 200);
body = await res.json();
assert.equal(body.ok, true);
assert.ok(Array.isArray(body.items));
assert.ok(body.items.length > 0, 'date ideas must not disappear');

console.log('6/7 isolated write/read/delete');
const key = `_test/smoke/${Date.now()}.json`;
res = await req('/api/v1/test-object', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: key, value: { smoke: true } }),
}, cookie);
assert.equal(res.status, 200);
res = await req('/api/v1/test-object?path=' + encodeURIComponent(key), {}, cookie);
assert.equal(res.status, 200);
body = await res.json();
assert.equal(body.value.smoke, true);
res = await req('/api/v1/test-object?path=' + encodeURIComponent(key), { method: 'DELETE' }, cookie);
assert.equal(res.status, 200);

console.log('7/7 legacy proxy security');
res = await req('/api/github/repos/EvieHe/other/contents/a', {}, cookie);
assert.equal(res.status, 403);

console.log('P0 smoke passed');
