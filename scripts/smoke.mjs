import assert from 'node:assert/strict';

const base = (process.env.BASE_URL || '').replace(/\/$/, '');
if (!base) throw new Error('BASE_URL is required');

async function req(path, init = {}) {
  return fetch(base + path, { ...init, redirect: 'manual' });
}

console.log('1/6 runtime secrets are bound');
let res = await req('/api/health');
assert.equal(res.status, 200);
let body = await res.json();
assert.equal(body.configured.sitePass, true);
assert.equal(body.configured.sessionSecret, true);
assert.equal(body.configured.githubToken, true);

console.log('2/6 private storage is readable and contracts are valid');
res = await req('/api/ready');
assert.equal(res.status, 200);
body = await res.json();
assert.equal(body.ok, true);
assert.equal(body.storage.notes.ok, true);
assert.ok(body.storage.notes.count > 0, 'historical notes must not disappear');
assert.equal(body.storage.dateIdeas.ok, true);
assert.ok(body.storage.dateIdeas.count > 0, 'date ideas must not disappear');

console.log('3/6 anonymous private page is blocked');
res = await req('/notes/');
assert.equal(res.status, 302);
assert.match(res.headers.get('location') || '', /\?next=/);

console.log('4/6 stable data APIs require a session');
res = await req('/api/v1/notes');
assert.equal(res.status, 401);
res = await req('/api/v1/date-ideas');
assert.equal(res.status, 401);

console.log('5/6 wrong credentials are rejected');
res = await req('/api/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ user: 'Evie', pass: '__definitely_wrong__' }),
});
assert.equal(res.status, 401);

console.log('6/6 legacy GitHub proxy cannot be used anonymously');
res = await req('/api/github/repos/EvieHe/theo-notes/contents/notes/index.json');
assert.equal(res.status, 401);

console.log('P0 production smoke passed');
