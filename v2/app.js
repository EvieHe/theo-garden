import { getSession, getNotes, getDateIdeas } from './api.js';
import {redirectToLogin} from './runtime.js';

const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=id=>document.getElementById(id);

const SITE_ASSET_BASE='https://moments1-d0ginpt1r80945f2c.api.tcloudbasegateway.com/v1/storages/object/garden-site-assets';
const siteAsset=name=>`${SITE_ASSET_BASE}/${encodeURIComponent(name)}`;
function imageAvailable(src){
  return new Promise(resolve=>{
    const probe=new Image();
    const done=value=>{probe.onload=null;probe.onerror=null;resolve(value)};
    probe.onload=()=>done(true);
    probe.onerror=()=>done(false);
    probe.src=src;
  });
}
async function loadSceneImage(){
  const fallback='./assets/hero-home-01_20_39.png';
  const candidate=siteAsset('hero-main.webp');
  const src=await imageAvailable(candidate)?candidate:fallback;
  document.querySelectorAll('[data-scene-image]').forEach(img=>{img.src=src});
}
async function loadWorldScene(){
  const candidate=siteAsset('world-section.webp');
  if(!await imageAvailable(candidate))return;
  const img=$('worldScene'),wrap=$('worldSceneWrap');
  if(img&&wrap){img.src=candidate;wrap.hidden=false}
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
  if(!session?.ok){redirectToLogin();return}
  loadSceneImage().catch(err=>console.warn('scene image failed',err));
  loadWorldScene().catch(err=>console.warn('world scene failed',err));
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
  const latestWithPhoto=notes.find(note=>Array.isArray(note.imageMeta)&&note.imageMeta.some(media=>media?.url));
  const latestPhoto=latestWithPhoto?.imageMeta?.find(media=>media?.url);
  if(latestPhoto?.url){
    $('recentPhoto').src=latestPhoto.url;
    $('recentPhotoWrap').hidden=false;
  }
}
bootstrap().catch(err=>{console.error(err);$('recentText').textContent='The garden is resting for a moment.'});
