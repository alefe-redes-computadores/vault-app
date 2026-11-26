#!/usr/bin/env node
'use strict';
// Strict permanent contract: no fallback to simulator if real Dexie or TS is missing.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vault-vital-gate-'));
try{
 const tsc=require.resolve('typescript/bin/tsc',{paths:[root]});
 require.resolve('dexie',{paths:[root]});require.resolve('fake-indexeddb/auto',{paths:[root]});
 const sources=fs.readdirSync(path.join(root,'lib/vital')).filter(x=>x.endsWith('.ts')).map(x=>path.join(root,'lib/vital',x));
 const env={...process.env,NODE_PATH:[path.join(root,'node_modules'),process.env.NODE_PATH].filter(Boolean).join(path.delimiter)};
 const run=(args)=>spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',env});
 const compile=run([tsc,'--strict','--esModuleInterop','--skipLibCheck','--target','ES2022','--module','commonjs','--moduleResolution','node','--outDir',path.join(tmp,'build'),'--rootDir',path.join(root,'lib'),...sources]);
 if(compile.status!==0)throw Error('Vital: compilação estrita bloqueada');
 fs.cpSync(path.join(__dirname,'vital-tests'),path.join(tmp,'tests'),{recursive:true});
 const suites=['vital-behavior.cjs','vital-cloud.cjs','vital-indexeddb.cjs'];const failed=[];
 for(const s of suites){const r=run([path.join(tmp,'tests',s)]);if(r.status!==0)failed.push(s);}
 if(failed.length)throw Error('Vital: falhas '+failed.join(', '));
 console.log('VITAL_INTEGRAL_GATE_OK');
}catch(e){console.error(e.message);process.exitCode=1;}finally{fs.rmSync(tmp,{recursive:true,force:true});}
