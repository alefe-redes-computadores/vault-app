#!/usr/bin/env node
'use strict';
// No dependencies. Real source + synthetic export/CacheStorage; never claims a Next/browser build.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {verify}=require('./verify-static-release-stability.cjs');
const root=path.resolve(__dirname,'..'),fallback='vault-offline-fallback.html';
let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++};
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
const pagePaths=walk(path.join(root,'app')).filter(p=>/\/page\.(tsx|ts|jsx|js)$/.test(p));
const routes=pagePaths.map(p=>path.relative(path.join(root,'app'),path.dirname(p)).split(path.sep).filter(x=>!/^\(.*\)$/.test(x)).join('/'));
const dest=(r,m)=>r?(m==='web'?r+'.html':r+'/index.html'):'index.html';
const publicPaths=new Set(walk(path.join(root,'public')).map(p=>path.relative(path.join(root,'public'),p)));
for(const mode of ['web','android'])check(routes.every(r=>!publicPaths.has(dest(r,mode))),mode+' source paths disjoint');
check(routes.includes('offline')&&publicPaths.has(fallback)&&!publicPaths.has('offline.html'),'independent fallback and route');
check(fs.readFileSync(path.join(root,'public',fallback),'utf8').includes('Apenas dados já salvos'),'fallback warning preserved');
const env=Object.fromEntries(['CAPACITOR_BUILD','VAULT_WEB_STATIC_BUILD','NEXT_PUBLIC_VAULT_NATIVE_RUNTIME'].map(k=>[k,process.env[k]]));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vault-static-guard-'));
function write(n,v){const p=path.join(tmp,n);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,v)}
const html='<html><script src="/_next/static/chunk.js"></script>Next route fixture</html>';
try{
 for(const p of pagePaths)write(path.relative(root,p),'');
 for(const n of ['sw.js',fallback,'manifest.json'])write('public/'+n,fs.readFileSync(path.join(root,'public',n)));
 write('capacitor.config.json',fs.readFileSync(path.join(root,'capacitor.config.json')));
 for(const mode of ['web','android']){
  fs.rmSync(path.join(tmp,'out'),{recursive:true,force:true});
  for(const n of ['sw.js',fallback,'manifest.json'])write('out/'+n,fs.readFileSync(path.join(tmp,'public',n)));
  for(const i of JSON.parse(fs.readFileSync(path.join(tmp,'public/manifest.json'))).icons||[])write('out'+i.src,'icon fixture');
  for(const r of routes)write('out/'+dest(r,mode),html);
  write('out/404.html',html);write('out/_next/static/chunk.js','chunk');
  process.env.CAPACITOR_BUILD=mode==='web'?'0':'1';process.env.VAULT_WEB_STATIC_BUILD=mode==='web'?'1':'0';process.env.NEXT_PUBLIC_VAULT_NATIVE_RUNTIME=mode;
  const log=console.log;try{console.log=(s,...a)=>log('FIXTURE_'+s,...a);check(verify(tmp,mode).pages===routes.length,mode+' fixture positive');}finally{console.log=log}
  write('out/'+fallback,'wrong bytes');assert.throws(()=>verify(tmp,mode),/public asset drift/);checks++;write('out/'+fallback,fs.readFileSync(path.join(tmp,'public',fallback)));
  write('public/offline.html',html);assert.throws(()=>verify(tmp,mode),/collision|legacy fallback/);checks++;fs.unlinkSync(path.join(tmp,'public/offline.html'));
  fs.unlinkSync(path.join(tmp,'out',dest('offline',mode)));assert.throws(()=>verify(tmp,mode),/missing page: offline/);checks++;write('out/'+dest('offline',mode),html);
  fs.unlinkSync(path.join(tmp,'out',dest('auth/callback',mode)));assert.throws(()=>verify(tmp,mode),/missing page/);checks++;write('out/'+dest('auth/callback',mode),html);
  write('out/unsafe.func/index.js','');assert.throws(()=>verify(tmp,mode),/server\/secret artifact/);checks++;fs.rmSync(path.join(tmp,'out/unsafe.func'),{recursive:true});
  fs.unlinkSync(path.join(tmp,'out/_next/static/chunk.js'));assert.throws(()=>verify(tmp,mode),/missing static asset/);checks++;
 }
}finally{fs.rmSync(tmp,{recursive:true,force:true});for(const [k,v] of Object.entries(env)){if(v===undefined)delete process.env[k];else process.env[k]=v}}

