import { getSession, getNotes, getDateIdeas } from './api.js';

const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=id=>document.getElementById(id);

async function loadSceneImage(){
  const paths=['./assets/home-rain.part1.txt','./assets/home-rain.part2.txt','./assets/home-rain.part3.txt'];
  const parts=await Promise.all(paths.map(async path=>{
    const res=await fetch(path,{cache:'force-cache'});
    if(!res.ok)throw new Error('scene_asset_'+res.status);
    return res.text();
  }));
  const src='data:image/webp;base64,'+parts.join('');
  document.querySelectorAll('[data-scene-image]').forEach(img=>{img.src=src});
}
function bindSceneMotion(){
  if(reduce)return;
  const scene=document.querySelector('.scene');
  if(!scene)return;
  let tx=0,ty=0,cx=0,cy=0;
  const tick=()=>{
    cx+=(tx-cx)*.05;cy+=(ty-cy)*.05;
    scene.style.setProperty('--bg-x',(cx*-3).toFixed(2)+'px');
    scene.style.setProperty('--bg-y',(cy*-2).toFixed(2)+'px');
    scene.style.setProperty('--scene-x',(cx*5).toFixed(2)+'px');
    scene.style.setProperty('--scene-y',(cy*3).toFixed(2)+'px');
    requestAnimationFrame(tick);
  };
  addEventListener('pointermove',e=>{tx=(e.clientX/innerWidth-.5)*2;ty=(e.clientY/innerHeight-.5)*2},{passive:true});
  addEventListener('pointerleave',()=>{tx=0;ty=0});
  tick();
}
function activeNotes(notes){return notes.filter(note=>note&&note.day&&!note.deletedAt)}
async function bootstrap(){
  const session=await getSession();
  if(!session?.ok){location.replace('/?next='+encodeURIComponent(location.pathname+location.search+location.hash));return}
  loadSceneImage().catch(err=>console.warn('scene image failed',err));
  bindSceneMotion();
  const [notesResult,ideasResult]=await Promise.allSettled([getNotes(),getDateIdeas()]);
  const notes=activeNotes(notesResult.status==='fulfilled'?notesResult.value:[]);
  const ideas=ideasResult.status==='fulfilled'?ideasResult.value:[];
  const photos=notes.reduce((sum,n)=>sum+(Array.isArray(n.images)?n.images.length:0),0);
  $('memoryCount').textContent=String(notes.length);
  $('photoCount').textContent=String(photos);
  $('ideaCount').textContent=String(ideas.length);
  const latest=notes[0];
  if(latest){$('recentDate').textContent=latest.day.replaceAll('-',' · ');$('recentText').textContent=String(latest.text||'这一天留下了一点东西。').trim()||'这一天留下了一点东西。'}
}
bootstrap().catch(err=>{console.error(err);$('recentText').textContent='The garden is resting for a moment.'});
