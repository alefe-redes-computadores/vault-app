#!/usr/bin/env node
'use strict';
// A static artifact gate, not a substitute for browser or physical QA.
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
function assert(x,msg){if(!x)throw Error(msg)}
function walk(root){return fs.readdirSync(root,{withFileTypes:true}).flatMap(e=>{const p=path.join(root,e.name);assert(!e.isSymbolicLink(),'symlink: '+p);return e.isDirectory()?walk(p):[p]})}
function sha(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}
function verify(root,mode){
 assert(['web','android'].includes(mode),'mode');const out=path.join(root,'out');assert(fs.existsSync(out),'out absent');
 const paths=walk(out).map(p=>path.relative(out,p).split(path.sep).join('/')).sort();const set=new Set(paths);
 for(const p of paths)assert(!/(^|\/)(\.next|node_modules|\.vercel|[^/]+\.func|\.env(?:\..*)?)(\/|$)|\.nft\.json$/.test(p),'server/secret artifact: '+p);
 const pages=walk(path.join(root,'app')).filter(p=>/\/page\.(tsx|ts|jsx|js)$/.test(p)).map(p=>path.relative(path.join(root,'app'),path.dirname(p)).split(path.sep).filter(x=>!/^\(.*\)$/.test(x)).join('/')).sort();
 assert(pages.length>100,'incomplete source routes');assert(!pages.some(p=>p.includes('[')||p.includes('@')),'unexpected dynamic/parallel route: manual proof needed');
 const pageFile=p=>p?(mode==='android'?p+'/index.html':p+'.html'):'index.html';
 const publicRoot=path.join(root,'public');
 const publicPaths=new Set(walk(publicRoot).map(p=>path.relative(publicRoot,p).split(path.sep).join('/')));
 // Reject route/public aliases even if coincidentally identical bytes mask the collision.
 for(const p of pages){const dest=pageFile(p);assert(!publicPaths.has(dest),'route/public collision '+dest);assert(set.has(dest),'missing page: '+p)}
 assert(pages.includes('offline'),'missing independent offline page');
 assert(!publicPaths.has('offline.html'),'legacy fallback collides with web /offline');
 for(const p of ['index.html','404.html','manifest.json','sw.js','vault-offline-fallback.html'])assert(set.has(p),'missing '+p);
 for(const p of ['login','auth/callback','onboarding','hoje','saude/tratamentos/detalhes','saude/medicamentos/detalhes','saude/fornecimento'])assert(set.has(pageFile(p)),'missing key route '+p);
 const manifest=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8'));
 for(const u of [manifest.start_url,...(manifest.shortcuts||[]).map(s=>s.url)]){assert(typeof u==='string'&&u.startsWith('/'),'invalid manifest URL');const route=new URL(u,'https://example.invalid').pathname.replace(/^\/|\/$/g,'');assert(set.has(pageFile(route)),'manifest route missing '+u)}
 for(const icon of manifest.icons||[])assert(set.has(icon.src.replace(/^\//,'')),'missing icon '+icon.src);
 for(const name of ['sw.js','manifest.json','vault-offline-fallback.html'])assert(sha(path.join(root,'public',name))===sha(path.join(out,name)),'public asset drift '+name);
 let html=0,assets=0;for(const p of paths.filter(x=>x.endsWith('.html'))){const s=fs.readFileSync(path.join(out,p),'utf8');html++;for(const m of s.matchAll(/(?:src|href)=["'](\/_next\/static\/[^"'#?]+)(?:[^"']*)["']/g)){assert(set.has(decodeURIComponent(m[1].slice(1))),'missing static asset '+m[1]);assets++}}
 assert(assets>0,'no Next static assets referenced');
 const cap=JSON.parse(fs.readFileSync(path.join(root,'capacitor.config.json'),'utf8'));assert(cap.webDir==='out'&&!cap.server?.url,'Android not bundled locally');
 const env=process.env;assert(mode==='web'?env.CAPACITOR_BUILD==='0'&&env.VAULT_WEB_STATIC_BUILD==='1'&&env.NEXT_PUBLIC_VAULT_NATIVE_RUNTIME==='web':env.CAPACITOR_BUILD==='1'&&env.NEXT_PUBLIC_VAULT_NATIVE_RUNTIME==='android','runtime flag mismatch');
 const actions=path.join(root,'.next/server/server-reference-manifest.json');if(fs.existsSync(actions)){const m=JSON.parse(fs.readFileSync(actions,'utf8'));assert(!Object.keys(m.node||{}).length&&!Object.keys(m.edge||{}).length,'unexpected Server Actions')}
 const digest=crypto.createHash('sha256');for(const p of paths)digest.update(sha(path.join(out,p))+'  '+p+'\n');
 const report={mode,pages:pages.length,html,assets,files:paths.length,artifact_sha256:digest.digest('hex'),server_artifacts_in_out:0,source_maps:paths.filter(x=>x.endsWith('.map')).length,server_actions_manifest:fs.existsSync(actions)?'EMPTY':'NOT_PRESENT',build_output:'out',browser_qa:'PENDING'};
 console.log('STATIC_EXPORT='+mode.toUpperCase()+'_PASS '+JSON.stringify(report));return report;
}
if(require.main===module){try{verify(process.cwd(),process.argv[2])}catch(e){console.error('STATIC_EXPORT=FAIL '+e.message);process.exitCode=1}}
module.exports={verify};
