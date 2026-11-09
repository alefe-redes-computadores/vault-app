#!/usr/bin/env node
"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module'),path=require('node:path');
let checks=0;const ok=(value,label)=>{assert.ok(value,`M103 P1: ${label}`);++checks;};
const read=p=>fs.readFileSync(p,'utf8');
for(const file of ['lib/safety-plan.ts','lib/quality/operational-readiness-m103.ts','components/OperationalReadinessM103.tsx','app/saude/plano-seguranca/page.tsx','app/mais/page.tsx','app/offline/page.tsx','components/ExportButton.tsx']){
  const src=read(file),ast=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  ok(!ast.parseDiagnostics.length,`TS sintaxe ${file}`);
}
function loadPure(file){
  const source=read(file);
  const js=ts.transpileModule(source,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,strict:true},reportDiagnostics:true});
  ok(!(js.diagnostics||[]).some(e=>e.category===ts.DiagnosticCategory.Error),`transpilacao ${file}`);
  const box=new Module(path.resolve(file),module);box.filename=path.resolve(file);box._compile(js.outputText,box.filename);return box.exports;
}
const store=new Map();
global.window={};
global.localStorage={
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,value)=>{store.set(key,String(value));},
  removeItem:key=>{store.delete(key);},
};
const safety=loadPure('lib/safety-plan.ts');
const empty=safety.readSafetyPlan('p','a');
ok(!empty.warningSigns&&!empty.updatedAt,'primeira leitura vazia e sem inventar dados');
ok(safety.readSafetyPlan('p').warningSigns==='','sem conta nao recupera dados');
ok(safety.readSafetyPlan('p','').warningSigns==='','usuario vazio nao le');
ok(!safety.hasScopedSafetyPlan('p','a'),'sem plano v2');
const sample={...empty,warningSigns:'Anotacao privada',trustedPeople:'Contato pessoal'};
const saved=safety.saveSafetyPlan('p',sample,'a');
ok(saved.warningSigns==='Anotacao privada' && typeof saved.updatedAt==='string','salva para a conta correta');
ok(safety.hasScopedSafetyPlan('p','a'),'v2 escopo presente');
ok(safety.readSafetyPlan('p','a').warningSigns==='Anotacao privada','leitura exata do dono');
ok(safety.readSafetyPlan('p','b').warningSigns==='','outra conta mesma pessoa isolada');
ok(safety.readSafetyPlan('q','a').warningSigns==='','outra pessoa mesma conta isolada');
ok(![...store.keys()].some(x=>x.includes('Anotacao privada')),'conteudo nao integra nome da chave');
let denied=false;try{safety.saveSafetyPlan('p',sample,'');}catch{denied=true};ok(denied,'gravacao sem conta e bloqueada');
store.set('vault:safety-plan:v1:legacy',JSON.stringify({...empty,warningSigns:'SOMENTE LEGADO'}));
ok(safety.hasLegacySafetyPlan('legacy'),'v1 detectado sem exibir conteudo');
ok(safety.readSafetyPlan('legacy','a').warningSigns==='','v1 nao carregado automaticamente');
ok(safety.importLegacySafetyPlan('legacy','')===null,'v1 exige contexto de conta');
ok(safety.importLegacySafetyPlan('p','a')===null,'importacao nao sobrescreve v2');
let imported=safety.importLegacySafetyPlan('legacy','a');
ok(imported?.warningSigns==='SOMENTE LEGADO','importacao somente em chamada deliberada');
ok(safety.readSafetyPlan('legacy','a').warningSigns==='SOMENTE LEGADO','legado vinculado a conta destino');
ok(!safety.hasLegacySafetyPlan('legacy'),'v1 removido apenas depois da copia validada');
ok(safety.readSafetyPlan('legacy','b').warningSigns==='','v1 importado nao contamina outra conta');
store.set('vault:safety-plan:v1:invalid','{corrompido');
ok(safety.importLegacySafetyPlan('invalid','a')===null,'legado corrompido nao e importado');
ok(safety.hasLegacySafetyPlan('invalid'),'legado corrompido nao apagado');
store.set('vault:safety-plan:v2:a:broken','{"warningSigns":{}}');
ok(safety.readSafetyPlan('broken','a').warningSigns==='','novo plano invalido nao vira texto incompreensivel');
const readiness=loadPure('lib/quality/operational-readiness-m103.ts').vaultReadinessM103;
const base={authenticated:true,hasPerson:true,online:true,pending:0,native:true};
ok(readiness({...base,authenticated:false}).status==='account','sem autenticacao nao confirma dados');
ok(readiness({...base,hasPerson:false}).status==='person','sem pessoa ativa nao confirma escopo');
ok(readiness({...base,online:false,pending:5}).status==='offline','offline prevalece');
ok(/5 opera/.test(readiness({...base,online:false,pending:5}).explanation),'fila preservada em aviso offline');
ok(readiness({...base,online:false,pending:0}).explanation.includes('não comprova'),'fila vazia offline nao confirma nuvem');
ok(readiness({...base,pending:2}).status==='pending','pendencias identificadas');
ok(readiness({...base,pending:null}).status==='review','desconhecido nao vira zero');
ok(readiness({...base,pending:-999}).status==='review','contagem negativa nao gera numero negativo');
ok(readiness({...base,pending:NaN}).status==='review','contagem invalida nao vira certificacao');
ok(readiness(base).explanation.includes('APK'),'APK nao homologado por visualizacao');
ok(readiness({...base,native:false}).explanation.includes('PWA'),'PWA nao homologado pela fila');
const plan=read('app/saude/plano-seguranca/page.tsx'),more=read('app/mais/page.tsx'),offline=read('app/offline/page.tsx'),fallback=read('public/offline.html'),exporter=read('components/ExportButton.tsx');
for(const token of ['readSafetyPlan(activePersonId, user?.id)','saveSafetyPlan(activePersonId, plan, user.id)','importLegacySafetyPlan(activePersonId,user.id)','legacyConfirm','hasScopedSafetyPlan','hasLegacySafetyPlan','SAMU 192','CVV 188'])ok(plan.includes(token),`plano mantem ${token}`);
ok(plan.includes('não é criptografado'),'plano distingue armazenamento local e criptografia');
ok(!plan.includes('localStorage.clear('),'nunca limpa armazenamento global');
ok(more.includes('<OperationalReadinessM103')&&more.includes('pending={pendingQueueCount}'),'Mais usa dados reais de fila sem nova consulta');
ok(more.includes('activePerson?.user_id === user?.id'),'Mais confirma dono da pessoa');
ok(!read('components/OperationalReadinessM103.tsx').includes('fetch(')&&!read('components/OperationalReadinessM103.tsx').includes('db.'),'painel nao acessa banco ou rede');
ok(offline.includes('Somente dados já salvos')&&!offline.includes('Seus dados estão seguros'),'offline react sem certeza enganosa');
ok(fallback.includes('Apenas dados já salvos')&&!fallback.includes('documentos estão seguros'),'offline PWA sem certeza enganosa');
ok(read('public/sw.js').includes('M103 P1: atualiza o service worker'),'worker atualiza fallback sem descartar cache anterior');
ok(exporter.includes('JSON SEM criptografia')&&!exporter.includes('Dados exportados com segurança!'),'exportacao com aviso honesto');
ok(exporter.includes('Confira se o arquivo foi salvo'),'download nao declara sucesso sem confirmacao');
ok(read('scripts/test-v329-care-supply-safety.cjs').includes('migração consentida'),'V329 fortalecido em vez de removido');
ok(read('scripts/test-v22-v24-contract.mjs').includes('vault:safety-plan:v1:${personId}'),'legado continua reconhecido para migracao');
ok(read('scripts/test-v63-release-gate.mjs').includes('"scripts/test-vault-m103-p1-privacy-recovery.cjs"'),'release gate inclui novo contrato');
console.log(`VAULT M103 P1: ${checks} checagens hermeticas de privacidade, offline, backup, UX e compatibilidade aprovadas.`);
