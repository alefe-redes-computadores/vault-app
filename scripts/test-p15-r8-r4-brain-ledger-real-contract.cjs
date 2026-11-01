#!/usr/bin/env node
'use strict';
const fs=require('node:fs'), assert=require('node:assert/strict');
const ts=require('typescript'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');let checks=0;
function ok(value,label){assert(value,'P15 R8 R4: '+label);console.log(`✓ ${++checks}: ${label}`);}
const old=read('scripts/test-brain-v5-completion-contract.mjs');
const brain=read('lib/health-intelligence/brain-v5.ts');
const hook=read('hooks/useBrainV5Alerts.ts');
const repo=read('lib/repositories/brainV5AlertLedger.ts');
const central=read('app/inteligencia/alertas/page.tsx');
const sheet=read('components/vault-intelligence/BrainV5DetailSheet.tsx');
const pulse=read('hooks/useBrainV5Pulse.ts');
const gate=read('scripts/test-v63-release-gate.mjs');
for(const [name,code] of [['Brain engine',brain],['Brain hook',hook],['Brain ledger',repo],['Brain central',central],['Brain detail',sheet],['Brain pulse',pulse]]){
 const tree=ts.createSourceFile(name+'.ts',code,ts.ScriptTarget.Latest,true,name.includes('central')||name.includes('detail')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(tree.parseDiagnostics.length===0,`${name}: sintaxe válida`);
}
ok(hook.includes('repo.reconcile(user.id, activePersonId, health.insights)')&&hook.includes('health.context?.personId !== activePersonId'),'Hook valida pessoa ativa antes de reconciliar');
ok(repo.includes('reconcileBrainV5(personId, insights, current)')&&repo.includes('db.transaction("rw", [db.settings, db.syncQueue]'),'Repositório executa reconciliação em transação');
ok(repo.includes('if (JSON.stringify(next) === JSON.stringify(current)) return current;')&&repo.includes('if (changed) solicitarProcessamentoSync()'),'Atualização idempotente não agenda sincronização sem mudança');
ok(repo.includes('await enfileirarOperacao("settings"')&&repo.includes('safeUpdateSettings')&&repo.includes('safeAddSettings'),'Ledger persiste e enfileira apenas a linha salva');
ok(repo.includes('item.person_id === personId')&&repo.includes('item.key === key'),'Feedback preserva escopo da pessoa e insight');
ok(pulse.includes('db.settings')&&!pulse.includes('useHealthIntelligence'),'Pulso Home não executa segundo motor clínico');
ok(central.includes('<BrainV5DetailSheet')&&central.includes('new URLSearchParams(window.location.search).get("insight")'),'Central abre detalhe e deep-link do insight');
ok(sheet.includes('Por que está nesta posição:')&&sheet.includes('alert.snapshot.evidencias')&&sheet.includes('alert.snapshot.fontes_externas')&&sheet.includes('summarizeRegulatorySources'),'Detalhe conserva explicação, evidências e referências regulatórias');
ok(old.includes('persistência atômica e idempotente')&&old.includes('painel real preservadas'),'Contrato V5 Completion acompanha a arquitetura publicada');
ok(!old.includes('hook.includes("x.material_fingerprint")')&&!old.includes('ui.includes("Por que o Vault mostrou isso?")'),'Contrato não exige lógica ou texto nos donos antigos');
ok(gate.includes('scripts/test-p15-r8-r4-brain-ledger-real-contract.cjs'),'Contrato preventivo integra o gate');

// Execute the canonical, unchanged Brain V5 reconciliation from the real source.
// Stub its non-ledger presentation dependencies; no clinical mutation, no DB.
const compiled=ts.transpileModule(brain,{fileName:'brain-v5.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const m={exports:{}};
const sandbox={module:m,exports:m.exports,Date,Set,Map,JSON,Math,Number,String,Array,Boolean,RegExp,console,require:(name)=>{
 if(name==='./priority')return {healthPriorityPresentation:()=>({tone:'neutral',label:'Observação'})};
 if(name==='./brain-next')return {
  brainMeaningfulEvidence:(i)=>({evidence:i.evidencias??[],sources:i.fontesInternas??[]}),
  brainSignalSemantics:()=>({lane:'next',domain:'medication',actionability:'observe',evidenceQuality:'limited',factors:{total:100}}),
 };
 throw Error('Dependência não simulada: '+name);
}};
vm.runInNewContext(compiled,sandbox,{timeout:2000,filename:'brain-v5-real.ts'});
const fn=m.exports.reconcileBrainV5;
ok(typeof fn==='function','Motor canônico de reconciliação executável');
const base={id:'signal-m1',kind:'alert',categoria:'medicamentos',titulo:'Revisar medicamento',mensagem:'Primeiro aviso',urgencia:'media',confianca:'alta',amostra:3,gravidadeSeguranca:'atencao',entidadeTipo:'medicamento',entidadeId:'m1',evidencias:['Amostra observada'],fontesInternas:['registros']};
const t1='2026-10-31T10:00:00.000Z',t2='2026-10-31T11:00:00.000Z';
const first=fn('p1',[base],[],t1);
ok(first.length===1&&first[0].person_id==='p1'&&first[0].occurrences===1&&first[0].episode===1,'Primeira detecção cria um episódio da pessoa correta');
const same=fn('p1',[base],first,t2);
ok(same[0].occurrences===1&&same[0].last_detected_at===t1,'Reconciliação repetida não inventa episódio ou atualização');
const modified=fn('p1',[{...base,mensagem:'Aviso com alteração material'}],same,t2);
ok(modified[0].occurrences===2&&modified[0].episode===1&&modified[0].last_detected_at===t2,'Mudança material gera uma atualização, sem novo episódio');
const resolved=modified.map(x=>({...x,state:'resolved',resolved_at:t2}));
const reappeared=fn('p1',[{...base,mensagem:'Aviso com alteração material'}],resolved,'2026-10-31T12:00:00.000Z');
ok(reappeared[0].state==='active'&&reappeared[0].episode===2&&reappeared[0].occurrences===3,'Alerta resolvido e reaparecido abre novo episódio');
const foreign={...first[0],person_id:'p2',key:'p2-other'};
const scoped=fn('p1',[base],[foreign],t2);
ok(scoped.some(x=>x.person_id==='p2'&&x.key==='p2-other')&&scoped.some(x=>x.person_id==='p1'),'Reconciliação preserva alertas de outras pessoas sem misturar contas');
console.log(`P15 R8 R4: ${checks} verificações reais de ledger e explicabilidade aprovadas`);
