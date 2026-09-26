export const DATA_REPO = 'EvieHe/theo-notes';

export function rewriteGitHubPath(pathname) {
  const rewritten = String(pathname || '').replace(/^\/repos\/(?:xcuicui|EvieHe)\/theo-notes(?=\/|$)/, '/repos/EvieHe/theo-notes');
  if (!rewritten.startsWith('/repos/EvieHe/theo-notes/')) return null;
  return rewritten;
}

export function isProtectedPath(pathname) {
  return ['/greeting', '/notes', '/dates', '/simple'].some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isSafeTestPath(path) {
  return /^_test\/[A-Za-z0-9._/-]+$/.test(String(path || '')) && !String(path).includes('..');
}

export function isValidNotesIndex(doc) {
  return !!doc && typeof doc === 'object' && Array.isArray(doc.items) && doc.items.every(item => item && typeof item === 'object' && typeof item.day === 'string');
}

export function isValidDateIdeas(doc) {
  return Array.isArray(doc) && doc.every(item => item && typeof item === 'object' && typeof item.id === 'string' && typeof item.title === 'string');
}


export function resolveNotesIndexPath(index) {
  if (index == null || index === '') return { path: 'notes/index.json', day: null };
  const value = String(index);
  if (!/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(value)) return null;
  return { path: `notes/${value}/entries.json`, day: value };
}
