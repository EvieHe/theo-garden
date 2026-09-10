import { getSession, getNotes, getDateIdeas } from './api.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);

async function loadSceneImage() {
  const paths = ['./assets/home-rain.part1.txt','./assets/home-rain.part2.txt','./assets/home-rain.part3.txt'];
  const parts = await Promise.all(paths.map(async path => {
    const res = await fetch(path, { cache: 'force-cache' });
    if (!res.ok) throw new Error('scene_asset_' + res.status);
    return res.text();
  }));
  const src = 'data:image/webp;base64,' + parts.join('');
  document.querySelectorAll('[data-scene-image]').forEach(img => { img.src = src; });
}

function bindSceneMotion() {
  if (reduce) return;
  const scene = document.querySelector('.scene');
  if (!scene) return;
  let tx = 0, ty = 0, cx = 0, cy = 0;
  const frame = () => {
    cx += (tx - cx) * .055;
    cy += (ty - cy) * .055;
    scene.style.setProperty('--bg-x', (cx * -5).toFixed(2) + 'px');
    scene.style.setProperty('--bg-y', (cy * -3).toFixed(2) + 'px');
    scene.style.setProperty('--left-x', (cx * 7).toFixed(2) + 'px');
    scene.style.setProperty('--left-y', (cy * 4).toFixed(2) + 'px');
    scene.style.setProperty('--right-x', (cx * 10).toFixed(2) + 'px');
    scene.style.setProperty('--right-y', (cy * 5).toFixed(2) + 'px');
    requestAnimationFrame(frame);
  };
  addEventListener('pointermove', event => {
    tx = (event.clientX / innerWidth - .5) * 2;
    ty = (event.clientY / innerHeight - .5) * 2;
  }, { passive: true });
  addEventListener('pointerleave', () => { tx = 0; ty = 0; });
  frame();
}

function activeNotes(notes) {
  return notes.filter(note => note && note.day && !note.deletedAt);
}

async function bootstrap() {
  const session = await getSession();
  if (!session?.ok) {
    const next = location.pathname + location.search + location.hash;
    location.replace('/?next=' + encodeURIComponent(next));
    return;
  }

  loadSceneImage().catch(error => console.warn('scene image failed', error));
  bindSceneMotion();

  const [notesResult, ideasResult] = await Promise.allSettled([getNotes(), getDateIdeas()]);
  const notes = activeNotes(notesResult.status === 'fulfilled' ? notesResult.value : []);
  const ideas = ideasResult.status === 'fulfilled' ? ideasResult.value : [];
  const photoCount = notes.reduce((sum, note) => sum + (Array.isArray(note.images) ? note.images.length : 0), 0);

  $('memoryCount').textContent = String(notes.length);
  $('photoCount').textContent = String(photoCount);
  $('ideaCount').textContent = String(ideas.length);

  const latest = notes[0];
  if (latest) {
    $('recentDate').textContent = latest.day.replaceAll('-', ' · ');
    $('recentText').textContent = String(latest.text || '这一天留下了一点东西。').trim() || '这一天留下了一点东西。';
  }
}

bootstrap().catch(error => {
  console.error(error);
  $('recentText').textContent = 'The garden is resting for a moment.';
});
