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
