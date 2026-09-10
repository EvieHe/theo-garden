const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const hero=document.querySelector('.story-hero');
const heroImage=hero?.querySelector('img');
const heroDate=hero?.querySelector('.story-date');

const demoEntry={
  text:'今天去了海边。其实没有发生什么特别大的事情，只是风很好，我们走了很久。后来回头看的时候，反而觉得这种普通的下午最舍不得忘记。',
  note:'天一点一点暗下来。没有赶着去下一个地方，也没有特别安排什么。只是坐在那里聊天。',
  quote:'希望以后回来看这一天的时候，还能想起当时的风、光，还有坐在我旁边的人。',
  images:[
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=88',
    'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=1200&q=88',
    'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=88',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=88',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=88'
  ]
};

function img(src,cls=''){return `<figure class="story-photo ${cls}"><img src="${src}" alt=""><figcaption>JUNE 18 · 2026</figcaption></figure>`}
function pickLayout(entry){
  const n=entry.images.length;
  if(n===0)return 'text';
  if(n===1)return 'solo';
  if(n===2)return 'duet';
  if(n===3)return 'trio';
  if(n<=6)return 'editorial';
  return 'essay';
}
function renderStory(entry){
  const flow=document.querySelector('#storyFlow');
  if(!flow)return;
  const mode=pickLayout(entry);flow.dataset.layout=mode;
  const [a,b,c,d,e]=entry.images;
  if(mode==='text') flow.innerHTML=`<section class="text-only story-reveal"><p class="kicker">A SMALL NOTE</p><blockquote>${entry.quote||entry.text}</blockquote><p>${entry.text}</p></section>`;
  else if(mode==='solo') flow.innerHTML=`<section class="solo-layout story-reveal">${img(a,'is-hero')}<div class="story-copy"><small>04:37 PM</small><h2>The sea was very quiet.</h2><p>${entry.text}</p></div></section>`;
  else if(mode==='duet') flow.innerHTML=`<section class="duet-layout story-reveal">${img(a,'is-large')}${img(b,'is-small')}<div class="story-copy"><small>THIS AFTERNOON</small><h2>Two frames from the same day.</h2><p>${entry.text}</p></div></section>`;
  else if(mode==='trio') flow.innerHTML=`<section class="trio-layout story-reveal">${img(a,'is-large')}${img(b,'is-tall')}${img(c,'is-small')}<div class="story-copy"><small>THE LIGHT CHANGED</small><h2>We stayed a little longer.</h2><p>${entry.text}</p></div></section>`;
  else flow.innerHTML=`
    <section class="opening-spread story-reveal"><div class="story-copy story-copy--lead"><small>04:37 PM</small><h2>The sea was very quiet.</h2><p>${entry.text}</p></div>${img(a,'is-wide')}</section>
    <section class="offset-pair story-reveal">${img(b,'is-tall')}${img(c,'is-small')}<div class="story-copy"><small>06:08 PM</small><h2>Nothing dramatic happened.</h2><p>${entry.note}</p></div></section>
    <section class="pull-quote story-reveal"><p>${entry.quote}</p></section>
    <section class="full-bleed-memory story-reveal">${img(d,'is-cinema')}</section>
    <section class="closing-pair story-reveal"><div class="story-copy"><small>ONE LAST FRAME</small><h2>Ordinary is enough.</h2><p>有些日子不是因为发生了什么才值得记住，而是因为后来想起来，会记得那时候身边是谁。</p></div>${img(e,'is-polaroid')}</section>
    <div class="story-end story-reveal"><small>NEXT MEMORY</small><br><a href="./day.html?day=19">June 19 →</a></div>`;
}
renderStory(demoEntry);

if(!reduce&&hero&&heroImage&&heroDate){
  const onScroll=()=>{const y=Math.min(innerHeight,scrollY);heroImage.style.setProperty('--hero-y',`${y*.12}px`);heroImage.style.setProperty('--hero-scale',String(1+y/innerHeight*.055));heroDate.style.setProperty('--date-y',`${y*.22}px`);hero.style.opacity=String(Math.max(.25,1-y/innerHeight*.7))};
  addEventListener('scroll',onScroll,{passive:true});onScroll();
}
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.16,rootMargin:'0px 0px -8%'});
document.querySelectorAll('.story-reveal').forEach(el=>observer.observe(el));
