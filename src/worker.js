import { rewriteGitHubPath, isProtectedPath, isSafeTestPath, isValidNotesIndex, isValidDateIdeas } from './core.js';

const USERS = new Set(['Theo', 'Evie']);
const SESSION_COOKIE = 'theo_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const encoder = new TextEncoder();

function b64url(input) {
  const bytes = input instanceof Uint8Array ? input : encoder.encode(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}
function fromB64url(input) {
  const padded = input.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - input.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}
async function createSession(user, secret) {
  const payload = b64url(JSON.stringify({ user, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }));
  return `${payload}.${b64url(await hmac(secret, payload))}`;
}
async function readSession(request, secret) {
  if (!secret) return null;
  const cookies = request.headers.get('cookie') || '';
  const value = cookies.split(';').map(x => x.trim()).find(x => x.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!value) return null;
  const [payload, sig] = value.split('.');
  if (!payload || !sig) return null;
  const expected = await hmac(secret, payload);
  const actual = fromB64url(sig);
  if (expected.length !== actual.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ actual[i];
  if (diff !== 0) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    if (!USERS.has(data.user) || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch { return null; }
}
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
}
async function handleLogin(request, env) {
  if (!env.SITE_PASS || !env.SESSION_SECRET) return json({ error: 'server_not_configured' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad_request' }, 400); }
  const user = String(body?.user || '');
  const pass = String(body?.pass || '');
  if (!USERS.has(user) || pass !== env.SITE_PASS) return json({ error: 'invalid_credentials' }, 401);
  const token = await createSession(user, env.SESSION_SECRET);
  return json({ ok: true, user }, 200, { 'set-cookie': `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}` });
}
async function handleSession(request, env) {
  const session = await readSession(request, env.SESSION_SECRET);
  return session ? json({ ok: true, user: session.user }) : json({ ok: false }, 401);
}
function handleLogout() {
  return json({ ok: true }, 200, { 'set-cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` });
}
function handleHealth(env) {
  return json({ ok: true, configured: { sitePass: Boolean(env.SITE_PASS), sessionSecret: Boolean(env.SESSION_SECRET), githubToken: Boolean(env.GITHUB_TOKEN) } });
}
function ghHeaders(env, accept = 'application/vnd.github+json') {
  return { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept, 'x-github-api-version': '2022-11-28', 'user-agent': 'theo-garden-worker' };
}
async function ghRequest(env, path, init = {}) {
  if (!env.GITHUB_TOKEN) return new Response(JSON.stringify({ error: 'github_token_not_configured' }), { status: 503 });
  const headers = new Headers(ghHeaders(env, init.accept));
  if (init.contentType) headers.set('content-type', init.contentType);
  return fetch(`https://api.github.com${path}`, { method: init.method || 'GET', headers, body: init.body, redirect: 'follow' });
}
async function ghJsonFile(env, repoPath) {
  const enc = repoPath.split('/').map(encodeURIComponent).join('/');
  const res = await ghRequest(env, `/repos/EvieHe/theo-notes/contents/${enc}?ref=main`);
  if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
  const file = await res.json();
  const raw = atob(String(file.content || '').replace(/\n/g, ''));
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
  try {
    return { ok: true, status: 200, sha: file.sha, value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, status: 502, error: 'invalid_json' };
  }
}
async function notesUiReady(env) {
  try {
    const res = await env.ASSETS.fetch(new Request('https://assets.local/notes/'));
    if (!res.ok) return false;
    const transformed = transformLegacyHtml(await res.text(), 'Evie');
    return transformed.includes("fetch('/api/v1/notes'") && transformed.includes('stable Notes API');
  } catch {
    return false;
  }
}
async function apiReady(env) {
  const configured = Boolean(env.SITE_PASS && env.SESSION_SECRET && env.GITHUB_TOKEN);
  if (!configured) return json({ ok: false, configured: false }, 503);
  const [notes, dates, notesUiOk] = await Promise.all([
    ghJsonFile(env, 'notes/index.json'),
    ghJsonFile(env, 'dates/ideas.json'),
    notesUiReady(env),
  ]);
  const notesOk = notes.ok && isValidNotesIndex(notes.value) && notes.value.items.length > 0;
  const datesOk = dates.ok && isValidDateIdeas(dates.value) && dates.value.length > 0;
  const ok = notesOk && datesOk && notesUiOk;
  return json({
    ok,
    configured: true,
    storage: {
      notes: { ok: notesOk, count: notes.ok && Array.isArray(notes.value?.items) ? notes.value.items.length : 0, upstreamStatus: notes.status },
      dateIdeas: { ok: datesOk, count: dates.ok && Array.isArray(dates.value) ? dates.value.length : 0, upstreamStatus: dates.status },
    },
    ui: { notes: { ok: notesUiOk } },
  }, ok ? 200 : 503);
}
async function ghPutJson(env, repoPath, value) {
  const current = await ghJsonFile(env, repoPath);
  const content = bytesToBase64(new TextEncoder().encode(JSON.stringify(value, null, 2)));
  const path = `/repos/EvieHe/theo-notes/contents/${repoPath.split('/').map(encodeURIComponent).join('/')}`;
  const payload = { message: `Smoke test ${repoPath}`, content, branch: 'main' };
  if (current.ok && current.sha) payload.sha = current.sha;
  return ghRequest(env, path, { method: 'PUT', contentType: 'application/json', body: JSON.stringify(payload) });
}
function bytesToBase64(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
async function ghDeleteFile(env, repoPath) {
  const current = await ghJsonFile(env, repoPath);
  if (!current.ok || !current.sha) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  const path = `/repos/EvieHe/theo-notes/contents/${repoPath.split('/').map(encodeURIComponent).join('/')}`;
  return ghRequest(env, path, { method: 'DELETE', contentType: 'application/json', body: JSON.stringify({ message: `Cleanup smoke test ${repoPath}`, sha: current.sha, branch: 'main' }) });
}
async function apiNotes(env, session) {
  if (!session) return json({ error: 'unauthorized' }, 401);
  const result = await ghJsonFile(env, 'notes/index.json');
  if (!result.ok) return json({ error: 'storage_read_failed', upstreamStatus: result.status }, 502);
  if (!isValidNotesIndex(result.value)) return json({ error: 'notes_contract_invalid' }, 502);
  return json({ ok: true, items: result.value.items });
}
async function apiDateIdeas(env, session) {
  if (!session) return json({ error: 'unauthorized' }, 401);
  const result = await ghJsonFile(env, 'dates/ideas.json');
  if (!result.ok) return json({ error: 'storage_read_failed', upstreamStatus: result.status }, 502);
  if (!isValidDateIdeas(result.value)) return json({ error: 'date_ideas_contract_invalid' }, 502);
  return json({ ok: true, items: result.value });
}
async function apiAsset(request, env, session) {
  if (!session) return json({ error: 'unauthorized' }, 401);
  const path = new URL(request.url).searchParams.get('path') || '';
  if (!/^(notes|dates)\/[A-Za-z0-9._/-]+$/.test(path) || path.includes('..')) return json({ error: 'bad_asset_path' }, 400);
  const enc = path.split('/').map(encodeURIComponent).join('/');
  const res = await ghRequest(env, `/repos/EvieHe/theo-notes/contents/${enc}?ref=main`, { accept: 'application/vnd.github.raw' });
  if (!res.ok) return json({ error: 'asset_read_failed', upstreamStatus: res.status }, 502);
  const headers = new Headers(res.headers); headers.set('cache-control', 'private, max-age=60');
  return new Response(res.body, { status: 200, headers });
}
async function apiTestObject(request, env, session) {
  if (!session) return json({ error: 'unauthorized' }, 401);
  const url = new URL(request.url);
  if (request.method === 'POST') {
    let body; try { body = await request.json(); } catch { return json({ error: 'bad_request' }, 400); }
    const path = String(body?.path || '');
    if (!isSafeTestPath(path)) return json({ error: 'test_path_required' }, 403);
    const res = await ghPutJson(env, path, body?.value ?? {});
    return res.ok ? json({ ok: true }) : json({ error: 'test_write_failed', upstreamStatus: res.status }, 502);
  }
  const path = url.searchParams.get('path') || '';
  if (!isSafeTestPath(path)) return json({ error: 'test_path_required' }, 403);
  if (request.method === 'GET') {
    const result = await ghJsonFile(env, path);
    return result.ok ? json({ ok: true, value: result.value }) : json({ error: 'test_read_failed', upstreamStatus: result.status }, 502);
  }
  if (request.method === 'DELETE') {
    const res = await ghDeleteFile(env, path);
    return res.ok ? json({ ok: true }) : json({ error: 'test_delete_failed', upstreamStatus: res.status }, 502);
  }
  return json({ error: 'method_not_allowed' }, 405);
}
async function proxyGitHub(request, env, session) {
  if (!session) return json({ error: 'unauthorized' }, 401);
  if (!env.GITHUB_TOKEN) return json({ error: 'github_token_not_configured' }, 503);
  const incoming = new URL(request.url);
  const ghPath = rewriteGitHubPath(incoming.pathname.slice('/api/github'.length));
  if (!ghPath) return json({ error: 'github_path_not_allowed' }, 403);
  const target = new URL(`https://api.github.com${ghPath}${incoming.search}`);
  const headers = new Headers(ghHeaders(env, request.headers.get('accept') || 'application/vnd.github+json'));
  const contentType = request.headers.get('content-type'); if (contentType) headers.set('content-type', contentType);
  const init = { method: request.method, headers, redirect: 'follow' };
  if (!['GET', 'HEAD'].includes(request.method)) init.body = await request.arrayBuffer();
  const response = await fetch(target, init);
  const outHeaders = new Headers(response.headers); outHeaders.set('cache-control', 'no-store'); outHeaders.delete('set-cookie');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: outHeaders });
}
function legacyBridgeScript(user) {
  return `<script>(()=>{try{localStorage.setItem('theo_auth_ok','1');localStorage.setItem('theo_auth_user',${JSON.stringify(user)});localStorage.setItem('theo_site_pass','cloudflare-proxy');localStorage.setItem('theo_notes_write_key','cloudflare-proxy')}catch{}const nativeFetch=window.fetch.bind(window);window.fetch=async(input,init={})=>{let url;try{url=new URL(typeof input==='string'?input:input.url,location.href)}catch{return nativeFetch(input,init)}if(url.origin==='https://api.github.com'){const next='/api/github'+url.pathname+url.search;const headers=new Headers(init.headers||(typeof input!=='string'?input.headers:undefined));headers.delete('authorization');const response=await nativeFetch(next,{...init,headers});if(response.status===401){try{localStorage.removeItem('theo_auth_ok')}catch{}location.replace('/?next='+encodeURIComponent(location.pathname+location.search+location.hash))}return response}return nativeFetch(input,init)}})();</script>`;
}
function stableNotesRenderFunction() {
  return `async function renderFromGitHub(){
      // stable Notes API: load the complete historical index before rendering the calendar.
      renderWeek();
      const now = new Date();
      const apiRes = await fetch('/api/v1/notes', { cache: 'no-store' });
      if (!apiRes.ok) throw new Error('notes_api_' + apiRes.status);
      const apiData = await apiRes.json();
      notesIndex = { items: Array.isArray(apiData.items) ? apiData.items : [] };
      saveIndexCache(notesIndex);

      const todayStr = \`${'${now.getFullYear()}'}-${'${String(now.getMonth()+1).padStart(2,\'0\')}'}-${'${String(now.getDate()).padStart(2,\'0\')}'}\`;
      const latest = notesIndex.items.find(it => it && it.day && !it.deletedAt);
      selectedDay = latest && latest.day ? String(latest.day) : todayStr;
      const selectedParts = selectedDay.split('-').map(Number);
      viewY = selectedParts[0] || now.getFullYear();
      viewM = selectedParts[1] || (now.getMonth() + 1);

      const prevM = $('prevM');
      const nextM = $('nextM');
      const todayBtn = $('todayBtn');
      const rerender = () => { renderCalendar(viewY, viewM); markSelected(selectedDay); };
      prevM && (prevM.onclick = () => { viewM -= 1; if (viewM <= 0) { viewM = 12; viewY -= 1; } rerender(); });
      nextM && (nextM.onclick = () => { viewM += 1; if (viewM >= 13) { viewM = 1; viewY += 1; } rerender(); });
      todayBtn && (todayBtn.onclick = async () => {
        viewY = now.getFullYear(); viewM = now.getMonth() + 1; selectedDay = todayStr; rerender(); await loadDay(selectedDay);
      });

      rerender();
      await loadDay(selectedDay);
    }`;
}
function transformLegacyHtml(html, user) {
  html = html.replace(/async function decryptToken\(pass\)\{[\s\S]*?return new TextDecoder\('utf-8'\)\.decode\(new Uint8Array\(pt\)\);\s*\}/g, "async function decryptToken(pass){ return 'cloudflare-proxy-placeholder-token'; }");
  html = html.replaceAll("const GH_OWNER = 'xcuicui';", "const GH_OWNER = 'EvieHe';");
  if (html.includes('async function renderFromGitHub(){')) {
    html = html.replace(/async function renderFromGitHub\(\)\{[\s\S]*?\n    \}\n\n    async function render\(\)\{/m, `${stableNotesRenderFunction()}\n\n    async function render(){`);
  }
  return html.replace('<head>', `<head>${legacyBridgeScript(user)}`);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/health' && request.method === 'GET') return handleHealth(env);
    if (url.pathname === '/api/ready' && request.method === 'GET') return apiReady(env);
    if (url.pathname === '/api/login' && request.method === 'POST') return handleLogin(request, env);
    if (url.pathname === '/api/session' && request.method === 'GET') return handleSession(request, env);
    if (url.pathname === '/api/logout' && request.method === 'POST') return handleLogout();

    const session = await readSession(request, env.SESSION_SECRET);
    if (url.pathname === '/api/v1/notes' && request.method === 'GET') return apiNotes(env, session);
    if (url.pathname === '/api/v1/date-ideas' && request.method === 'GET') return apiDateIdeas(env, session);
    if (url.pathname === '/api/v1/assets' && request.method === 'GET') return apiAsset(request, env, session);
    if (url.pathname === '/api/v1/test-object') return apiTestObject(request, env, session);
    if (url.pathname.startsWith('/api/github/')) return proxyGitHub(request, env, session);

    if (url.pathname === '/theo-garden' || url.pathname.startsWith('/theo-garden/')) {
      const target = new URL(request.url); target.pathname = target.pathname.replace(/^\/theo-garden(?=\/|$)/, '') || '/';
      return Response.redirect(target.toString(), 308);
    }
    if (isProtectedPath(url.pathname) && !session) {
      const next = url.pathname + url.search + url.hash;
      return Response.redirect(`${url.origin}/?next=${encodeURIComponent(next)}`, 302);
    }
    const assetResponse = await env.ASSETS.fetch(request);
    const type = assetResponse.headers.get('content-type') || '';
    if (!type.includes('text/html') || !session) return assetResponse;
    const html = await assetResponse.text();
    const headers = new Headers(assetResponse.headers); headers.set('cache-control', 'no-store'); headers.delete('content-length');
    return new Response(transformLegacyHtml(html, session.user), { status: assetResponse.status, statusText: assetResponse.statusText, headers });
  },
};