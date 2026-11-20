"use strict";
// A1 FIX1: report ALL independent A1 contract/TS syntax errors in one run.
// Never treat exact whitespace/string formatting as domain authority.
const fs=require("node:fs");
const ts=require("typescript");
const vm=require("node:vm");
const problems=[];
const checked=[];
const check=(ok,label)=>{
  checked.push(label);
  if(!ok){problems.push(label);console.error("[A1 FAIL] "+label);}
};
const safe=(label,fn)=>{try{fn();}catch(error){check(false,`${label}: ${error?.stack || error}`);}};
const read=path=>{
  try{return fs.readFileSync(path,"utf8");}
  catch(error){check(false,`arquivo ausente/ilegível: ${path} — ${error.message}`);return "";}
};
const expected=[
 "lib/types.ts","lib/db/index.ts","hooks/useSyncQueue.ts","lib/sync/pull.ts","lib/health-hub/r5.ts",
 "lib/repositories/medicos.ts","lib/repositories/tratamentos.ts","lib/repositories/renovacoes.ts",
 "app/saude/medicos/novo/page.tsx","app/saude/medicos/editar/page.tsx","app/saude/medicos/page.tsx","app/saude/medicos/detalhes/page.tsx",
 "lib/clinical-a1/types.ts","lib/clinical-a1/repository.ts","components/saude/ProfessionalClassificationA1.tsx","app/saude/engenharia-clinica/page.tsx",
 "scripts/test-vault-a1-domain-execution.cjs","scripts/test-vault-a1-v63-sweep.cjs","docs/VAULT-A1-001-ENGENHARIA-CLINICA.sql",
 "docs/VAULT-A1-002-AUDITORIA-READONLY.sql","docs/VAULT-A1-MACRO2.md"
];
for(const f of expected)check(fs.existsSync(f),`A1 arquivo obrigatório: ${f}`);
const [db,types,sync,pull,repo,sql]=[
 "lib/db/index.ts","lib/types.ts","hooks/useSyncQueue.ts","lib/sync/pull.ts",
 "lib/clinical-a1/repository.ts","docs/VAULT-A1-001-ENGENHARIA-CLINICA.sql"
].map(read);
const names=["a1_treatment_phases","a1_prescription_links","a1_supply_locations"];
for(const name of names){
 check(types.includes(`| "${name}"`),`SyncQueue union: ${name}`);
 check(db.includes(`${name}!: Table<`),`Dexie table: ${name}`);
 check(new RegExp(`${name}:\\s*["']id,\\s*user_id,\\s*person_id`).test(db),`Dexie index: ${name}`);
 check(sync.includes(`case "${name}"`),`sync dispatch: ${name}`);
 // The original A1 test incorrectly looked for `table:"${name}"`.
 // processTable actually names this option remoteTable; check the real contract.
 check(new RegExp(`remoteTable\\s*:\\s*["']${name}["']`).test(pull),`pull remoteTable: ${name}`);
 check(new RegExp(`queueTable\\s*:\\s*["']${name}["']`).test(pull),`pull queueTable: ${name}`);
 check(pull.includes(`db.${name}`),`pull Dexie target: ${name}`);
 check(sync.includes(`"${name}"`),`sync priority/mark: ${name}`);
 check(sql.includes(`CREATE TABLE IF NOT EXISTS public.${name}`),`SQL table: ${name}`);
 check(sql.includes(`'${name}'`),`SQL RLS loop: ${name}`);
}
const versions=[...db.matchAll(/this\.version\((\d+)\)/g)].map(x=>Number(x[1]));
check(versions.length>0&&Math.max(0,...versions)>=50,"A1 migration: Dexie V50+");
check(new Set(versions).size===versions.length,"Dexie: sem versões duplicadas");
check(sync.includes("categoria_profissional: medico.categoria_profissional ?? null"),"push: categoria profissional");
check(sync.includes("a1_identity_revision: medico.a1_identity_revision ?? 0"),"push: revisão de identificação");
check(sync.includes("syncClinicalA1Ledger"),"A1: sincronizador reaproveita fila existente");
check(sync.includes('"a1_treatment_phases"')&&sync.includes('"a1_supply_locations"'),"A1: ordem topológica de fila");
check(read("lib/repositories/medicos.ts").includes("a1_identity_revision: (current.a1_identity_revision ?? 0) + 1"),"cadastro: limpeza intencional de conselho e categoria");
check(!/db\.(?:medicamentos|retiradas|renovacoes)\.(?:put|add|update)\s*\(/.test(repo),"imutabilidade: estoque, dose, compra e retirada");
check(repo.includes("isPrescriptionOnly(event)"),"guarda: receita sem aquisição");
check(repo.includes("db.syncQueue"),"A1: inclusão transacional em fila offline");
check(repo.includes("Esse vínculo formaria um ciclo"),"guarda: ciclos entre receitas");
check(repo.includes("user_id!==input.userId"),"guarda: identidade e proprietário");
check(sql.includes("ENABLE ROW LEVEL SECURITY"),"SQL: RLS nas três entidades");
check(sql.includes("vault_a1_guard_references"),"SQL: validação relacional por pessoa");
check(sql.includes("vault_a1_professional_preserve"),"SQL: proteção para APK antigo");
for(const page of ["app/saude/medicos/novo/page.tsx","app/saude/medicos/editar/page.tsx"]){
 const s=read(page);
 check(s.includes("<ProfessionalClassificationA1"),`${page}: controles profissionais visíveis`);
 check(s.includes("conselho_numero: conselhoNumero.trim()"),`${page}: gravação do conselho`);
 check(!s.includes("pb-[calc(10rem+env(safe-area-inset-bottom))]"),`${page}: sem faixa preta exagerada`);
}
for(const [path,marker] of [
 ["lib/repositories/medicos.ts","Profissional com evolução clínica vinculada"],
 ["lib/repositories/tratamentos.ts","Tratamento com fases históricas"],
 ["lib/repositories/renovacoes.ts","Receita vinculada a outra versão"]
])check(read(path).includes(marker),`exclusão histórica: ${path}`);
const professionalComponent=read("components/saude/ProfessionalClassificationA1.tsx");
check(professionalComponent.includes('createLucideIcon("id-card", ['),"Lucide: IdCard real construído com API Lucide compatível 0.417");
check(professionalComponent.includes('<IdCard size={13}'),"Lucide: cartão de identificação no campo Registro");
check(professionalComponent.includes('M6.17 15a3 3 0 0 1 5.66 0'),"Lucide: geometria oficial de identidade preservada");
check(!professionalComponent.includes('CreditCard'),"Lucide: remover ícone de cartão bancário do Registro");
check(read("app/saude/medicos/detalhes/page.tsx").includes("professionalCategoryLabel"),"detalhes: categoria profissional");
check(read("app/saude/medicos/page.tsx").includes("Profissionais de Saúde"),"lista: título profissional");
check(read("lib/health-hub/r5.ts").includes('href:"/saude/engenharia-clinica"'),"Hub: link central clínica");
const newPage=read("app/saude/engenharia-clinica/page.tsx");
const nativeUi=[
 ["app/saude/engenharia-clinica/page.tsx",newPage],
 ["components/saude/ProfessionalClassificationA1.tsx",professionalComponent],
];
for(const [path,source] of nativeUi){
 check(!/<select\b[^>]*>/gs.test(source),`${path}: usa seletor visual nativo (V112 proíbe)`);
 check(!/<input\b[^>]*type\s*=\s*["'](?:date|time|datetime-local)["'][^>]*>/gs.test(source),`${path}: data/hora nativa visual (V112 proíbe)`);
 check(source.includes("HealthRelationPicker"),`${path}: seletor VAULT acessível e pesquisável`);
}
check(newPage.includes("CustomDatePicker"),"A1: calendário VAULT já homologado");

for(const label of ["Engenharia Clínica 360","Evolução dos tratamentos","Relações entre receitas reais","Histórico de locais de fornecimento","Sincronização solicitada"])
 check(newPage.includes(label),`UI engenharia: ${label}`);
// TSX and TS compiler options differ. Passing jsx=None (original A1) is INVALID.
for(const f of expected.filter(x=>x.endsWith(".ts")||x.endsWith(".tsx"))){
 if(!fs.existsSync(f))continue;
 safe(`TypeScript ${f}`,()=>{
  const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS};
  if(f.endsWith(".tsx"))options.jsx=ts.JsxEmit.ReactJSX;
  const out=ts.transpileModule(read(f),{fileName:f,reportDiagnostics:true,compilerOptions:options});
  const errors=(out.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
  check(errors.length===0,`TS/TSX ${f}: ${errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText," ")).join(" | ")}`);
 });
}
safe("data civil real e formato brasileiro",()=>{
 const body=ts.transpileModule(read("lib/clinical-a1/types.ts"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const scope={exports:{},Date};vm.runInNewContext(body,scope,{filename:"lib/clinical-a1/types.ts"});
 const valid=scope.exports.validCivilDate;
 check(valid("2024-02-29"),"data: dia bissexto aceito");
 check(!valid("2026-02-29")&&!valid("2026-02-31")&&!valid("2026-13-01"),"data: inválidas recusadas");
 check(scope.exports.a1DateBR("2026-11-20")==="20/11/2026","data: dd/mm/aaaa");
});
console.log(`A1_AUDITORIA_ESTRUTURAL_COMPLETA | checagens=${checked.length} | falhas=${problems.length}`);
if(problems.length){console.error("A1_FALHAS_ESTRUTURAIS: "+problems.join(" || "));process.exitCode=1;}
else console.log(`VAULT_A1_MACRO2_DIRIGIDO_OK | ${expected.length} arquivos | paridade+RLS+UI+datas+sem mutação de estoque`);
