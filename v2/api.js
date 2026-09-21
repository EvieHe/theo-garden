import {apiFetch,redirectToLogin} from './runtime.js';

export async function getSession() {
  const res = await apiFetch('/session');
  if (!res.ok) return null;
  return res.json();
}

export async function getNotes(query='') {
  const res = await apiFetch('/v1/notes'+query);
  if (res.status === 401) { redirectToLogin(); throw new Error('unauthorized'); }
  if (!res.ok) throw new Error(`notes:${res.status}`);
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

export async function getDateIdeas() {
  const res = await apiFetch('/v1/date-ideas');
  if (res.status === 401) { redirectToLogin(); throw new Error('unauthorized'); }
  if (!res.ok) throw new Error(`date-ideas:${res.status}`);
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}
