const CLOUDBASE_ENV_ID='moments1-d0ginpt1r80945f2c';
const CLOUDBASE_API=`https://${CLOUDBASE_ENV_ID}.service.tcloudbase.com/garden-api`;
export const isCloudBase=location.hostname.includes('tcloudbaseapp.com')||location.hostname.includes('service.tcloudbase.com')||location.pathname.startsWith('/garden');
export const apiBase=isCloudBase?CLOUDBASE_API:'/api';
export const loginPage=isCloudBase?'./login.html':'/?next=';

export function sessionToken(){
  try{return localStorage.getItem('garden_session_token')||''}catch{return''}
}
export function clearSession(){
  try{localStorage.removeItem('garden_session_token');localStorage.removeItem('garden_session_user')}catch{}
}
function runtimePath(path){
  if(isCloudBase)return path;
  if(path.startsWith('/notes'))return '/v1'+path;
  if(path.startsWith('/date-ideas'))return '/v1'+path;
  if(path.startsWith('/asset'))return '/v1/assets'+path.slice('/asset'.length);
  return path;
}
export async function apiFetch(path,init={}){
  const headers=new Headers(init.headers||{});
  if(isCloudBase){
    const token=sessionToken();
    if(token)headers.set('authorization',`Bearer ${token}`);
  }
  return fetch(apiBase+runtimePath(path),{...init,headers,credentials:isCloudBase?'omit':'same-origin'});
}
export function redirectToLogin(){
  clearSession();
  if(isCloudBase){
    location.replace('./login.html?next='+encodeURIComponent(location.pathname+location.search+location.hash));
  }else{
    location.replace('/?next='+encodeURIComponent(location.pathname+location.search+location.hash));
  }
}
export function hydrateSignedUrls(items){
  const map=new Map();
  for(const item of items||[])for(const media of item?.imageMeta||[]){
    if(media?.path&&media?.url)map.set(media.path,media.url);
    if(media?.motion?.path&&media?.motion?.url)map.set(media.motion.path,media.motion.url);
  }
  return map;
}
