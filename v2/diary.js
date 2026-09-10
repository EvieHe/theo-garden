const host=document.querySelector('#days');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const params=new URLSearchParams(location.search);
let viewYear=Number(params.get('year'))||new Date().getFullYear();
let viewMonth=Number(params.get('month'))||new Date().getMonth()+1;
let allItems=[];

const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
const assetUrl=path=>`/api/v1/assets?path=${encodeURIComponent(path)}`;
const active=item=>item&&!item.deletedAt&&item.day;

function groupedForMonth(){
  const prefix=`${viewYear}-${String(viewMonth).padStart(2,'0')}-`;
  const map=new Map();
  allItems.filter(active).filter(x=>String(x.day).startsWith(prefix)).forEach(item=>{
    const d=Number(String(item.day).slice(-2));
    if(!map.has(d))map.set(d,[]);
    map.get(d).push(item);
  });
  return map;
}
function render(){
  const grouped=groupedForMonth();
  const monthName=monthNames[viewMonth-1];
  document.querySelector('.month-intro>p:first-child').textContent=`${String(viewMonth).padStart(2,'0')} / ${viewYear}`;
  const monthTitle=document.querySelector('.month-intro h1');
  monthTitle.textContent=monthName;
  monthTitle.dataset.longMonth=String(monthName.length>=8);
  document.querySelector('.month-line small').textContent=`${String(grouped.size).padStart(2,'0')} memories kept this month`;
  document.querySelector('.year').textContent=viewYear;
  document.querySelector('.bottom-glass span').textContent=`${monthName} · ${viewYear}`;
  host.innerHTML='';
  const first=new Date(viewYear,viewMonth-1,1).getDay();
  const count=new Date(viewYear,viewMonth,0).getDate();
  for(let i=0;i<first;i++){const blank=document.createElement('span');blank.className='day';host.append(blank)}
  for(let d=1;d<=count;d++){
    const entries=grouped.get(d)||[];
    const images=entries.flatMap(x=>Array.isArray(x.images)?x.images:[]);
    if(entries.length){
      const a=document.createElement('a');a.className=`day has-memory${images.length?'':' text-memory'}`;a.href=`./day.html?date=${viewYear}-${String(viewMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;a.style.setProperty('--i',d);a.setAttribute('aria-label',`Open ${monthName} ${d}`);
      a.innerHTML=images.length?`<img src="${assetUrl(images[0])}" alt=""><span class="num">${d}</span>`:`<span class="text-date">${d}</span>`;
      a.addEventListener('click',event=>transitionToDay(event,a));host.append(a);
    }else{const el=document.createElement('span');el.className='day';el.style.setProperty('--i',d);el.textContent=d;host.append(el)}
  }
}
function transitionToDay(event,a){
  if(reduced)return;
  event.preventDefault();
  if(a.classList.contains('text-memory')){
    a.animate([{opacity:1,transform:'scale(1)'},{opacity:.35,transform:'scale(.92)'}],{duration:260,easing:'cubic-bezier(.22,.82,.24,1)',fill:'forwards'});
    document.querySelector('.calendar')?.animate([{opacity:1},{opacity:.86}],{duration:260,fill:'forwards'});
    setTimeout(()=>location.href=a.href,220);
    return;
  }
  const r=a.getBoundingClientRect();const clone=a.cloneNode(true);Object.assign(clone.style,{position:'fixed',left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`,margin:'0',zIndex:'99',transition:'all .72s cubic-bezier(.22,.82,.24,1)',pointerEvents:'none'});document.body.append(clone);requestAnimationFrame(()=>Object.assign(clone.style,{left:'19vw',top:'12vh',width:'62vw',height:'76vh',borderRadius:'46% 46% 4px 4px',opacity:'.96'}));setTimeout(()=>location.href=a.href,570)}
async function load(){
  try{const res=await fetch('/api/v1/notes',{cache:'no-store'});if(res.status===401){location.replace('/?next='+encodeURIComponent(location.pathname+location.search));return}if(!res.ok)throw new Error(`notes_${res.status}`);const data=await res.json();allItems=Array.isArray(data.items)?data.items:[];
    if(!params.has('year')&&!params.has('month')){const latest=allItems.find(active);if(latest){const [y,m]=latest.day.split('-').map(Number);viewYear=y;viewMonth=m}}
    render();
  }catch(err){console.error(err);document.querySelector('.month-line small').textContent='Memories are resting for a moment.'}
}
function moveMonth(delta){viewMonth+=delta;if(viewMonth<1){viewMonth=12;viewYear--}if(viewMonth>12){viewMonth=1;viewYear++}history.replaceState(null,'',`?year=${viewYear}&month=${viewMonth}`);render()}
const buttons=document.querySelectorAll('.bottom-glass button');buttons[0]?.addEventListener('click',()=>moveMonth(-1));buttons[1]?.addEventListener('click',()=>moveMonth(1));
const light=document.querySelector('.pointer-light'),world=document.querySelector('.diary-world__image'),calendar=document.querySelector('.calendar');
if(!reduced){let tx=0,ty=0,cx=0,cy=0;const animate=()=>{cx+=(tx-cx)*.055;cy+=(ty-cy)*.055;if(light){light.style.left=`${innerWidth*(.5+cx)}px`;light.style.top=`${innerHeight*(.5+cy)}px`}if(world)world.style.transform=`scale(1.09) translate3d(${cx*-2.4}%,${cy*-1.8}%,0)`;if(calendar)calendar.style.transform=`translateY(10px) rotateX(${cy*-1.2}deg) rotateY(${cx*1.4}deg)`;requestAnimationFrame(animate)};addEventListener('pointermove',e=>{tx=e.clientX/innerWidth-.5;ty=e.clientY/innerHeight-.5},{passive:true});addEventListener('pointerleave',()=>{tx=0;ty=0});animate()}
load();