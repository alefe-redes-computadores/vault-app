/* CareFlow R2: contracts and factual projection with synthetic data only. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
let count=0;
const ok=(condition,description)=>{assert.ok(condition,'CAREFLOW R2: '+description);count++;};
const read=path=>fs.readFileSync(path,'utf8');
const sourceFile=(path)=>ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
for(const path of ['app/saude/careflow/pressao/page.tsx','app/saude/careflow/dossie/page.tsx','app/saude/careflow/episodios/page.tsx','lib/m3/careflow-timeline.ts']){
 const parsed=sourceFile(path);
 ok(parsed.parseDiagnostics.length===0,`${path} sintaxe TypeScript valida: ${parsed.parseDiagnostics[0]?.messageText||''}`);
}
const transpiled=ts.transpileModule(read('lib/m3/careflow-timeline.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const m={exports:{}};
vm.runInNewContext(transpiled,{module:m,exports:m.exports,require:id=>{
 if(id==='@/lib/careflow-m2/domain')return {isIsoDateM2:v=>/^\d{4}-\d\d-\d\d$/.test(v)};
 throw Error('Import inesperado: '+id);
},Date,Object,Array,Map,Set,String,Number,RegExp,JSON,console},{timeout:3000});
const build=m.exports.buildCareFlowTimelineM3;
const own={user_id:'owner',person_id:'person'},other={user_id:'other',person_id:'person'};
const rec=[
 {...own,id:'bp',categoria:'medicao',tipo:'pressao_arterial',nome:'Pressão arterial',data:'2026-11-19',horario:'17:30',valor_medicao:'140/90'},
 {...own,id:'sym',categoria:'sintoma',tipo:'dor',nome:'Dor de cabeça',data:'2026-11-19',horario:'17:20',intensidade:9},
 {...other,id:'secret',categoria:'sintoma',nome:'SIGILO-OUTRA-CONTA',data:'2026-11-19'}
];
const event={...own,id:'note',kind:'monitor_note',parent_id:'consult',related_id:'bp',payload:{link:'pressure_context_explicit',source:'patient_confirmed',symptom_id:'sym',date:'2026-11-19',time:'17:30'},created_at:'2026-11-19T20:30:00Z'};
const got=build([event],'owner','person',rec);
ok(got.length===1,'observacao contextual da pessoa autorizada');
ok(got[0].title.includes('Pressão arterial'),'titulo reconhecivel');
ok(got[0].details.includes('140/90'),'valor medido preservado sem inferir faixa de risco');
ok(got[0].details.includes('Dor de cabeça'),'sintoma validado por ID e pessoa');
ok(got[0].details.includes('Sem inferência causal'),'nenhuma causalidade inventada');
ok(!got[0].details.includes('patient_confirmed'),'origem tecnica traduzida em texto humano');
ok(!JSON.stringify(got).includes('SIGILO-OUTRA-CONTA'),'sem vazamento de outra conta');
const alien=build([{...event,payload:{...event.payload,symptom_id:'secret'}}],'owner','person',rec);
ok(!JSON.stringify(alien).includes('SIGILO-OUTRA-CONTA'),'referencia cruzada nao revela sintoma estrangeiro');
const noPressure=build([event],'owner','person',rec.filter(r=>r.id!=='bp'));
ok(noPressure.length===1&&!noPressure[0].title.includes('Pressão arterial'),'registro de pressao ausente nao e fabricado');
ok(build([event],'owner','other-person',rec).length===0,'isolamento por pessoa');
ok(build([{...event,user_id:'other'}],'owner','person',rec).length===0,'isolamento por conta');
const pressure=read('app/saude/careflow/pressao/page.tsx');
ok(pressure.includes('consultationId')&&pressure.includes('symptomId')&&pressure.includes('ownConsultations.some')&&pressure.includes('ownSymptoms.some'),'seletores com verificacao de titular');
ok(pressure.includes('saveHealthMeasurement(scope.pid')&&pressure.includes('pressure_context_explicit'),'fonte canônica precede evento contextual');
ok(pressure.includes('repairContext')&&pressure.includes('pendingContext')&&(pressure.match(/id:p\.eventId/g)||[]).length===2&&pressure.includes('events.some(e=>e.id===p.eventId'),'reparo reaproveita mesmo id');
ok(!pressure.includes('db.version(')&&!pressure.includes('supabase'),'tela nao migra base nem chama nuvem');
const dossier=read('app/saude/careflow/dossie/page.tsx');
ok(dossier.includes('origin(row)')&&dossier.includes('ownedEvents')&&dossier.includes('ownedRecords'),'links somente com origem da pessoa autorizada');
ok(dossier.includes('makeCareFlowTimelinePdfM3(personName,visible)')&&dossier.includes('visible.length>500'),'PDF conforme filtro sem corte invisivel');
const episode=read('app/saude/careflow/episodios/page.tsx');
ok(episode.includes('episodeReturn')&&episode.includes('withReturnTarget(r.href,episodeReturn)'),'retorno contextual nas fontes');
ok(episode.includes('ClinicalBackLinkP0')&&episode.includes('careflow-episodio-linha'),'voltar e ancora da linha do tempo');
ok(episode.includes('episodeSourceLabel(r.source)'),'tipos tecnicos traduzidos no episodio');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.split('"scripts/test-vault-careflow-r2-contexto.cjs"').length===2,'registro oficial V63 apenas uma vez');
console.log(`CAREFLOW R2: ${count} garantias comportamentais e estrutura aprovadas`);
