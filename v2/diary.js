const memories={3:'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=80',7:'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=500&q=80',12:'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=500&q=80',18:'https://images.unsplash.com/photo-1500534314209-a25ddb2bd4297?auto=format&fit=crop&w=500&q=80',21:'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=500&q=80',24:'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=500&q=80',28:'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=500&q=80'};
const host=document.querySelector('#days');
for(let i=0;i<1;i++){const blank=document.createElement('span');blank.className='day';blank.style.setProperty('--i',i);host.append(blank)}
for(let d=1;d<=30;d++){
  if(memories[d]){
    const a=document.createElement('a');a.className='day has-memory';a.href=`./day.html?day=${d}`;a.style.setProperty('--i',d);a.setAttribute('aria-label',`Open June ${d}`);a.innerHTML=`<img src="${memories[d]}" alt=""><span class="num">${d}</span>`;
    a.addEventListener('click',event=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;event.preventDefault();const r=a.getBoundingClientRect();const clone=a.cloneNode(true);Object.assign(clone.style,{position:'fixed',left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`,margin:'0',zIndex:'99',transition:'all .72s cubic-bezier(.22,.82,.24,1)',pointerEvents:'none'});document.body.append(clone);requestAnimationFrame(()=>Object.assign(clone.style,{left:'19vw',top:'12vh',width:'62vw',height:'76vh',borderRadius:'46% 46% 4px 4px',opacity:'.96'}));setTimeout(()=>location.href=a.href,570)});
    host.append(a)
  }else{const el=document.createElement('span');el.className='day';el.style.setProperty('--i',d);el.textContent=d;host.append(el)}
}
const light=document.querySelector('.pointer-light');
if(light&&!matchMedia('(prefers-reduced-motion: reduce)').matches){window.addEventListener('pointermove',e=>{light.style.left=`${e.clientX}px`;light.style.top=`${e.clientY}px`;document.querySelector('.diary-world__image')?.style.setProperty('transform',`scale(1.08) translate3d(${(e.clientX/innerWidth-.5)*-1.4}%,${(e.clientY/innerHeight-.5)*-1.1}%,0)`)},{passive:true})}
