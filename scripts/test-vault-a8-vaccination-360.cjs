#!/usr/bin/env node
/** A8 owned vaccination records: behavioral + negative contracts; zero network or patient data. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
let passed=0;function ok(value,label){assert.ok(value,'A8: '+label);passed++;}
const read=p=>fs.readFileSync(p,'utf8');
function pure(name){const src=read(name),code=ts.transpileModule(src,{fileName:name,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const m={exports:{}};vm.runInNewContext(code,{module:m,exports:m.exports,require(name){if(name.includes('/vaccination-a8/types'))return require('typescript');throw Error('Side-effect dependency forbidden: '+name);},Date,Set,Map,JSON,console},{filename:name});return m.exports;}
const a=pure('lib/vaccination-a8/types.ts');
const uid='owner-a',pid='person-a',other='person-b';
ok(a.A8_TABLES.length===2&&a.A8_TABLES.includes('vaccination_events_a8'),'duas tabelas, sem engine paralelo');
for(const v of ['2026-02-29','2026-11-31','2026-13-01','20/11/2026','2026-11-22T12:00Z',''])ok(!a.validCivilDayA8(v),'nega data inválida: '+v);
ok(a.validCivilDayA8('2024-02-29')&&a.datePtA8('2024-02-29')==='29/02/2024','data civil sem UTC deslocado');
const make=(id,kind,corrects=null,personId=pid)=>({id,course_id:'a',user_id:uid,person_id:personId,
 kind:corrects?'amendment':kind,effective_kind:kind,planned_on:kind==='plan'?'2026-11-25':null,
 administered_on:kind==='dose'?'2026-11-20':null,dose_number:1,manufacturer:null,lot:null,
 source:'self_report',source_professional_id:null,source_location_id:null,note:null,corrects_event_id:corrects,
 created_at:'2026-11-22T00:00:00.000Z',updated_at:'2026-11-22T00:00:00.000Z',deleted_at:null});
const rows=[make('future','plan'),make('applied','dose'),make('foreign','dose',null,other)];
ok(a.factualDoseCountA8(rows,uid,pid)===1,'planejamento não vira aplicação, pessoa alheia não entra');
ok(a.factualDoseCountA8(rows,uid,other)===1,'isolamento para pessoa B');
const amendment=make('amended','plan','applied');ok(a.factualDoseCountA8([...rows,amendment],uid,pid)===0,'retificação não retém aplicação cancelada/reclassificada');
const v={...make('void','void','future'),kind:'void',effective_kind:'void',planned_on:null,administered_on:null};
ok(a.currentVaccinationEventsA8([...rows,v],uid,pid).some(x=>x.id==='void'),'cancelamento mantém evento, não apaga histórico');
ok(!a.legacyDiaryVaccinationA8('VAULT_M144|{"tag":"procedure","title":"teste"}'),'procedimento legado não vira vacina');
ok(!a.legacyDiaryVaccinationA8('VAULT_M144|bad-json'),'legado malformado não vira dose');
const raw=a.legacyDiaryVaccinationA8('VAULT_M144|{"tag":"immunization","title":"relato antigo","start":"2026-11-21"}');
ok(raw?.title==='relato antigo'&&a.factualDoseCountA8([],uid,pid)===0,'relato antigo não é promovido a dose confirmada');
for(const name of ['lib/vaccination-a8/repository.ts','lib/vaccination-a8/sync.ts','components/saude/VaccinationA8Workspace.tsx','components/saude/VaccinationAccessA8.tsx','app/saude/vacinas/page.tsx','lib/m3/medical-dossier-p3.ts']){
 const s=read(name),ast=ts.createSourceFile(name,s,ts.ScriptTarget.Latest,true,name.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(ast.parseDiagnostics.length===0,'parser TypeScript '+name);
}
const repo=read('lib/vaccination-a8/repository.ts');
for(const part of ['getLocalFirstAuthUser','db.persons.get','enfileirarOperacao','corrects_event_id','scope(input.personId)','sourceProfessionalId','deleted_at'])ok(repo.includes(part),'writer com guarda '+part);
const sync=read('lib/vaccination-a8/sync.ts');
for(const part of ['syncVaccinationA8','pendingVaccinationA8Dependency','maybeSingle','deleted_at','updated_at','correction']){
 ok(sync.includes(part.replace('correction','fatos imutáveis')),'sync '+part);
}
const m144=read('components/saude/M144ClinicalPanel.tsx');ok(m144.includes("event.tag==='immunization'")&&m144.includes('Abrir carteira de vacinação'),'nenhum segundo escritor M144');
const db=read('lib/db/index.ts');ok(db.includes('this.version(56).stores({')&&db.includes('vaccination_courses_a8:')&&db.includes('vaccination_events_a8:'),'Dexie v56 aditiva');
const types=read('lib/types.ts'),pull=read('lib/sync/pull.ts'),q=read('hooks/useSyncQueue.ts'),top=read('lib/sync/dependency-order.ts');
for(const name of a.A8_TABLES)for(const [path,content] of [['types',types],['pull',pull],['queue',q],['topological',top]])ok(content.includes(name),name+' paridade '+path);
const policy=read('lib/clinical-exams-m3/policy.ts');ok(policy.includes("'vaccination_event'"),'M3 vínculo tipado, sem URL pública');
const sql=read('supabase/migrations/20261122141751_vault_a8_vaccination_360.sql');
for(const x of ['ENABLE ROW LEVEL SECURITY','auth.uid()','FOREIGN KEY(person_id,user_id)','corrects_event_id','a8_event_immutable','vaccination_event','clinical_asset_links','course_guard','DELETE RESTRICT'])ok(sql.includes(x),'SQL guard '+x);
for(const path of ['app/page.tsx','app/hoje/page.tsx','app/saude/careflow/page.tsx'])ok(read(path).includes('VaccinationAccessA8'),'sem segundo cadastro na '+path);
ok(read('lib/m3/medical-dossier-p3.ts').includes("if(selected('vaccinations')")&&read('app/saude/careflow/modo-medico/page.tsx').includes('vaccination:'),'Modo Médico/PDF mesmo leitor');
const gate=read('scripts/test-v63-release-gate.mjs');ok(gate.includes('"scripts/test-vault-a8-vaccination-360.cjs"'),'V63 inclui A8 uma vez');
console.log(`A8-VACCINATION-360-OK | ${passed} verificações puras/negativas/estruturais | sem rede ou SQL`);
