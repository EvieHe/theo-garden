export async function getSession() {
  const res = await fetch('/api/session', { credentials: 'same-origin' });
  if (!res.ok) return null;
  return res.json();
}

export async function getNotes() {
  const res = await fetch('/api/v1/notes', { credentials: 'same-origin' });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error(`notes:${res.status}`);
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

export async function getDateIdeas() {
  const res = await fetch('/api/v1/date-ideas', { credentials: 'same-origin' });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error(`date-ideas:${res.status}`);
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}
