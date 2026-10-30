#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.argv[2]||process.cwd();
const ts=require(path.join(root,'node_modules','typescript'));
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
for(const f of Object.keys(manifest)){
  const source=read(f);
  const compiled=ts.transpileModule(source,{fileName:f,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}});
  const errors=(compiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,`${f}: sintaxe TS/TSX`);
}
const source=read('lib/health-intelligence/operational-triage.ts');
const transpiled=ts.transpileModule(source,{fileName:'operational-triage.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const box={module:{exports:{}},exports:{}};box.exports=box.module.exports;
vm.runInNewContext(transpiled,box,{timeout:1000});
const {normalizeCareSearch,matchesCareSearch,summarizeWithdrawalProgress}=box.module.exports;
assert.equal(normalizeCareSearch('  FARMÁCIA Pública '),'farmacia publica');
assert(matchesCareSearch(' SUS remédio ', 'Medicamento REMÉDIO via SUS municipal'));
assert(matchesCareSearch('retirada 2026','2026-10-29 Retirada agendada'));
assert(!matchesCareSearch('comprovante perdido','Comprovante disponível'));
assert(matchesCareSearch('  ','Qualquer coisa'));
const progress=summarizeWithdrawalProgress([
  {status:'agendada',data:'2026-10-28'},
  {status:'agendada',data:'2026-10-30'},
  {status:'agendada',data:'2026-10-29'},
  {status:'realizada',data:'2026-10-20'},
  {status:'cancelada',data:'2026-10-28'},
  {status:'nao_realizada',data:'2026-10-27'},
], '2026-10-29');
assert.deepEqual(JSON.parse(JSON.stringify(progress)),{scheduled:2,overdue:1,realized:1,cancelled:1,notRealized:1});
assert.equal(summarizeWithdrawalProgress([{status:'agendada',data:'sem-data'}],'2026-10-29').overdue,0);
const supply=read('components/saude/SupplyProcessJourney.tsx');
const page=read('app/saude/fornecimento/page.tsx');
assert(supply.includes('complete:false'),'compra/retirada não pode concluir etapa sem autoridade');
assert(supply.includes('withdrawalProgress.overdue'),'retirada vencida deve continuar visível');
assert(page.includes('summarizeWithdrawalProgress(processWithdrawals,getLocalTodayISO())'),'status computado dos registros vinculados');
for(const name of ['CareReadinessSummary','CareDocumentReadiness','MedicationSafetyCoverage']){
  const s=read(`components/saude/${name}.tsx`);
  for(const token of ['aria-pressed','type="search"','role="status"','matching.length'])assert(s.includes(token),`${name}: ${token}`);
}
const links=read('components/saude/TreatmentCareLinks.tsx');
for(const token of ['view==="pending"','view==="history"','withdrawalProgress.overdue','matchesCareSearch'])assert(links.includes(token),`tratamento: ${token}`);
const financial=read('components/saude/CareFinancialOutlook.tsx');
assert(financial.includes('realized30===undefined?"Não informado"'),'realizado ausente não pode virar zero');
const brain=read('components/saude/CareCommandStrip.tsx');
assert(brain.includes('evidenceKind')&&brain.includes('Base: projeção'),'Brain: fonte da decisão');
const avatar=read('components/saude/AvatarAssociationSummary.tsx');
assert(avatar.includes('items.slice(1)')&&avatar.includes('aria-expanded={showAll}'),'Avatar: ver outras associações');
console.log(`V341: ${Object.keys(manifest).length} arquivos; sintaxe; busca pt-BR; seis estados de retiradas; filtros; Brain/Avatar; finanças desconhecidas OK`);
