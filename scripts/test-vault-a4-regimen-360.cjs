"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const read = file => fs.readFileSync(file,"utf8");
function pure(file,aliases={}) {
  const source=read(file);
  const compiled=ts.transpileModule(source,{fileName:file,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}});
  const errors=(compiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,`${file}: typescript syntax errors`);
  const box={exports:{},Date,Map,Set,Math,Number,String,RegExp,Error,Array,Object,JSON,console,require:id=>{
    if(id in aliases)return aliases[id];
    throw Error("Unapproved module in pure A4 test: "+id);
  }};
  vm.runInNewContext(compiled.outputText,box,{filename:file,timeout:3000});
  return box.exports;
}
const a1=pure("lib/clinical-a1/types.ts");
const a4=pure("lib/treatment-a4/regimen.ts",{"@/lib/clinical-a1/types":a1});
const id=(a)=>`${String(a).padStart(8,'0')}-1111-4111-8111-123456789012`;
function input(extra={}){return {versao:1,medicamento_id:id(1),dose_texto:"Dado explicitamente declarado",frequencia_texto:"",horarios:["08:00","20:00"],via:null,lateralidade:null,local_anatomico:null,fim_previsto:null,documento_id:null,consulta_id:null,...extra};}
let total=0;const check=(f)=>{f();total++};
check(()=>assert.equal(a1.validCivilDate("2026-02-29"),false));
check(()=>assert.equal(a1.validCivilDate("2024-02-29"),true));
check(()=>assert.equal(a1.a1DateBR("2026-11-21"),"21/11/2026"));
check(()=>assert.deepEqual(Array.from(a4.normalizeA4Regimen(input(),"2026-11-21").horarios),["08:00","20:00"]));
const invalid=[
  input({horarios:["8:00"]}),input({horarios:["25:00"]}),input({horarios:["08:60"]}),
  input({horarios:["08:00","08:00"]}),input({horarios:Array(13).fill("08:00")}),
  input({horarios:"08:00"}),input({lateralidade:"centro"}),input({natureza:"indefinido"}),input({fim_previsto:"2026-10-01"}),
  input({fim_previsto:"2026-11-31"}),input({dose_texto:"x".repeat(91)}),
  input({frequencia_texto:"x".repeat(121)}),input({medicamento_id:"wrong"}),
  input({medicamento_id:null,dose_texto:"texto"}),input({medicamento_id:null,dose_texto:null,horarios:["08:00"]}),
];
for(const bad of invalid)check(()=>assert.throws(()=>a4.normalizeA4Regimen(bad,"2026-11-21")));
check(()=>assert.throws(()=>a4.normalizeA4Regimen(input(),"2026-02-30")));
check(()=>assert.equal(a4.normalizeA4Regimen(input({fim_previsto:"2026-12-31"}),"2026-11-21").fim_previsto,"2026-12-31"));
check(()=>assert.equal(a4.normalizeA4Regimen(input({lateralidade:"esquerda"}),"2026-11-21").lateralidade,"esquerda"));
check(()=>assert.equal(a4.normalizeA4Regimen(input({horarios:[]}),"2026-11-21").horarios.length,0));
check(()=>assert.equal(a4.normalizeA4Regimen(input({natureza:"continuo"}),"2026-11-21").natureza,"continuo"));
function phase(n,extras={}){return {id:id(n),user_id:"user",person_id:"person",tratamento_id:"treat",tipo:"ajuste",data_efetiva:`2026-11-${String(n).padStart(2,"0")}`,origem:"relato_pessoal",created_at:`2026-11-${String(n).padStart(2,"0")}T07:00:00Z`,deleted_at:null,titulo:"mudança declarada",observacoes:null,...extras};}
check(()=>assert.equal(a4.a4History([],"user","person","treat").length,0));
check(()=>assert.equal(a4.a4RecordedSummary([]),"Sem mudanças de tratamento registradas."));
let phases=[phase(10),phase(11),phase(9,{user_id:"another"}),phase(8,{person_id:"other"}),phase(7,{tratamento_id:"another"}),phase(6,{deleted_at:"2026-11-08"})];
const timeline=a4.a4History(phases,"user","person","treat");
check(()=>assert.equal(timeline.length,2));
check(()=>assert.equal(timeline[0].item.data_efetiva,"2026-11-11"));
check(()=>assert.equal(timeline[1].nextRecordedDate,"2026-11-11"));
check(()=>assert.equal(timeline[0].nextRecordedDate,null));
check(()=>assert.ok(a4.a4RecordedSummary(timeline).includes("não é inferida")));
check(()=>assert.equal(a4.a4PhaseSourceLabel("orientacao_profissional"),"Orientação profissional informada"));
check(()=>assert.ok(a4.a4PhaseKindLabel("conclusao").includes("informado")));
// Repeatable fuzz of chronological filtering and non-inference: no owner/person leak, no artificial closure.
let seed=921216;const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
for(let k=0;k<500;k++){
  const records=Array.from({length:10},(_,i)=>phase((i%25)+1,{id:id(k*50+i+100),user_id:rnd()<0.17?"other":"user",person_id:rnd()<0.17?"other":"person",deleted_at:rnd()<0.1?"2026-11-20":null}));
  check(()=>{const expected=records.filter(x=>x.user_id==="user"&&x.person_id==="person"&&!x.deleted_at);
    const result=a4.a4History(records,"user","person","treat");
    assert.equal(result.length,expected.length);
    assert.ok(result.every(x=>x.item.user_id==="user"&&x.item.person_id==="person"));
    for(let i=1;i<result.length;i++)assert.ok(result[i-1].item.data_efetiva>=result[i].item.data_efetiva);
  });
}
const repository=read("lib/clinical-a1/repository.ts");
const types=read("lib/clinical-a1/types.ts");
const component=read("components/saude/TreatmentRegimenA4.tsx");
const detail=read("app/saude/tratamentos/detalhes/page.tsx");
const gate=read("scripts/test-v63-release-gate.mjs");
const sql=read("supabase/migrations/20261121_a4_regimen_on_a1_treatment_phases.sql");
const sync=read("hooks/useSyncQueue.ts");
const pull=read("lib/sync/pull.ts");
for(const [name,src,keys] of [
  ["repo",repository,["normalizeA4Regimen", "regime_a4:regimeA4", "db.a1_treatment_phases.add(row)", "dispatchSync:false", "db.consultas.get", "db.documents.get"]],
  ["types",types,["export interface A4RegimenSnapshot", "regime_a4?:"]],
  ["component",component,["useLiveQuery", "HealthRelationPicker", "CustomDatePicker", "role=\"alert\"", "regimeA4", "Sem medicamento específico"]],
  ["detail",detail,["import { TreatmentRegimenA4 }", "<TreatmentRegimenA4 treatmentId="]],
  ["gate",gate,["scripts/test-vault-a4-regimen-360.cjs", "scripts/test-vault-a3-macro2.cjs"]],
  ["sync",sync,["a1_treatment_phases", "const {synced, ...clean} = payload", "client.from(item.table).upsert"]],
  ["pull",pull,["remoteTable: \"a1_treatment_phases\"", "localTable: db.a1_treatment_phases"]],
  ["sql",sql,["alter table public.a1_treatment_phases add column", "security invoker", "vault_a4_phase_regime_guard", "public.medicamentos", "public.consultas", "public.documents"]]
])for(const key of keys)check(()=>assert.ok(src.includes(key),`${name}: missing ${key}`));
check(()=>assert.ok(!component.includes("<select"),"A4 must use premium picker instead of native visible selector"));
check(()=>assert.ok(!component.includes("type=\"date\""),"A4 must use CustomDatePicker"));
check(()=>assert.ok(!repository.includes("db.doseLogs.add")&&!repository.includes("db.doseLogs.put"),"No synthetic dose"));
check(()=>assert.ok(!sql.includes("create table")&&!sql.includes("drop table"),"No second ledger/destructive table change"));
console.log(`A4_MACRO1_CONTRATOS_OK | verificacoes=${total} | 500 cenários de propriedade | sem motor paralelo | V63 preservado`);
