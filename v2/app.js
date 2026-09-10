import { getSession, getNotes, getDateIdeas } from './api.js';

const RELATIONSHIP_START = new Date('2024-01-01T00:00:00+08:00');
const $ = (id) => document.getElementById(id);

function daysBetween(a, b) {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000));
}

function formatToday() {
  try {
    return new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' })
      .format(new Date())
      .toUpperCase();
  } catch {
    return 'TODAY';
  }
}

function safeText(value, fallback = 'A day worth keeping') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function noteToMemory(note, index) {
  const day = safeText(note?.day, 'A quiet day');
  const title = safeText(note?.title || note?.text || note?.content, 'An ordinary day');
  return {
    id: note?.id || `${day}-${index}`,
    day,
    title: title.length > 38 ? `${title.slice(0, 38)}…` : title,
    body: safeText(note?.text || note?.content || title),
  };
}

function openMemory(memory) {
  $('memoryDialogTitle').textContent = memory.title;
  $('memoryDialogBody').textContent = memory.body;
  $('memoryDialogBackdrop').hidden = false;
}

function renderMemoryCards(memories) {
  const list = $('memoryList');
  list.replaceChildren();
  if (!memories.length) {
    const empty = document.createElement('div');
    empty.className = 'memory-placeholder';
    empty.textContent = '旧日子还在，只是今天先安静地待在档案里。';
    list.append(empty);
    return;
  }

  memories.slice(0, 6).forEach((memory) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'memory-card';
    card.innerHTML = `<small>${escapeHtml(memory.day)}</small><h3>${escapeHtml(memory.title)}</h3><p>Open this memory →</p>`;
    card.addEventListener('click', () => openMemory(memory));
    list.append(card);
  });
}

function renderMemoryNodes(memories) {
  const host = $('memoryNodes');
  host.replaceChildren();
  const positions = [
    ['25%', '41%'],
    ['67%', '34%'],
    ['17%', '64%'],
    ['73%', '61%'],
  ];

  memories.slice(0, 4).forEach((memory, index) => {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = 'memory-node';
    node.style.left = positions[index][0];
    node.style.top = positions[index][1];
    node.innerHTML = `<span class="memory-node__dot"></span><span class="memory-node__card"><span class="memory-node__date">${escapeHtml(memory.day)}</span><span class="memory-node__title">${escapeHtml(memory.title)}</span></span>`;
    node.addEventListener('click', () => openMemory(memory));
    host.append(node);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

async function bootstrap() {
  $('daysTogether').textContent = daysBetween(RELATIONSHIP_START, new Date());
  $('todayText').textContent = formatToday();

  const session = await getSession();
  if (!session?.ok) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    location.replace(`/?next=${encodeURIComponent(next)}`);
    return;
  }

  const [notesResult, datesResult] = await Promise.allSettled([getNotes(), getDateIdeas()]);
  const notes = notesResult.status === 'fulfilled' ? notesResult.value : [];
  const dates = datesResult.status === 'fulfilled' ? datesResult.value : [];
  const memories = notes.map(noteToMemory);

  $('noteCount').textContent = String(notes.length);
  $('dateCount').textContent = String(dates.length);
  $('growthText').textContent = memories.length
    ? `${Math.min(memories.length, 7)} leaves are holding recent memories.`
    : 'The garden is waking up.';

  renderMemoryNodes(memories);
  renderMemoryCards(memories);
}

$('dialogClose').addEventListener('click', () => { $('memoryDialogBackdrop').hidden = true; });
$('memoryDialogBackdrop').addEventListener('click', (event) => {
  if (event.target === $('memoryDialogBackdrop')) $('memoryDialogBackdrop').hidden = true;
});
$('memorySearch').addEventListener('click', () => {
  document.querySelector('#memories')?.scrollIntoView({ behavior: 'smooth' });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') $('memoryDialogBackdrop').hidden = true;
});

bootstrap().catch(() => {
  $('growthText').textContent = 'The garden is resting for a moment.';
  renderMemoryCards([]);
});
