/** UX360 P0: state for clinical view only. Never persist clinical query in a URL or sync table. */
export type ClinicalA10FilterState = {
  query: string;
  domain: string;
  from: string;
  to: string;
  history: boolean;
};
const TTL_MS = 30 * 60 * 1000;
const MAX_BYTES = 1200;
const empty: ClinicalA10FilterState = {query:'',domain:'all',from:'',to:'',history:false};
const domainNames = new Set(['all','consultations','surgery','treatment','hospitalization','rehabilitation','vaccination','procedure','sensitivity','exams','health','doses']);
export function clinicalA10FilterKey(userId:string,personId:string):string|null {
  if (!userId || !personId || userId.length>256 || personId.length>256) return null;
  return 'vault:clinical-a10-filters:ux360:v1:'+encodeURIComponent(userId)+':'+encodeURIComponent(personId);
}
export function parseClinicalA10Filter(raw:string|null,now:number):ClinicalA10FilterState|null {
  if (!raw || raw.length>MAX_BYTES || !Number.isFinite(now)) return null;
  try {
    const obj:unknown=JSON.parse(raw);
    if (!obj || typeof obj!=='object' || Array.isArray(obj)) return null;
    const x=obj as Record<string,unknown>;
    if (x.v!==1 || typeof x.at!=='number' || x.at>now || now-x.at>TTL_MS) return null;
    if (typeof x.query!=='string' || x.query.length>120 || typeof x.domain!=='string' || !domainNames.has(x.domain)) return null;
    if (typeof x.from!=='string' || typeof x.to!=='string' || x.from.length>10 || x.to.length>10 || typeof x.history!=='boolean') return null;
    return {query:x.query,domain:x.domain,from:x.from,to:x.to,history:x.history};
  } catch {return null;}
}
export function serializeClinicalA10Filter(x:ClinicalA10FilterState,now:number):string {
  return JSON.stringify({v:1,at:now,query:x.query.slice(0,120),domain:domainNames.has(x.domain)?x.domain:'all',from:x.from.slice(0,10),to:x.to.slice(0,10),history:!!x.history});
}
/** Call only after auth scope is settled; browser sessionStorage can be unavailable. */
export function readClinicalA10Filter(uid:string,pid:string,now=Date.now()):ClinicalA10FilterState|null {
  const key=clinicalA10FilterKey(uid,pid);if (!key || typeof window==='undefined') return null;
  try {return parseClinicalA10Filter(window.sessionStorage.getItem(key),now);} catch{return null;}
}
export function writeClinicalA10Filter(uid:string,pid:string,x:ClinicalA10FilterState,now=Date.now()):void {
  const key=clinicalA10FilterKey(uid,pid);if (!key || typeof window==='undefined') return;
  try {window.sessionStorage.setItem(key,serializeClinicalA10Filter(x,now));} catch{/* absence of storage does not disable reading */}
}
/** P0 R4.1: bounded, same-origin contextual navigation. No clinical search in URLs. */
const PRIVACY_FALLBACK='/saude/minha-saude';
const LOCAL_ORIGIN='https://vault.local';
const MAX_HREF=2048, MAX_DEPTH=4, MAX_DECODES=4, MAX_NODES=32;
const searchKeys=new Set(['busca','search','query','termo','q']);
const clinicalLegacyKeys=new Set(['inicio','fim','historico']);
const contextKeys=new Set(['return_to','origin_from']);
const forbidden=/[\u0000-\u001f\u007f<>\\\ufffd]/;
const badPercent=/%(?![0-9a-f]{2})/i;
/** Decode wrappers only, not the components of an already parsed URL. */
function unwrapLocalHref(raw:string):string|null {
  let value=raw;
  for(let i=0;i<=MAX_DECODES;i++){
    if(!value||value.length>MAX_HREF||forbidden.test(value)||value!==value.trim()||badPercent.test(value))return null;
    if(value.startsWith('/')){
      if(value.startsWith('//'))return null;
      const path=value.split(/[?#]/,1)[0];
      try {
        // Encoded delimiters, traversal and residual encodings in the pathname are ambiguous.
        const decoded=path.split('/').map(segment=>decodeURIComponent(segment));
        if(decoded.some(segment=>forbidden.test(segment)||/[\/?#%]/.test(segment)||segment==='.'||segment==='..'))return null;
      } catch{return null;}
      return value;
    }
    if(i===MAX_DECODES||!/%[0-9a-f]{2}/i.test(value))return null;
    try{value=decodeURIComponent(value);}catch{return null;}
  }
  return null;
}
function normalizedKey(key:string):string|null {
  let value=key;
  for(let i=0;i<=MAX_DECODES;i++){
    if(!value||forbidden.test(value)||badPercent.test(value))return null;
    if(!value.includes('%'))return value.trim().toLowerCase();
    if(i===MAX_DECODES)return null;
    try{value=decodeURIComponent(value);}catch{return null;}
  }
  return null;
}
function safeAnchor(hash:string):string {
  if(!hash)return '';
  let value=hash.slice(1);
  for(let i=0;i<=MAX_DECODES;i++){
    if(forbidden.test(value)||/[?&=]/.test(value)||badPercent.test(value))return '';
    if(!value.includes('%'))return hash;
    if(i===MAX_DECODES)return '';
    try{value=decodeURIComponent(value);}catch{return '';}
  }
  return '';
}
function sanitizeLocalHref(raw:string,depth:number,budget:{nodes:number}):string|null {
  if(depth>MAX_DEPTH||++budget.nodes>MAX_NODES)return null;
  const local=unwrapLocalHref(raw);if(!local)return null;
  try{
    const u=new URL(local,LOCAL_ORIGIN);
    if(u.origin!==LOCAL_ORIGIN||u.username||u.password||u.pathname.startsWith('//')||/^\/api(?:\/|$)/i.test(decodeURIComponent(u.pathname)))return null;
    const clinical=/^\/saude\/linha-clinica(?:\/detalhe)?\/?$/i.test(decodeURIComponent(u.pathname));
    const entries:Array<[string,string]>=[];
    u.searchParams.forEach((value,key)=>entries.push([key,value]));
    const seenContext=new Map<string,number>();
    for(const [key] of entries){const k=normalizedKey(key);if(k&&contextKeys.has(k))seenContext.set(k,(seenContext.get(k)||0)+1);}
    for(const [key,value] of entries){
      const k=normalizedKey(key);
      if(!k||searchKeys.has(k)||(clinical&&clinicalLegacyKeys.has(k))||forbidden.test(value)){
        u.searchParams.delete(key);continue;
      }
      if(contextKeys.has(k)){
        u.searchParams.delete(key);
        if(seenContext.get(k)!==1)continue; // ambiguous duplicate origins are not trusted
        const nested=sanitizeLocalHref(value,depth+1,budget);
        if(nested)u.searchParams.set(k,nested);
      }
    }
    const anchor=safeAnchor(u.hash);
    const result=u.pathname+u.search+anchor;
    return result.length<=MAX_HREF?result:null;
  }catch{return null;}
}
/** Same policy for current history and generated back targets. Only replaces the current entry. */
export function scrubLegacyClinicalQueryUX360():void {
  if(typeof window==='undefined')return;
  try{
    const u=new URL(window.location.href),current=u.pathname+u.search+u.hash;
    const clean=sanitizeLocalHref(current,0,{nodes:0}) ?? sanitizeLocalHref(u.pathname,0,{nodes:0}) ?? PRIVACY_FALLBACK;
    if(clean!==current)window.history.replaceState(window.history.state,'',clean);
  }catch{/* browser history unavailable; outgoing links still use the sanitizer */}
}
export const EMPTY_CLINICAL_A10_FILTER_UX360=empty;
/** Reject invalid roots and remove invalid nested routes without discarding safe parents. */
export function sanitizeClinicalBackHrefUX360(href:string):string {
  return sanitizeLocalHref(href,0,{nodes:0}) ?? PRIVACY_FALLBACK;
}
/** Forget the prior person's private filters on an actual identity switch/logout. */
export function clearClinicalA10Filter(uid:string,pid:string):void {
  const key=clinicalA10FilterKey(uid,pid);if(!key||typeof window==='undefined')return;
  try{window.sessionStorage.removeItem(key);}catch{/* no storage permission */}
}
