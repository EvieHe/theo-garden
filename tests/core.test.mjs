import test from 'node:test';
import assert from 'node:assert/strict';
import { rewriteGitHubPath, isProtectedPath, isSafeTestPath, isValidNotesIndex, isValidDateIdeas, resolveNotesIndexPath } from '../src/core.js';

test('legacy and current data repo paths are rewritten to EvieHe/theo-notes', () => {
  assert.equal(rewriteGitHubPath('/repos/xcuicui/theo-notes/contents/notes/index.json'), '/repos/EvieHe/theo-notes/contents/notes/index.json');
  assert.equal(rewriteGitHubPath('/repos/EvieHe/theo-notes/contents/dates/ideas.json'), '/repos/EvieHe/theo-notes/contents/dates/ideas.json');
});

test('other GitHub repositories are rejected', () => {
  assert.equal(rewriteGitHubPath('/repos/EvieHe/other/contents/a'), null);
  assert.equal(rewriteGitHubPath('/user'), null);
});

test('private UI routes stay protected', () => {
  for (const path of ['/notes/', '/dates/', '/greeting/', '/simple/']) assert.equal(isProtectedPath(path), true);
  assert.equal(isProtectedPath('/'), false);
});

test('test writes are isolated under _test only', () => {
  assert.equal(isSafeTestPath('_test/smoke/note.json'), true);
  assert.equal(isSafeTestPath('notes/index.json'), false);
  assert.equal(isSafeTestPath('_test/../notes/index.json'), false);
});

test('notes index contract catches schema regressions', () => {
  assert.equal(isValidNotesIndex({ items: [{ day: '2026-09-10', text: 'x' }] }), true);
  assert.equal(isValidNotesIndex({ items: [{ text: 'x' }] }), false);
});

test('date ideas contract catches schema regressions', () => {
  assert.equal(isValidDateIdeas([{ id: 'walk', title: 'Walk' }]), true);
  assert.equal(isValidDateIdeas([{ title: 'Walk' }]), false);
});

test('notes index resolver keeps legacy aggregate and supports day storage', () => {
  assert.deepEqual(resolveNotesIndexPath(null), { path: 'notes/index.json', day: null });
  assert.deepEqual(resolveNotesIndexPath('2026-03-09'), { path: 'notes/2026-03-09/entries.json', day: '2026-03-09' });
  assert.equal(resolveNotesIndexPath('2026-03'), null);
  assert.equal(resolveNotesIndexPath('../index.json'), null);
});