(async()=>{
 const origin='https://vault.example',shell='vault-shell-v25-6',legacy='vault-shell-v24',other='another-app';
 const stores=new Map(),events={},calls=[];let network=true,control='public, max-age=60',quota=false;
 const req=(s,mode='navigate',headers={})=>({url:new URL(s,origin).href,mode,method:'GET',headers:new Headers(headers)});
 const key=r=>typeof r==='string'?new URL(r,origin).href:r.url;
 const makeCache=name=>{const entries=new Map();return {entries,async add(r){if(!network)throw Error('offline');entries.set(key(r),new Response('fallback '+key(r)));},async put(r,v){if(quota)throw Error('quota');entries.set(key(r),v.clone());},async match(r){return entries.get(key(r))?.clone();},async keys(){return [...entries.keys()].map(u=>req(u));},async delete(r){return entries.delete(key(r));}}};
 const caches={async open(n){if(!stores.has(n))stores.set(n,makeCache(n));return stores.get(n)},async keys(){return [...stores.keys()]},async delete(n){return stores.delete(n)}};
 let skipped=0;const self={location:{origin},addEventListener:(n,fn)=>events[n]=fn,skipWaiting:async()=>{skipped++},clients:{claim:async()=>{}}};
 const fetch=async(r,opts)=>{calls.push({url:r.url,opts});if(!network)throw Error('offline');return new Response('network '+r.url,{headers:{'cache-control':control}})};
 vm.runInNewContext(fs.readFileSync(path.join(root,'public/sw.js'),'utf8'),{self,caches,fetch,URL,Request,Response,Set});
 const lifecycle=async n=>{let p;events[n]({waitUntil:x=>p=x});await p};
 const dispatch=async r=>{let p;events.fetch({request:r,respondWith:x=>p=x});return p?await p:undefined};
 const current=await caches.open(shell),old=await caches.open(legacy),foreign=await caches.open(other);
 for(const cache of [current,old,foreign]){await cache.put(req('/auth/callback?code=synthetic'),new Response('legacy auth'));await cache.put(req('/hoje?person=synthetic'),new Response('legacy page'))}
 await current.put(req('/offline.html'),new Response('old fallback'));network=false;await assert.rejects(lifecycle('install'),/offline/);checks++;check(skipped===0&&await current.match('/offline.html'),'failed fallback install keeps old worker/cache');network=true;await lifecycle('install');check(skipped===1,'skip waiting only after required fallback');await lifecycle('activate');
 check(await current.match('/'+fallback),'new fallback installed');check(await current.match('/offline.html'),'legacy cache retained');
 for(const c of [current,old]){check(!await c.match('/auth/callback?code=synthetic'),'old auth key removed');check(await c.match('/hoje?person=synthetic'),'navigation retained')}
 check(await foreign.match('/auth/callback?code=synthetic'),'unrelated cache preserved');
 for(const p of ['/auth/callback','/auth/callback/?code=synthetic','/auth/callback.html','/auth/callback/index.html','/auth/callback.txt','/AUTH/CALLBACK','/auth/%63allback','/?code=synthetic','/login?access_token=synthetic','/?token_hash=synthetic']){
  const r=req(p,p.endsWith('.txt')?'cors':'navigate');await dispatch(r);check(calls.at(-1).opts.cache==='no-store','network-only '+p);check(!await current.match(r),'not cached '+p);
  network=false;await assert.rejects(dispatch(r),/offline/);checks++;network=true;
 }
 const auth=req('/hoje','navigate',{authorization:'synthetic'});await dispatch(auth);check(calls.at(-1).opts.cache==='no-store','authorization bypass');
 await dispatch(req('/?person=synthetic'));check(!await current.match('/'),'query not aliased to root');
 await dispatch(req('/'));check(await current.match('/'),'root cached');
 await dispatch(req('/hoje?person=synthetic'));network=false;check((await (await dispatch(req('/hoje?person=synthetic'))).text()).startsWith('network'),'offline exact route retained');check(await dispatch(req('/noncached')),'offline root fallback');await current.delete('/');check((await (await dispatch(req('/noncached'))).text()).includes(fallback),'offline standalone fallback');network=true;
 // Simulate the response flag from a cleanUrls redirect; it must be rebuilt.
 const redirected=new Response('redirected fallback',{headers:{'content-type':'text/html'}});
 Object.defineProperty(redirected,'redirected',{value:true});
 const originalMatch=current.match;current.match=async r=>key(r)===key('/'+fallback)?redirected:originalMatch(r);
 network=false;const normalized=await dispatch(req('/uncached-redirect'));check(!normalized.redirected&&await normalized.text()==='redirected fallback'&&normalized.headers.get('content-type')==='text/html','redirected fallback normalized');network=true;current.match=originalMatch;
 control='no-store';await current.put(req('/private'),new Response('stale'));await dispatch(req('/private'));check(!await current.match('/private'),'no-store removes old entry');
 control='public';quota=true;check((await (await dispatch(req('/fresh'))).text()).startsWith('network'),'quota does not mask network response');quota=false;
 check(await dispatch(req('https://elsewhere.example/auth/callback'))===undefined,'cross-origin untouched');
 const post=req('/auth/callback');post.method='POST';check(await dispatch(post)===undefined,'non-GET untouched');
 console.log('STATIC_OFFLINE_CONTRACTS='+checks+'/'+checks+' PASS; source + synthetic export + SW VM; REAL_BUILD_AND_BROWSER_QA=PENDING');
})().catch(e=>{console.error(e);process.exitCode=1});
