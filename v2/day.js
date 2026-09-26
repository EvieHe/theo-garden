import {apiFetch,redirectToLogin,hydrateSignedUrls,isCloudBase} from './runtime.js';
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const hero=document.querySelector('.story-hero');
const heroImage=hero?.querySelector('img');
const heroDate=hero?.querySelector('.story-date');
const params=new URLSearchParams(location.search);
const requested=params.get('date');
const signedUrlByPath=new Map();
const mediaMetaByPath=new Map();
const assetUrl=path=>signedUrlByPath.get(path)||(isCloudBase?'':`/api/v1/assets?path=${encodeURIComponent(path)}`);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const weekdays=['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
const months=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
function frame(src,cls='',date=''){
 const meta=mediaMetaByPath.get(src);
 const photo=assetUrl(src);
 const motion=meta?.motion?.path?assetUrl(meta.motion.path):(meta?.motion?.url||'');
 if(motion){
  return `<figure class="story-photo ${cls} is-live"><div class="live-photo-player" data-photo-src="${esc(photo)}" data-video-src="${esc(motion)}" style="background-image:url('${esc(photo)}')"></div><span class="live-badge">LIVE</span><figcaption>${esc(date.replaceAll('-',' · '))}</figcaption></figure>`;
 }
 return `<figure class="story-photo ${cls}"><img src="${esc(photo)}" alt=""><figcaption>${esc(date.replaceAll('-',' · '))}</figcaption></figure>`;
}
function initLivePhotos(){
 const kit=window.LivePhotosKit;
 if(!kit)return;
 document.querySelectorAll('.live-photo-player:not([data-live-ready])').forEach(el=>{
  try{
   const player=new kit.Player(el);
   player.photoSrc=el.dataset.photoSrc;
   player.videoSrc=el.dataset.videoSrc;
   player.proactivelyLoadsVideo=false;
   if(kit.PlaybackStyle?.FULL)player.playbackStyle=kit.PlaybackStyle.FULL;
   el.dataset.liveReady='true';
  }catch(error){console.warn('Live Photo init failed',error)}
 });
}
function pickLayout(n){if(n===0)return'text';if(n===1)return'solo';if(n===2)return'duet';if(n===3)return'trio';if(n<=6)return'editorial';return'essay'}
function paragraphs(entries){return entries.filter(x=>x.text).map(x=>`<p><small>${esc(x.author||'')}</small>${esc(x.text).replaceAll('\n','<br>')}</p>`).join('')}
function renderStory(entries,date){
 const flow=document.querySelector('#storyFlow');const images=entries.flatMap(x=>Array.isArray(x.images)?x.images:[]);const copy=paragraphs(entries);const mode=pickLayout(images.length);flow.dataset.layout=mode;const [a,b,c,d,e,...rest]=images;
 const lead=copy||'<p>这一天留下了一些照片。</p>';
 if(mode==='text')flow.innerHTML=`<section class="text-only story-reveal"><p class="kicker">A SMALL NOTE</p><blockquote>${esc(entries.find(x=>x.text)?.text||'这一天也值得留下。')}</blockquote><div class="real-copy">${copy}</div></section>`;
 else if(mode==='solo')flow.innerHTML=`<section class="solo-layout story-reveal">${frame(a,'is-hero',date)}<div class="story-copy"><small>ONE FRAME</small><h2>This day, kept.</h2><div class="real-copy">${lead}</div></div></section>`;
 else if(mode==='duet')flow.innerHTML=`<section class="duet-layout story-reveal">${frame(a,'is-large',date)}${frame(b,'is-small',date)}<div class="story-copy"><small>TWO FRAMES</small><h2>The same day, twice remembered.</h2><div class="real-copy">${lead}</div></div></section>`;
 else if(mode==='trio')flow.innerHTML=`<section class="trio-layout story-reveal">${frame(a,'is-large',date)}${frame(b,'is-tall',date)}${frame(c,'is-small',date)}<div class="story-copy"><small>THREE FRAMES</small><h2>A little more to remember.</h2><div class="real-copy">${lead}</div></div></section>`;
 else flow.innerHTML=`<section class="opening-spread story-reveal"><div class="story-copy story-copy--lead"><small>THIS DAY</small><h2>A day worth keeping.</h2><div class="real-copy">${lead}</div></div>${frame(a,'is-wide',date)}</section><section class="offset-pair story-reveal">${frame(b,'is-tall',date)}${frame(c,'is-small',date)}<div class="story-copy"><small>MORE FRAMES</small><h2>Small pieces of the same day.</h2></div></section>${d?`<section class="full-bleed-memory story-reveal">${frame(d,'is-cinema',date)}</section>`:''}${e?`<section class="closing-pair story-reveal"><div class="story-copy"><small>ONE LAST FRAME</small><h2>Ordinary is enough.</h2></div>${frame(e,'is-polaroid',date)}</section>`:''}${rest.length?`<section class="film-strip story-reveal">${rest.map(x=>frame(x,'',date)).join('')}</section>`:''}`;
 observe();initLivePhotos();
}
function setHero(entries,date){const [y,m,d]=date.split('-').map(Number);const dt=new Date(y,m-1,d);document.title=`Theo Garden — ${months[m-1]} ${d}`;heroDate.querySelector('small').textContent=`${weekdays[dt.getDay()]} · ${months[m-1]}`;heroDate.querySelector('h1').textContent=d;heroDate.querySelector('p').textContent=entries.find(x=>x.text)?.text?.slice(0,48)||'One of our days.';const first=entries.flatMap(x=>x.images||[])[0];if(first)heroImage.src=assetUrl(first);else{heroImage.style.display='none';hero.classList.add('text-hero')}const back=document.querySelector('.story-nav a');back.href=`./diary.html?year=${y}&month=${m}`;back.textContent=`← ${months[m-1]}`}
let observer;
function observe(){observer?.disconnect();observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target)}}),{threshold:.14,rootMargin:'0px 0px -7%'});document.querySelectorAll('.story-reveal').forEach(el=>observer.observe(el))}
async function load(){try{const target=requested?`/api/notes?index=${encodeURIComponent(requested)}`:'/api/v1/notes';const res=await apiFetch(target.replace(/^\/api/,''),{cache:'no-store'});if(res.status===401){redirectToLogin();return}if(!res.ok)throw new Error(`notes_${res.status}`);const data=await res.json();const active=(data.items||[]).filter(x=>x&&!x.deletedAt&&x.day);for(const [path,url] of hydrateSignedUrls(active))signedUrlByPath.set(path,url);for(const item of active)for(const meta of item.imageMeta||[])if(meta?.path)mediaMetaByPath.set(meta.path,meta);const date=requested||active[0]?.day;if(!date)throw new Error('empty');const entries=active.filter(x=>x.day===date).sort((a,b)=>(a.ts||0)-(b.ts||0));if(!entries.length){document.querySelector('#storyFlow').innerHTML='<section class="text-only is-visible"><blockquote>这一天还没有留下内容。</blockquote></section>';return}setHero(entries,date);renderStory(entries,date)}catch(e){console.error(e);document.querySelector('#storyFlow').innerHTML='<section class="text-only is-visible"><blockquote>暂时没能取回这一天的记忆。</blockquote></section>'}}
if(!reduce&&hero&&heroImage&&heroDate){const onScroll=()=>{const y=Math.min(innerHeight,scrollY);heroImage.style.setProperty('--hero-y',`${y*.12}px`);heroImage.style.setProperty('--hero-scale',String(1+y/innerHeight*.055));heroDate.style.setProperty('--date-y',`${y*.22}px`);hero.style.opacity=String(Math.max(.25,1-y/innerHeight*.7))};addEventListener('scroll',onScroll,{passive:true});onScroll()}
load();