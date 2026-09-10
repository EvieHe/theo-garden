const timeline=document.querySelector('#diaryTimeline');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const params=new URLSearchParams(location.search);
let viewYear=Number(params.get('year'))||new Date().getFullYear();
let viewMonth=Number(params.get('month'))||new Date().getMonth()+1;
let wheelLocked=false;
let monthVisibilityObserver;
let appendObserver;
let imageObserver;
let exifObserver;
const monthCache=new Map();
const dayCache=new Map();
let catalogItems=[];
const renderedMonths=new Set();
const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
const weekdays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const assetUrl=path=>`/api/v1/assets?path=${encodeURIComponent(path)}`;
const active=item=>item&&!item.deletedAt&&item.day;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const key=(y,m)=>`${y}-${pad(m)}`;
function addMonth(y,m,delta=1){m+=delta;while(m>12){m-=12;y++}while(m<1){m+=12;y--}return[y,m]}
function groupByDay(items){const map=new Map();items.forEach(item=>{if(!map.has(item.day))map.set(item.day,[]);map.get(item.day).push(item)});return map}
async function fetchJsonNotes(url){
 const res=await fetch(url,{cache:'no-store'});
 if(res.status===401){location.replace('/?next='+encodeURIComponent(location.pathname+location.search));throw new Error('unauthorized')}
 if(!res.ok)throw new Error(`notes_${res.status}`);
 return res.json();
}
async function ensureCatalog(){
 if(catalogItems.length)return catalogItems;
 const data=await fetchJsonNotes('/api/v1/notes');
 catalogItems=Array.isArray(data.items)?data.items:[];
 return catalogItems;
}
async function fetchDay(day){
 if(dayCache.has(day))return dayCache.get(day);
 const data=await fetchJsonNotes(`/api/v1/notes?index=${encodeURIComponent(day)}`);
 const items=(Array.isArray(data.items)?data.items:[]).filter(active).map(item=>({...item,day:item.day||day})).sort((a,b)=>(a.ts||0)-(b.ts||0));
 dayCache.set(day,items);
 return items;
}
async function fetchMonth(y,m){
 const monthKey=key(y,m);
 if(monthCache.has(monthKey))return monthCache.get(monthKey);
 const catalog=await ensureCatalog();
 const days=[...new Set(catalog.filter(active).map(item=>String(item.day)).filter(day=>day.startsWith(monthKey+'-')))];
 const groups=await Promise.all(days.map(fetchDay));
 const items=groups.flat().sort((a,b)=>(a.ts||0)-(b.ts||0));
 monthCache.set(monthKey,items);
 return items;
}
function lazyImage(path,alt=''){return `<img loading="lazy" decoding="async" data-src="${assetUrl(path)}" alt="${esc(alt)}">`}
function renderCalendar(y,m,items){
 const grouped=groupByDay(items),first=new Date(y,m-1,1).getDay(),count=new Date(y,m,0).getDate(),name=monthNames[m-1];let days='';
 for(let i=0;i<first;i++)days+='<span class="day"></span>';
 for(let d=1;d<=count;d++){
  const date=`${key(y,m)}-${pad(d)}`,entries=grouped.get(date)||[],images=entries.flatMap(x=>Array.isArray(x.images)?x.images:[]);
  if(entries.length){
   days+=images.length
    ?`<a class="day has-memory" href="./day.html?date=${date}" aria-label="Open ${name} ${d}">${lazyImage(images[0])}<span class="num">${d}</span></a>`
    :`<a class="day has-memory text-memory" href="./day.html?date=${date}" aria-label="Open ${name} ${d}"><span class="text-date">${d}</span></a>`;
  }else days+=`<span class="day">${d}</span>`;
 }
 return `<section class="month-calendar" data-month="${key(y,m)}"><section class="month-intro"><p>${pad(m)} / ${y}</p><h1 data-long-month="${String(name.length>=8)}">${name}</h1><p class="whisper">Some days leave a trace.</p><div class="month-line"><span></span><small>${pad(grouped.size)} memories kept this month</small></div></section><section class="calendar glass-surface" aria-label="${name} ${y} diary calendar"><div class="weekdays"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div class="days">${days}</div></section><div class="swipe-hint">Swipe sideways for another month</div></section>`;
}
function formatRecordTime(ts){if(!ts)return'';const d=new Date(ts);return `${pad(d.getHours())}:${pad(d.getMinutes())}`}
function renderShot(path,entry){
 const fallback=formatRecordTime(entry.ts);
 return `<figure class="memory-shot" data-path="${esc(path)}">${lazyImage(path,'Memory photograph')}<figcaption class="photo-time" data-fallback="${esc(fallback)}">Capture time pending</figcaption></figure>`;
}
function renderEntry(entry){
 const images=Array.isArray(entry.images)?entry.images:[];
 return `<article class="memory-entry"><div class="memory-entry__visual">${images.map(p=>renderShot(p,entry)).join('')}</div><div class="memory-entry__copy"><span class="author">${esc(entry.author||'Us')}</span>${entry.text?`<p>${esc(entry.text)}</p>`:''}</div></article>`;
}
function renderMemories(y,m,items){
 const grouped=groupByDay(items),name=monthNames[m-1];
 if(!items.length)return `<section class="month-memories"><header class="month-memories__head"><h2>${name}, quietly.</h2><p>No memory was recorded here yet.</p></header><div class="month-empty">This month is still open.</div></section>`;
 let body='';
 [...grouped.entries()].forEach(([date,entries])=>{
  const [,mm,dd]=date.split('-').map(Number),dt=new Date(y,mm-1,dd);
  body+=`<section class="memory-day"><aside class="memory-day__date"><strong>${dd}</strong><span>${weekdays[dt.getDay()]} · ${name}</span></aside><div>${entries.map(renderEntry).join('')}</div></section>`;
 });
 return `<section class="month-memories"><header class="month-memories__head"><h2>${name} in frames.</h2><p>Every photograph and every note from this month, in the order they were left behind.</p></header>${body}</section>`;
}
function makeMonthSection(y,m,items=[]){
 const section=document.createElement('section');
 section.className='month-section';
 section.dataset.month=key(y,m);
 section.innerHTML=`${renderCalendar(y,m,items)}${renderMemories(y,m,items)}<div class="month-divider"></div><div class="month-append-sentinel" aria-hidden="true"></div>`;
 return section;
}
function updateChrome(y,m,replaceUrl=true){
 viewYear=y;viewMonth=m;
 document.querySelector('.year').textContent=y;
 document.querySelector('.bottom-glass span').textContent=`${monthNames[m-1]} · ${y}`;
 if(replaceUrl)history.replaceState(null,'',`?year=${y}&month=${m}`);
}
function ensureObservers(){
 if(!imageObserver)imageObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(!entry.isIntersecting)return;
  imageObserver.unobserve(entry.target);
  const src=entry.target.dataset.src;
  if(src&&!entry.target.src)entry.target.src=src;
 }),{rootMargin:'420px 0px'});
 if(!exifObserver)exifObserver=new IntersectionObserver(entries=>entries.forEach(async entry=>{
  if(!entry.isIntersecting)return;
  exifObserver.unobserve(entry.target);
  const cap=entry.target.querySelector('.photo-time');
  const result=await captureTime(entry.target.dataset.path,cap?.dataset.fallback||'');
  if(cap){cap.textContent=result.label;cap.dataset.source=result.source}
 }),{rootMargin:'320px 0px'});
 if(!monthVisibilityObserver)monthVisibilityObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(!entry.isIntersecting)return;
  const [y,m]=entry.target.dataset.month.split('-').map(Number);
  updateChrome(y,m,true);
 }),{threshold:.45});
 if(!appendObserver)appendObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(!entry.isIntersecting)return;
  appendObserver.unobserve(entry.target);
  const section=entry.target.closest('.month-section');
  if(section)appendNextMonth(section);
 }),{rootMargin:'0px 0px 650px 0px'});
}
function bindPhotoInteraction(shot){
 if(reduced||shot.dataset.pointerBound)return;
 shot.dataset.pointerBound='true';
 shot.addEventListener('pointermove',e=>{
  const r=shot.getBoundingClientRect();
  const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
  shot.classList.add('is-near');
  shot.style.setProperty('--ry',`${Math.max(-2,Math.min(2,x*3.2))}deg`);
  shot.style.setProperty('--rx',`${Math.max(-1.8,Math.min(1.8,-y*2.8))}deg`);
 },{passive:true});
 shot.addEventListener('pointerleave',()=>{
  shot.classList.remove('is-near');
  shot.style.removeProperty('--rx');shot.style.removeProperty('--ry');
 },{passive:true});
}
function hydrateSection(section){
 ensureObservers();
 section.querySelectorAll('img[data-src]').forEach(img=>imageObserver.observe(img));
 section.querySelectorAll('.memory-shot').forEach(shot=>{exifObserver.observe(shot);bindPhotoInteraction(shot)});
 const calendar=section.querySelector('.month-calendar');
 if(calendar){bindCalendarNavigation(calendar);monthVisibilityObserver.observe(calendar)}
 const sentinel=section.querySelector('.month-append-sentinel');
 if(sentinel)appendObserver.observe(sentinel);
}
async function fillSection(section,y,m){
 try{
  const items=await fetchMonth(y,m);
  if(!section.isConnected)return;
  const fresh=makeMonthSection(y,m,items);
  section.replaceChildren(...fresh.childNodes);
  hydrateSection(section);
 }catch(err){
  if(err.message==='unauthorized')return;
  console.error(err);
  section.querySelector('.month-memories')?.replaceWith(Object.assign(document.createElement('section'),{className:'month-empty',textContent:'Memories are resting for a moment.'}));
 }
}
async function appendNextMonth(section){
 const [y,m]=section.dataset.month.split('-').map(Number);
 const [ny,nm]=addMonth(y,m,1),monthKey=key(ny,nm);
 if(renderedMonths.has(monthKey))return;
 const next=makeMonthSection(ny,nm);
 renderedMonths.add(monthKey);
 timeline.append(next);
 hydrateSection(next);
 await fillSection(next,ny,nm);
}
async function renderTimeline(direction=0){
 ensureObservers();
 monthVisibilityObserver.disconnect();appendObserver.disconnect();imageObserver.disconnect();exifObserver.disconnect();
 renderedMonths.clear();
 const section=makeMonthSection(viewYear,viewMonth);
 renderedMonths.add(key(viewYear,viewMonth));
 timeline.replaceChildren(section);
 updateChrome(viewYear,viewMonth,true);
 const first=section.querySelector('.month-calendar');
 if(first&&!reduced){first.style.setProperty('--from-x',direction>0?'55px':'-55px');first.classList.add('is-entering')}
 hydrateSection(section);
 await fillSection(section,viewYear,viewMonth);
}
function shiftMonth(delta){
 const [y,m]=addMonth(viewYear,viewMonth,delta);
 const current=timeline.querySelector('.month-calendar');
 const finish=()=>{viewYear=y;viewMonth=m;renderTimeline(delta);scrollTo({top:0,behavior:'instant'})};
 if(current&&!reduced){current.classList.add(delta>0?'is-leaving-left':'is-leaving-right');setTimeout(finish,300)}else finish();
}
function bindCalendarNavigation(calendar){
 if(calendar.dataset.navBound)return;
 calendar.dataset.navBound='true';
 let sx=0,sy=0,activePointer=false;
 calendar.addEventListener('pointerdown',e=>{sx=e.clientX;sy=e.clientY;activePointer=true});
 calendar.addEventListener('pointercancel',()=>{activePointer=false});
 calendar.addEventListener('pointerup',e=>{
  if(!activePointer)return;activePointer=false;
  const dx=e.clientX-sx,dy=e.clientY-sy;
  if(Math.abs(dx)>64&&Math.abs(dx)>Math.abs(dy)*1.25)shiftMonth(dx<0?1:-1);
 });
 calendar.addEventListener('wheel',e=>{
  if(wheelLocked||Math.abs(e.deltaX)<34||Math.abs(e.deltaX)<=Math.abs(e.deltaY))return;
  e.preventDefault();wheelLocked=true;shiftMonth(e.deltaX>0?1:-1);setTimeout(()=>wheelLocked=false,700);
 },{passive:false});
}
const buttons=document.querySelectorAll('.bottom-glass button');
buttons[0]?.addEventListener('click',()=>shiftMonth(-1));
buttons[1]?.addEventListener('click',()=>shiftMonth(1));
async function captureTime(path,fallback){
 try{
  const res=await fetch(assetUrl(path));if(!res.ok)throw 0;
  const buf=await res.arrayBuffer(),exif=readExifDate(buf);
  if(exif)return{label:`Captured · ${exif.slice(11,16)}`,source:'exif'};
 }catch{}
 return{label:fallback?`Recorded · ${fallback}`:'Time unavailable',source:'record'};
}
function readExifDate(buffer){
 const v=new DataView(buffer);if(v.byteLength<12||v.getUint16(0)!==0xffd8)return null;let off=2;
 while(off+4<v.byteLength){
  if(v.getUint8(off)!==0xff)break;const marker=v.getUint8(off+1),len=v.getUint16(off+2);
  if(marker===0xe1&&off+2+len<=v.byteLength){
   const start=off+4;
   if(v.getUint32(start)===0x45786966){
    const tiff=start+6,little=v.getUint16(tiff)===0x4949,u16=p=>v.getUint16(p,little),u32=p=>v.getUint32(p,little);
    if(u16(tiff+2)!==42)return null;
    const ifd0=tiff+u32(tiff+4),exifPtr=findTag(ifd0,0x8769,u16,u32,v,tiff);
    if(exifPtr){
     const exifIfd=tiff+exifPtr,raw=findAsciiTag(exifIfd,0x9003,u16,u32,v,tiff)||findAsciiTag(exifIfd,0x9004,u16,u32,v,tiff);
     if(raw)return raw.replace(/(\d{4}):(\d{2}):(\d{2})/,'$1-$2-$3');
    }
   }
  }
  off+=2+len;
 }
 return null;
}
function findTag(ifd,tag,u16,u32,v,tiff){if(ifd+2>v.byteLength)return 0;const n=u16(ifd);for(let i=0;i<n;i++){const p=ifd+2+i*12;if(p+12>v.byteLength)break;if(u16(p)===tag)return u32(p+8)}return 0}
function findAsciiTag(ifd,tag,u16,u32,v,tiff){if(ifd+2>v.byteLength)return null;const n=u16(ifd);for(let i=0;i<n;i++){const p=ifd+2+i*12;if(p+12>v.byteLength)break;if(u16(p)!==tag)continue;const count=u32(p+4),pos=count<=4?p+8:tiff+u32(p+8);if(pos+count>v.byteLength)return null;let s='';for(let j=0;j<count-1;j++)s+=String.fromCharCode(v.getUint8(pos+j));return s}return null}
if(!reduced){
 const light=document.querySelector('.pointer-light'),world=document.querySelector('.diary-world__image');let tx=0,ty=0,cx=0,cy=0;
 const animate=()=>{cx+=(tx-cx)*.055;cy+=(ty-cy)*.055;if(light){light.style.left=`${innerWidth*(.5+cx)}px`;light.style.top=`${innerHeight*(.5+cy)}px`}if(world)world.style.transform=`scale(1.09) translate3d(${cx*-1.8}%,${cy*-1.2}%,0)`;requestAnimationFrame(animate)};
 addEventListener('pointermove',e=>{tx=e.clientX/innerWidth-.5;ty=e.clientY/innerHeight-.5},{passive:true});
 addEventListener('pointerleave',()=>{tx=0;ty=0});animate();
}
renderTimeline();
