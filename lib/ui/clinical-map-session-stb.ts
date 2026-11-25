/** Session-only search draft, scoped to the authenticated account/person. No URL or sync. */
const TTL=30*60*1000;
export type ClinicalMapSessionSTB={query:string;additional:boolean;scrollY:number};
export const EMPTY_MAP_SESSION_STB:ClinicalMapSessionSTB={query:'',additional:false,scrollY:0};
export function mapSessionKeySTB(uid:string,pid:string):string|null {
  return uid&&pid&&uid.length<=256&&pid.length<=256?'vault:clinical-map:stb:v1:'+encodeURIComponent(uid)+':'+encodeURIComponent(pid):null;
}
export function serializeMapSessionSTB(state:ClinicalMapSessionSTB,now:number):string {
  return JSON.stringify({v:1,at:now,query:state.query.slice(0,120),additional:state.additional,scrollY:Math.max(0,Math.min(1000000,Number.isFinite(state.scrollY)?state.scrollY:0))});
}
export function parseMapSessionSTB(raw:string|null,now:number):ClinicalMapSessionSTB|null {
  if(!raw||raw.length>1200||!Number.isFinite(now))return null;
  try{const x=JSON.parse(raw);if(!x||x.v!==1||!Number.isFinite(x.at)||x.at>now||now-x.at>TTL||typeof x.query!=='string'||x.query.length>120||typeof x.additional!=='boolean'||!Number.isFinite(x.scrollY)||x.scrollY<0||x.scrollY>1000000)return null;
    return {query:x.query,additional:x.additional,scrollY:x.scrollY};}catch{return null;}
}
export function readMapSessionSTB(uid:string,pid:string,now=Date.now()):ClinicalMapSessionSTB|null {
  const key=mapSessionKeySTB(uid,pid);if(!key||typeof window==='undefined')return null;
  try{return parseMapSessionSTB(window.sessionStorage.getItem(key),now);}catch{return null;}
}
export function writeMapSessionSTB(uid:string,pid:string,state:ClinicalMapSessionSTB,now=Date.now()):void {
  const key=mapSessionKeySTB(uid,pid);if(!key||typeof window==='undefined')return;
  try{window.sessionStorage.setItem(key,serializeMapSessionSTB(state,now));}catch{/* session storage optional */}
}
export function clearMapSessionSTB(uid:string,pid:string):void {
  const key=mapSessionKeySTB(uid,pid);if(!key||typeof window==='undefined')return;
  try{window.sessionStorage.removeItem(key);}catch{/* session storage optional */}
}
