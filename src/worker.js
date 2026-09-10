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
  const sig = b64url(await hmac(secret, payload));
  return `${payload}.${sig}`;
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
  } catch {
    return null;
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

async function handleLogin(request, env) {
  if (!env.SITE_PASS || !env.SESSION_SECRET) return json({ error: 'server_not_configured' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad_request' }, 400); }
  const user = String(body?.user || '');
  const pass = String(body?.pass || '');
  if (!USERS.has(user) || pass !== env.SITE_PASS) return json({ error: 'invalid_credentials' }, 401);
  const token = await createSession(user, env.SESSION_SECRET);
  return json({ ok: true, user }, 200, {
    'set-cookie': `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`,
  });
}

async function handleSession(request, env) {
  const session = await readSession(request, env.SESSION_SECRET);
  return session ? json({ ok: true, user: session.user }) : json({ ok: false }, 401);
}

function handleLogout() {
  return json({ ok: true }, 200, {
    'set-cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  });
}

async function proxyGitHub(request, env, session) {
  if (!session) return json({ error: 'unauthorized' }, 401);
  if (!env.GITHUB_TOKEN) return json({ error: 'github_token_not_configured' }, 503);

  const incoming = new URL(request.url);
  let ghPath = incoming.pathname.slice('/api/github'.length);
  ghPath = ghPath.replace(/^\/repos\/(?:xcuicui|EvieHe)\/theo-notes(?=\/|$)/, '/repos/EvieHe/theo-notes');
  if (!ghPath.startsWith('/repos/EvieHe/theo-notes/')) return json({ error: 'github_path_not_allowed' }, 403);

  const target = new URL(`https://api.github.com${ghPath}${incoming.search}`);
  const headers = new Headers();
  headers.set('authorization', `Bearer ${env.GITHUB_TOKEN}`);
  headers.set('accept', request.headers.get('accept') || 'application/vnd.github+json');
  headers.set('x-github-api-version', '2022-11-28');
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const init = { method: request.method, headers, redirect: 'follow' };
  if (!['GET', 'HEAD'].includes(request.method)) init.body = await request.arrayBuffer();
  const response = await fetch(target, init);
  const outHeaders = new Headers(response.headers);
  outHeaders.set('cache-control', 'no-store');
  outHeaders.delete('set-cookie');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: outHeaders });
}

function legacyBridgeScript(user) {
  return `<script>
  (() => {
    try {
      localStorage.setItem('theo_auth_ok', '1');
      localStorage.setItem('theo_auth_user', ${JSON.stringify(user)});
      localStorage.setItem('theo_site_pass', 'cloudflare-proxy');
      localStorage.setItem('theo_notes_write_key', 'cloudflare-proxy');
    } catch {}
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (input, init = {}) => {
      let url;
      try { url = new URL(typeof input === 'string' ? input : input.url, location.href); } catch { return nativeFetch(input, init); }
      if (url.origin === 'https://api.github.com') {
        const next = '/api/github' + url.pathname + url.search;
        const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
        headers.delete('authorization');
        const response = await nativeFetch(next, { ...init, headers });
        if (response.status === 401) {
          try { localStorage.removeItem('theo_auth_ok'); } catch {}
          location.replace('/?next=' + encodeURIComponent(location.pathname + location.search + location.hash));
        }
        return response;
      }
      return nativeFetch(input, init);
    };
  })();
  </script>`;
}

function transformLegacyHtml(html, user) {
  // The old pages decrypt a browser-side PAT before calling GitHub. During the
  // Cloudflare migration we replace only that function at the edge. This keeps
  // the large legacy pages stable while the real PAT stays server-side.
  html = html.replace(
    /async function decryptToken\(pass\)\{[\s\S]*?return new TextDecoder\('utf-8'\)\.decode\(new Uint8Array\(pt\)\);\s*\}/g,
    "async function decryptToken(pass){ return 'cloudflare-proxy-placeholder-token'; }"
  );
  html = html.replaceAll("const GH_OWNER = 'xcuicui';", "const GH_OWNER = 'EvieHe';");
  html = html.replace('<head>', `<head>${legacyBridgeScript(user)}`);
  return html;
}

function protectedPath(pathname) {
  return ['/greeting', '/notes', '/dates', '/simple'].some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/login' && request.method === 'POST') return handleLogin(request, env);
    if (url.pathname === '/api/session' && request.method === 'GET') return handleSession(request, env);
    if (url.pathname === '/api/logout' && request.method === 'POST') return handleLogout();

    const session = await readSession(request, env.SESSION_SECRET);
    if (url.pathname.startsWith('/api/github/')) return proxyGitHub(request, env, session);

    if (url.pathname === '/theo-garden' || url.pathname.startsWith('/theo-garden/')) {
      const target = new URL(request.url);
      target.pathname = target.pathname.replace(/^\/theo-garden(?=\/|$)/, '') || '/';
      return Response.redirect(target.toString(), 308);
    }

    if (protectedPath(url.pathname) && !session) {
      const next = url.pathname + url.search + url.hash;
      return Response.redirect(`${url.origin}/?next=${encodeURIComponent(next)}`, 302);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const type = assetResponse.headers.get('content-type') || '';
    if (!type.includes('text/html') || !session) return assetResponse;

    const html = await assetResponse.text();
    const headers = new Headers(assetResponse.headers);
    headers.set('cache-control', 'no-store');
    headers.delete('content-length');
    return new Response(transformLegacyHtml(html, session.user), {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    });
  },
};
