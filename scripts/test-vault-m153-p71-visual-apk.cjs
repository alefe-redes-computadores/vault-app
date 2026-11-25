#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript'),Module=require('module');
const read=p=>fs.readFileSync(p,'utf8');
for(const p of ['app/page.tsx','app/saude/medicamentos/page.tsx','components/home/HomeDailyHero.tsx','components/home/HomeCommandCenter.tsx','components/home/HomeSupplyAccessTiles.tsx','lib/home/next-routine-dose-p71.ts']){
  const ast=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(ast.parseDiagnostics.length,0,p+': syntax');
}
const home=read('app/page.tsx'),med=read('app/saude/medicamentos/page.tsx'),hero=read('components/home/HomeDailyHero.tsx'),supply=read('components/home/HomeSupplyAccessTiles.tsx'),command=read('components/home/HomeCommandCenter.tsx');
assert(home.includes('retirada.medicamento_nome || medicamentoLigado?.nome')&&home.includes('retiradasAgendaM147.slice(0, 3).map(renderRetiradaAgendaP7)')&&home.includes('retiradasAgendaM147.length > 3')&&home.includes('Ver mais {retiradasAgendaM147.length - 3} na Agenda')&&home.includes('router.push("/saude/retiradas?return_to=%2F")'));
assert(home.includes('setMostrarTodosAlertas(false)')&&home.includes('HomeAttentionRail alerts={unifiedAlerts}'));
assert(home.includes('Acompanhamento contextual do Brain')&&home.includes('Explorar observações no VAULT Brain')&&home.includes('!quantityAlreadyInBrain'));
assert(hero.includes('{title}')&&hero.includes('{description}')&&!hero.includes('contextLabel &&')&&home.includes('routineContextP7R3'));
assert(command.includes('Retiradas e fornecimento')&&command.includes('<HomeSupplyAccessTiles')&&supply.includes('withdrawalPath')&&supply.includes('supplyPath'));
assert(!med.includes('min-h-[200px]')&&(med.includes('regulatoryListLabelMED04(regulatoryProfile, reconciliationP6, catalogIdentity?.regulatoryNeedsReview === true)') && med.includes('{prescriptionIdentityP6}') && med.includes('aria-label={`Ver classificação da receita: ${prescriptionIdentityP6}`}') && !med.includes('prescriptionIdentityP6 ?? medicationRegulatoryShortLabel')));
assert(med.includes('VAULT_M144_LIST_ENTRY')&&med.includes('Mais opções e ajuda')&&med.includes('MedicationFilterBar value={medicationFilter} onChange={selectMedicationFilter}/>'));
assert(med.includes('exactClosedWithdrawalP7')&&med.includes('activeScheduledWithdrawalP5P4'));
assert.equal(read('scripts/test-v63-release-gate.mjs').split('"scripts/test-vault-m153-p71-visual-apk.cjs"').length-1,1);
const source=read('lib/home/next-routine-dose-p71.ts');
assert(source.includes('normalizedMedicationSchedules')&&source.includes('log.ignorado_em')&&source.includes('log.dose_kind!=="sos"'));
// Tested against the schedule shape already used by the real normalizedMedicationSchedules.
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const m={exports:{}};
const req=id=>{if(id!=="@/lib/medication-dose-history")throw new Error(id);return{normalizedMedicationSchedules:med=>(med.estoque_horarios||[]).filter(h=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(h)).sort()}};
new Function('require','module','exports',js)(req,m,m.exports);
const next=m.exports.nextHomeRoutineDoseP71;
const meds=[{id:'cer',nome:'Cerumin',tipo_uso:'continuo',estoque_horarios:['16:00']},{id:'don',nome:'Donaren',tipo_uso:'continuo',estoque_horarios:['22:00']},{id:'sos',nome:'SOS',tipo_uso:'sos',estoque_horarios:['20:00']}];
assert.equal(next(meds,[{medicamento_id:'cer',horario:'16:00',tomado_em:'2026-11-15T16:00:00'}],'21:28').name,'Donaren');
assert.equal(next(meds,[{medicamento_id:'cer',horario:'16:00',tomado_em:'x'},{medicamento_id:'don',horario:'22:00',ignorado_em:'x'}],'21:28'),null);
assert.equal(next(meds,[],'21:28').name,'Cerumin');
assert.equal(next(meds,[],'invalid'),null);
console.log('VAULT M153 P7.1: estrutura + proxima dose real + filtros + navegação OK');
