import {apiFetch,redirectToLogin,isCloudBase} from './runtime.js';

const picker=document.querySelector('#picker');
const daysEl=document.querySelector('#days');
const summaryEl=document.querySelector('#summary');
const uploadAll=document.querySelector('#uploadAll');
const overall=document.querySelector('#overall');
let assets=[];

const IMAGE_EXT=new Set(['jpg','jpeg','png','webp','heic','heif']);
const VIDEO_EXT=new Set(['mov','mp4']);

function ext(name){return String(name||'').split('.').pop().toLowerCase()}
function baseName(name){return String(name||'').replace(/\.[^.]+$/,'').toLowerCase()}
function isImage(file){return String(file.type||'').startsWith('image/')||IMAGE_EXT.has(ext(file.name))}
function isVideo(file){return String(file.type||'').startsWith('video/')||VIDEO_EXT.has(ext(file.name))}
function mimeFor(file){
 const type=String(file.type||'').toLowerCase();
 if(type)return type;
 const e=ext(file.name);
 return ({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',heic:'image/heic',heif:'image/heif',mov:'video/quicktime',mp4:'video/mp4'})[e]||'application/octet-stream';
}
function pad(n){return String(n).padStart(2,'0')}
function localDay(date){return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`}
function fmtTime(date){return `${pad(date.getHours())}:${pad(date.getMinutes())}`}
function sizeText(bytes){if(bytes<1024*1024)return Math.round(bytes/1024)+' KB';return (bytes/1024/1024).toFixed(1)+' MB'}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

async function captureTime(file){
 let date=null,source='文件时间';
 try{
  if(window.exifr&&isImage(file)){
   const meta=await window.exifr.parse(file);
   const value=meta?.DateTimeOriginal||meta?.CreateDate||meta?.ModifyDate;
   if(value){
    const parsed=value instanceof Date?value:new Date(value);
    if(!Number.isNaN(parsed.getTime())){date=parsed;source='EXIF'}
   }
  }
 }catch(error){console.warn('EXIF read failed',file.name,error)}
 if(!date){
  const fallback=new Date(Number(file.lastModified)||Date.now());
  date=Number.isNaN(fallback.getTime())?new Date():fallback;
 }
 return {date,source};
}

async function digestTextAndSlices(file){
 const head=await file.slice(0,64*1024).arrayBuffer();
 const tailStart=Math.max(0,file.size-64*1024);
 const tail=await file.slice(tailStart).arrayBuffer();
 const meta=new TextEncoder().encode(`${file.name}\n${file.size}\n${file.lastModified}\n${mimeFor(file)}`);
 const total=new Uint8Array(meta.length+head.byteLength+tail.byteLength);
 total.set(meta,0);total.set(new Uint8Array(head),meta.length);total.set(new Uint8Array(tail),meta.length+head.byteLength);
 const hash=await crypto.subtle.digest('SHA-256',total);
 return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function digestString(value){
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}

async function makeAsset(still,motion=null){
 const taken=await captureTime(still);
 const stillHash=await digestTextAndSlices(still);
 const motionHash=motion?await digestTextAndSlices(motion):'';
 const assetId=(motion?await digestString(stillHash+':'+motionHash):stillHash).slice(0,40);
 let previewUrl='';
 try{previewUrl=URL.createObjectURL(still)}catch{}
 return {
  assetId,
  pairId:motion?assetId:null,
  still,motion,
  isLive:Boolean(motion),
  capturedAt:taken.date.toISOString(),
  day:localDay(taken.date),
  time:fmtTime(taken.date),
  source:taken.source,
  previewUrl,
  state:'ready',
  message:'等待上传'
 };
}

async function inspect(files){
 overall.textContent='正在读取照片时间…';
 uploadAll.disabled=true;
 const groups=new Map();
 const unsupported=[];
 for(const file of files){
  if(!isImage(file)&&!isVideo(file)){unsupported.push(file);continue}
  const key=baseName(file.name);
  const group=groups.get(key)||{images:[],videos:[]};
  (isImage(file)?group.images:group.videos).push(file);
  groups.set(key,group);
 }
 const next=[];
 for(const group of groups.values()){
  while(group.images.length&&group.videos.length){
   next.push(await makeAsset(group.images.shift(),group.videos.shift()));
  }
  for(const image of group.images)next.push(await makeAsset(image));
  for(const video of group.videos){
   next.push({
    assetId:null,still:null,motion:video,isLive:false,day:'',
    capturedAt:null,time:'',source:'',previewUrl:'',state:'unsupported',
    message:'找不到同名静态照片，暂不单独上传视频'
   });
  }
 }
 assets=next.sort((a,b)=>String(a.capturedAt||'').localeCompare(String(b.capturedAt||'')));
 render();
 if(unsupported.length)overall.textContent=`已忽略 ${unsupported.length} 个不支持的文件。`;
 else overall.textContent='时间识别完成。确认日期后可以上传。';
 uploadAll.disabled=!assets.some(x=>x.state==='ready');
}

function groupByDay(){
 const map=new Map();
 for(const asset of assets){
  const key=asset.day||'未识别';
  const list=map.get(key)||[];list.push(asset);map.set(key,list);
 }
 return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
}

function render(){
 const valid=assets.filter(x=>x.state!=='unsupported');
 const live=valid.filter(x=>x.isLive).length;
 summaryEl.innerHTML=assets.length?[
  `<span class="chip">${valid.length} 个照片资产</span>`,
  `<span class="chip">${live} 个 Live Photo</span>`,
  `<span class="chip">${new Set(valid.map(x=>x.day)).size} 天</span>`
 ].join(''):'';

 if(!assets.length){
  daysEl.innerHTML='<p class="empty">还没有选择照片。</p>';
  uploadAll.disabled=true;return;
 }
 daysEl.innerHTML=groupByDay().map(([day,list])=>`
  <section class="day">
   <div class="day-head"><h2>${esc(day)}</h2><small>${list.filter(x=>x.state!=='unsupported').length} items</small></div>
   <div class="assets">
    ${list.map(asset=>{
      const i=assets.indexOf(asset);
      const file=asset.still||asset.motion;
      const thumb=asset.previewUrl&&asset.still
        ?`<img src="${esc(asset.previewUrl)}" alt="">`
        :`<span>${asset.motion?'MOV':'PHOTO'}</span>`;
      const kind=asset.isLive?'<span class="live">LIVE</span>':'';
      return `<article class="asset" data-i="${i}">
        <div class="thumb">${thumb}</div>
        <div class="meta">
          <strong>${esc(file?.name||'Unknown')}</strong>
          ${kind}
          <span>${asset.time?`${asset.time} · ${asset.source} · `:''}${file?sizeText(file.size):''}${asset.motion&&asset.still?` + ${sizeText(asset.motion.size)} motion`:''}</span>
          ${asset.state!=='unsupported'?`<input class="date-edit" type="date" value="${esc(asset.day)}" aria-label="归档日期">`:''}
        </div>
        <div class="state ${asset.state==='done'?'ok':asset.state==='error'||asset.state==='unsupported'?'bad':''}">${esc(asset.message)}</div>
      </article>`;
    }).join('')}
   </div>
  </section>`).join('');

 daysEl.querySelectorAll('.asset').forEach(el=>{
  const asset=assets[Number(el.dataset.i)];
  const input=el.querySelector('.date-edit');
  if(input)input.onchange=()=>{asset.day=input.value;render();};
 });
 uploadAll.disabled=!assets.some(x=>x.state==='ready'||x.state==='error');
}

async function signAndUpload(file,asset,kind){
 const body={
  day:asset.day,
  capturedAt:asset.capturedAt,
  assetId:asset.assetId,
  pairId:asset.pairId,
  kind,
  fileName:file.name,
  mimeType:mimeFor(file),
  size:file.size
 };
 const signedRes=await apiFetch('/uploads/sign',{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify(body)
 });
 if(signedRes.status===401){redirectToLogin();throw new Error('登录已过期')}
 const signedJson=await signedRes.json().catch(()=>({}));
 if(!signedRes.ok)throw new Error(signedJson?.error?.message||`签名失败 ${signedRes.status}`);
 const signed=signedJson.data;
 const uploaded=await fetch(signed.uploadUrl,{
  method:'PUT',
  headers:{'content-type':mimeFor(file)},
  body:file
 });
 if(!uploaded.ok){
  const text=await uploaded.text().catch(()=>'');
  throw new Error(`上传失败 ${uploaded.status}${text?': '+text.slice(0,120):''}`);
 }
 return {
  kind,
  storagePath:signed.storagePath,
  fileName:file.name,
  mimeType:mimeFor(file),
  size:file.size,
  pairId:asset.pairId
 };
}

async function uploadAsset(asset){
 if(!asset.still||!asset.assetId||!asset.day)throw new Error('照片信息不完整');
 asset.state='uploading';asset.message='上传中…';render();
 try{
  const files=[];
  files.push(await signAndUpload(asset.still,asset,asset.isLive?'live_still':'photo'));
  if(asset.motion)files.push(await signAndUpload(asset.motion,asset,'live_motion'));
  const commit=await apiFetch('/uploads/commit',{
   method:'POST',
   headers:{'content-type':'application/json'},
   body:JSON.stringify({
    assetId:asset.assetId,
    day:asset.day,
    capturedAt:asset.capturedAt,
    files
   })
  });
  const data=await commit.json().catch(()=>({}));
  if(!commit.ok)throw new Error(data?.error?.message||`写入失败 ${commit.status}`);
  asset.state='done';asset.message=asset.isLive?'✓ Live Photo 已归档':'✓ 已归档';
 }catch(error){
  console.error(error);asset.state='error';asset.message='失败：'+error.message;
 }
 render();
}

async function runPool(items,limit,worker){
 let next=0;
 const runners=Array.from({length:Math.min(limit,items.length)},async()=>{
  while(next<items.length){const item=items[next++];await worker(item)}
 });
 await Promise.all(runners);
}

picker.addEventListener('change',()=>inspect([...picker.files]).catch(error=>{
 console.error(error);overall.textContent='识别失败：'+error.message;
}));

uploadAll.addEventListener('click',async()=>{
 const queue=assets.filter(x=>x.state==='ready'||x.state==='error');
 if(!queue.length)return;
 uploadAll.disabled=true;overall.textContent=`正在上传 0 / ${queue.length}…`;
 let done=0;
 await runPool(queue,2,async asset=>{await uploadAsset(asset);done++;overall.textContent=`正在上传 ${done} / ${queue.length}…`;});
 const failed=queue.filter(x=>x.state==='error').length;
 overall.textContent=failed?`完成，但有 ${failed} 个失败，可以直接点“上传全部”重试。`:'全部上传完成，照片已经按日期进入 Diary。';
 uploadAll.disabled=failed===0;
});

(async()=>{
 if(!isCloudBase){overall.textContent='请从 CloudBase 版本打开上传页。';return}
 const session=await apiFetch('/session');
 if(!session.ok){redirectToLogin();return}
})().catch(error=>{console.error(error);overall.textContent='页面初始化失败：'+error.message});
