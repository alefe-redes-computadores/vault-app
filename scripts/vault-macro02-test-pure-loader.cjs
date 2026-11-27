/** Test-only exact allowlist, real TypeScript modules; no runtime hooks or mocks. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const allowed=new Set(['historical-unit','compatibility','center-view','stock-evidence','stock-cycle','stock-context','wire-fields','ingress-guard','atomic-envelope','acquisition-wire','pharmaceutical-snapshot','writer-contract','account-authority','authority-session','clinical-backup-tables','cutover-recovery','cutover-storage-codec','cutover-compound-r6','cutover-metadata-batch','cutover-metadata-intent','cutover-metadata-pending','cutover-metadata-transport-r5','cutover-active-queue-r5','cutover-enrollment-authority']);
const cache=new Map();
function loadMacro02Pure(id){
 if(['@/lib/dose-slot-authority','../dose-slot-authority','./dose-slot-authority'].includes(id)){const key='dose-slot-authority';if(cache.has(key))return cache.get(key).exports;const file=path.join(__dirname,'../lib/dose-slot-authority.ts');const m={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('module','exports','require',code)(m,m.exports,loadMacro02Pure);cache.set(key,m);return m.exports;}
 const match=/^(?:@\/lib\/dose-premium\/|\.\.\/dose-premium\/|\.\/)([a-z0-9-]+)$/.exec(id);
 if(!match||!allowed.has(match[1]))throw Error('Dependência Macro02 não autorizada: '+id);
 const name=match[1];if(cache.has(name))return cache.get(name).exports;
 const file=path.join(__dirname,'../lib/dose-premium',name+'.ts'),src=fs.readFileSync(file,'utf8');
 const ast=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true);if(ast.parseDiagnostics.length)throw Error('Sintaxe Macro02 inválida: '+name);
 const m={exports:{}};cache.set(name,m);
 try{new Function('module','exports','require',ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,loadMacro02Pure);return m.exports;}catch(e){cache.delete(name);throw e;}
}
module.exports={loadMacro02Pure};
