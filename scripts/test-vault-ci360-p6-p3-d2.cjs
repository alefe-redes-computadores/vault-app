'use strict';
/** Contrato complementar P6 P3-D2: sintaxe de TS/TSX e caso comportamental de vínculo. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const path=require('node:path');
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const files=[
 'lib/repositories/consultas.ts',
 'app/saude/consultas/editar/page.tsx',
 'app/saude/medicamentos/novo/page.tsx',
 'app/saude/medicamentos/detalhes/page.tsx',
 'components/saude/MedicationTreatmentJourneyD2.tsx',
 'components/saude/ConsultationRelationsViewP6.tsx',
];
for(const file of files){
 const source=read(file);
 const parsed=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(parsed.parseDiagnostics.length,0,file+': sintaxe: '+parsed.parseDiagnostics.map(d=>d.messageText).join('; '));
 const emit=ts.transpileModule(source,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
 assert(!(emit.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error),file+': falha transpile');
}
const page=read('app/saude/medicamentos/novo/page.tsx');
const repo=read('lib/repositories/consultas.ts');
assert.match(page,/consultationContextD2\.person_id !== personId/);
assert.match(page,/consultationContextD2\.user_id !== user\.id/);
assert.match(page,/createdMedicationOnSaveD2 = medicamentoId/);
assert.match(page,/Medicamento salvo · vínculo pendente/);
assert.match(page,/if \(postSaveD2\) return/);
assert.match(page,/linkMedicationFromCreationD2/);
assert.match(repo,/consultation\.user_id !== userId \|\| consultation\.person_id !== person/);
assert.match(repo,/medication\.user_id !== userId \|\| medication\.person_id !== person/);
assert.match(repo,/revisao_vinculos_rejeitados\?\.includes\(medicationId\)/);
assert.match(repo,/enfileirarOperacao\("consultas", "update"/);
assert.match(read('components/saude/ConsultationRelationsViewP6.tsx'),/medicamentos\/novo\?consulta=\$\{encodeURIComponent\(consultation.id!\)\}/);
assert(!page.includes('new Date().setDate('));
const detail=read('app/saude/medicamentos/detalhes/page.tsx');
assert.match(detail,/isPrescriptionOnly/); assert.match(detail,/latestConfirmedAcquisitionM148/);
assert.match(detail,/firstRecordedDose=\{dosesTomadas/);
assert.match(read('components/saude/MedicationTreatmentJourneyD2.tsx'),/não significa comprar/);

// Exercitar o método real transpileado em um banco em memória sintético.
const start=repo.indexOf('  async linkMedicationFromCreationD2(');
const end=repo.indexOf('\n  // ==========================================================\n  // DELETE',start);
assert(start!==-1 && end>start);
const method=repo.slice(start,end).trim().replace(/,\s*$/,'');
const transpiled=ts.transpileModule('const subject={'+method+'}; globalThis.runD2=subject.linkMedicationFromCreationD2;',{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}
}).outputText;
let owner='owner-a'; let consulted, medication, events;
const store={
 consultas:{get:async id=>id===consulted.id?consulted:undefined,update:async(id,payload)=>{if(id!==consulted.id)return 0;consulted={...consulted,...payload};return 1;}},
 medicamentos:{get:async id=>id===medication.id?medication:undefined},
 syncQueue:{},
 transaction:async (_mode,_tables,callback)=>{
   const snapshot=structuredClone(consulted),count=events.length;
   try{return await callback();}catch(e){consulted=snapshot;events.length=count;throw e;}
 }
};
const box={db:store,getLocalFirstAuthUser:async()=>({data:{user:{id:owner}}}),requirePersonId:(x)=>{if(!x?.trim())throw Error('person');return x.trim();},scopedMedicationIdsP6:async (selected,u,p)=>{for(const id of selected){if(id!==medication.id||medication.user_id!==u||medication.person_id!==p)throw Error('cross-person');}return selected;},enfileirarOperacao:async (...args)=>{events.push(args);}};
vm.runInNewContext(transpiled,box,{filename:'d2-method.js'});
const run=box.runD2;
const reset=()=>{consulted={id:'c1',user_id:'owner-a',person_id:'p1',status:'realizada',medicamento_ids:[],revisao_vinculos_rejeitados:[]};medication={id:'m1',user_id:'owner-a',person_id:'p1'};events=[];owner='owner-a';};
(async()=>{
 reset();assert.equal(await run('c1','p1','m1'),'linked');assert.deepEqual(Array.from(consulted.medicamento_ids),['m1']);assert.equal(events.length,1);
 assert.equal(await run('c1','p1','m1'),'already-linked');assert.equal(events.length,1);
 reset();medication.person_id='p2';await assert.rejects(run('c1','p1','m1'),/Medicamento indisponível/);assert.equal(events.length,0);
 reset();consulted.user_id='owner-b';await assert.rejects(run('c1','p1','m1'),/Consulta indisponível/);
 reset();consulted.revisao_vinculos_rejeitados=['m1'];await assert.rejects(run('c1','p1','m1'),/rejeitado/);
 reset();consulted.status='cancelada';await assert.rejects(run('c1','p1','m1'),/cancelada/);
 reset();consulted.medicamento_ids=['m1','m1'];await assert.rejects(run('c1','p1','m1'),/precisam de revisão/);
 console.log('P6 P3-D2: sintaxe TypeScript + 6 cenários de vínculo/isolamento/idempotência OK');
})().catch(error=>{console.error(error);process.exitCode=1});
