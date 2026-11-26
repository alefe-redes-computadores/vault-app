#!/usr/bin/env node
'use strict';
/** VAULT A11: tests herméticos de escopo, provas, concorrência e compatibilidade. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
let checked=0;
const ok=(condition,message)=>{assert.ok(condition,message);checked++};
const eq=(a,b,message)=>{assert.equal(a,b,message);checked++};
const throws=(fn,pattern,message)=>{assert.throws(fn,pattern,message);checked++};
const read=p=>fs.readFileSync(p,'utf8');
function load(path){
 const source=read(path);
 const result=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},fileName:path,reportDiagnostics:true});
 const diagnostics=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
 ok(diagnostics.length===0,'TS puro '+path+' sem erro sintático');
 const module={exports:{}};
 const context=vm.createContext({module,exports:module.exports,URL,console});
 new vm.Script(result.outputText,{filename:path}).runInContext(context,{timeout:3000});
 return module.exports;
}
const {auditA11Certification,A11_TRACKS,redactA11Report}=load('lib/a11/certification-policy.ts');
const {compareA11Parity,checkTwoDeviceScheduling}=load('lib/a11/parity-oracle.ts');
const {classifyVaultStorageUrl,summarizeA11StorageReferences,A11_STORAGE_POLICY}=load('lib/a11/storage-compat.ts');
const sha='0123456789abcdef0123456789abcdef01234567';
const status=auditA11Certification([],sha);
eq(status.passed,0);eq(status.unverified,14);ok(!status.ready,'Sem provas não certificar');
throws(()=>auditA11Certification([],'not-a-sha'),/SHA/,'SHA inválido é bloqueio');
const all=A11_TRACKS.map(t=>({track:t.id,verdict:'passed',source:t.requires,sha,evidenceRef:'proof-of-'+t.id}));
const assembled=auditA11Certification(all,sha);ok(assembled.ready,'Matriz completa com fontes corretas pode avançar para revisão humana');
eq(assembled.passed,14);eq(assembled.failed,0);eq(assembled.unverified,0);
for(const item of all){
 const reduced=all.filter(x=>x!==item);ok(!auditA11Certification(reduced,sha).ready,'Etapa ausente não passa '+item.track);
 const wrong=all.map(x=>x===item?{...x,source:'code'}:x);
 if(item.source!=='code')ok(!auditA11Certification(wrong,sha).ready,'Fonte fraudada bloqueada '+item.track);
 const other=all.map(x=>x===item?{...x,sha:'f'.repeat(40)}:x);
 ok(!auditA11Certification(other,sha).ready,'SHA incorreto bloqueado '+item.track);
 const unverified=all.map(x=>x===item?{...x,verdict:'not_tested'}:x);
 ok(!auditA11Certification(unverified,sha).ready,'Não testado bloqueado '+item.track);
}
ok(!auditA11Certification([...all,all[0]],sha).ready,'Etapa duplicada bloqueada');
const redacted=redactA11Report({counts:{doses:12,medication_name:1,'user@example.com':5,vacinas:-3},queue:{ready:1,deferred:2,failed:3},
 coverage:'local_counts_only',generatedAt:'2026-11-22T23:00:00Z',isOnline:true});
const redText=JSON.stringify(redacted);
ok(!redText.includes('user@example.com'),'Relatório exclui identificador estranho');
eq(redacted.counts.vacinas,null);eq(redacted.queue.ready,1);eq(redacted.coverage,'local_counts_only');
ok(redText.includes('não certificam'),'Incerteza explícita');
const make=(u,p,id,fingerprint='aaa',deleted_at=null,pending=false)=>({id,user_id:u,person_id:p,kind:'dose',fingerprint,updated_at:'2026-11-22T20:00:00Z',deleted_at,pending});
for(const u of ['ownerA','ownerB'])for(const p of ['pessoa1','pessoa2']){
 const f=make(u,p,'fact-1');
 const set={scope:{userId:u,personId:p},complete:true,facts:[f]};
 const result=compareA11Parity(set,set,set);
 eq(result.exact,1);ok(!result.needsReview,'Paridade sintética '+u+' '+p);
 throws(()=>compareA11Parity(set,{...set,scope:{userId:'other',personId:p}},set),/pessoas ou contas/,'Não misturar contas');
 throws(()=>compareA11Parity(set,{...set,facts:[make('other',p,'fact-1')]},set),/fora do escopo/,'RLS sintético não assume resposta estranha');
 throws(()=>compareA11Parity({...set,facts:[f,f]},set,set),/duplicado/,'Duplicações explícitas bloqueadas');
 const altered={...set,facts:[make(u,p,'fact-1','different')]};
 eq(compareA11Parity(set,altered,set).mismatch,1);
 const missing={...set,facts:[]};
 eq(compareA11Parity(set,missing,set).onlyLeft,1);
 eq(compareA11Parity(missing,set,set).onlyRight,1);
 eq(compareA11Parity(missing,missing,set).onlyCloud,1);
 eq(compareA11Parity(set,{...set,complete:false},set).coverage,'incomplete');
 eq(compareA11Parity(set,{...set,facts:[{...f,pending:true}]},set).pending,1);
 eq(compareA11Parity(set,{...set,facts:[{...f,deleted_at:'2026-11-23T00:00:00Z'}]},set).tombstoneConflict,1);
}
const days=['2026-11-23T09:00:00','2026-11-30T09:00:00'];
const collision=checkTwoDeviceScheduling(days,days);eq(collision.overlap,2);eq(collision.safeToClaimGlobalIdempotency,false);
throws(()=>checkTwoDeviceScheduling([days[0],days[0]],[]),/Duplicação/,'Duplicação no aparelho não é aceita');
for(const bucket of ['vault-attachments','saude','documents']){
 eq(classifyVaultStorageUrl('https://a.supabase.co/storage/v1/object/public/'+bucket+'/owner/fact.pdf','https://a.supabase.co'),'public_legacy_clinical');
}
eq(classifyVaultStorageUrl('https://a.supabase.co/storage/v1/object/public/avatars/u/a.jpg','https://a.supabase.co'),'public_avatar');
eq(classifyVaultStorageUrl('https://a.supabase.co/storage/v1/object/sign/clinical-private/u/f.pdf','https://a.supabase.co'),'private_candidate');
for(const host of ['https://evil.example','http://a.supabase.co','https://fake-a.supabase.co'])
 eq(classifyVaultStorageUrl(host+'/storage/v1/object/public/vault-attachments/u/a.pdf','https://a.supabase.co'),'unrecognized');
eq(classifyVaultStorageUrl('https://a.supabase.co/storage/v1/object/public/vault-attachments/u/a.pdf#token','https://a.supabase.co'),'unrecognized');
eq(classifyVaultStorageUrl('garbage','https://a.supabase.co'),'unrecognized');
const groups=summarizeA11StorageReferences(['https://a.supabase.co/storage/v1/object/public/saude/u/a.pdf','https://a.supabase.co/storage/v1/object/sign/clinical-private/u/f.pdf'], 'https://a.supabase.co');
eq(groups.public_legacy_clinical,1);eq(groups.private_candidate,1);
ok(A11_STORAGE_POLICY.noAutomaticBucketChange,'Não fechar bucket automaticamente');
const page=read('app/diagnostico/a11/page.tsx');
for(const marker of ['scopeRef.current','role="alert"','min-h-11','min-h-12','aria-label','VAULT · A11','collectA11LocalSnapshot','redactA11Report'])
 ok(page.includes(marker),'UI A11 protege '+marker);
ok(!/violet-|purple-|requestAnimationFrame|\.insert\(|\.upsert\(/i.test(page),'UI sem violeta, GPU ou escritor');
const local=read('lib/a11/local-snapshot.ts');
ok(local.includes('db.persons.get(pid)')&&local.includes('current.user_id!==uid'),'Snapshot revalida posse após await');
ok(!/\.add\(|\.put\(|\.update\(|\.delete\(/.test(local),'Coletor somente leitura');
const rls=read('scripts/a11-rls-2x2-readonly.mjs');
for(const marker of ["from('persons')","from('dose_logs')","signInWithPassword","scope:'local'",'VAULT_A11_A1_DOSE'])ok(rls.includes(marker),'RLS fixture '+marker);
ok(!/\.insert\(|\.upsert\(|\.update\(|\.delete\(/.test(rls),'RLS somente leitura sem escrita');
const gate=read('scripts/test-v63-release-gate.mjs');
const contractBlock=gate.split('const contracts = [')[1]?.split('];')[0]||'';
const entries=[...contractBlock.matchAll(/"scripts\/[^\"]+"/g)].map(x=>x[0]);
const vitalContract='"scripts/test-vault-vital-integral.cjs"';
const priorEntries=entries.slice(0,562);
const extension=entries.slice(563);
eq(entries[562],vitalContract,'Vital permanece na posição publicada');
eq(extension.every(x=>/^"scripts\/test-vault-macro02-[a-z0-9-]+\.cjs"$/.test(x)),true,'Somente vacinas Macro02 adicionadas nesta cirurgia');
eq(priorEntries.length,562,'V63 mantém 562 contratos históricos');
eq(require('node:crypto').createHash('sha256').update(priorEntries.join('\n')).digest('hex'),'827eaa7c5c9decec12c6544b289595e0836da16dd1d429a793a789ed1b201bfe','V63 mantém todos os 562 IDs históricos em ordem exata');
eq(entries.filter(x=>x===vitalContract).length,1,'Vacina Vital única');
eq(entries.length,563+extension.length,'V63 mantém 562 históricos mais Vital e novas vacinas');
eq(entries.filter(x=>x==='"scripts/test-vault-a11-integral-360.cjs"').length,1,'A11 única no V63');
eq(entries.filter(x=>x==='"scripts/test-vault-guardian3-ux.cjs"').length,1,'Guardian3 UX único no V63');
eq(new Set(entries).size,entries.length,'V63 não aceita contratos duplicados');
eq(entries.filter(x=>x==='"scripts/test-vault-frente-b-video-relacional.cjs"').length,1,'Vacina B permanente única no V63');
ok(entries.includes('"scripts/test-vault-a11-integral-360.cjs"'),'Novo contrato permanente no V63');
ok(entries.includes('"scripts/test-vault-guardian-ga01-gp2-clinical.cjs"'),'Guardian GA01 presente');
ok(entries.includes('"scripts/test-vault-ga02-ga07-guardian.cjs"'),'Guardian GA02-GA07 presente');
ok(entries.includes('"scripts/test-vault-guardian3-g2-clinico.cjs"')===false,'G2 dirigido não deve ser duplicado no V63');
ok(gate.includes('test-v70-super-integrity-ux-contract.mjs')&&gate.includes('test-v70-final-completeness-contract.mjs'),'V70 duplo preservado');
ok(gate.includes('VAULT_V63_COLLECT_ALL'),'Modo fail-fast/coleta preservado');
const original=read('app/diagnostico/page.tsx');ok(original.includes('href="/diagnostico/a11"'),'Diagnóstico A11 acessível pelo app');
for(const path of ['scripts/a11-build-oom-diagnose.cjs','scripts/a11-certification-gate.cjs','docs/VAULT-A11-FIXTURES-EXTERNAS.md'])
 ok(fs.existsSync(path),'Instrumental existente '+path);
const {assessA11AndroidObservation}=load('lib/a11/android-observability.ts');
const {auditA11Notifications}=load('lib/a11/notification-oracle.ts');
for(const width of [320,360,390,412,430]){
 const result=assessA11AndroidObservation({runtime:'android',cssWidth:width,cssHeight:800,reducedMotion:true,visible:true,online:true});
 eq(result.viewportCategory,'target_320_430');ok(!result.canClaimNativeTest,'A largura não certifica Android');
}
eq(assessA11AndroidObservation({runtime:'web',cssWidth:null,cssHeight:null,reducedMotion:null,visible:null,online:null}).viewportCategory,'unknown');
const observed={id:'n1',user_id:'u',person_id:'p',plannedAt:'2026-11-22T09:00:00',scheduled:true,observedDelivery:false,permission:'granted',optIn:true,quietHoursAcknowledged:true};
const notif=auditA11Notifications([observed],'u','p');
eq(notif.planned,1);eq(notif.observed,0);ok(!notif.ready,'Agendamento não prova entrega');
throws(()=>auditA11Notifications([{...observed,user_id:'other'}],'u','p'),/outra pessoa/,'Notificações não vazam conta');
throws(()=>auditA11Notifications([observed,observed],'u','p'),/duplicada/,'Notificações duplicadas são bloqueio');
eq(auditA11Notifications([{...observed,permission:'denied'}],'u','p').contradictions,1);
console.log('VAULT_A11_DIRIGIDO_OK | '+checked+' verificacoes | 2x2 sintetico | 0 SQL | 0 escritor clinico | 0 certificacao artificial');
