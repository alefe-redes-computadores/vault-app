#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = process.cwd();
let checks = 0;
function ok(value, label) { assert.ok(value,label); checks++; }
function read(name) { return fs.readFileSync(path.join(root,name),'utf8'); }
function load(name) {
  const file=path.join(root,name);
  const compiled=ts.transpileModule(read(name),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.equal((compiled.diagnostics||[]).filter(item=>item.category===ts.DiagnosticCategory.Error).length,0,`parse ${name}`);
  checks++;
  const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));mod._compile(compiled.outputText,file);return mod.exports;
}
const utility=load('lib/medications/manufacturer-experience.ts');
const checkins=load('lib/medications/manufacturer-checkin-m127.ts');
const first={acquisitionId:'a-1',manufacturer:'Fabricante A',day:1,recordedAt:'2026-11-11T17:00:00Z',notes:'Relato privado A'};
let source=utility.attachManufacturerMetadata('Observação humana\nLinha de contexto', {manufacturer:'Fabricante A', commercialName:'Comercial X'});
source=checkins.upsertManufacturerCheckInM127(source,first);
ok(utility.stripManufacturerMetadata(source)==='Observação humana\nLinha de contexto','notas humanas separadas dos marcadores');
ok(utility.readManufacturerMetadata(source).manufacturer==='Fabricante A','identidade original preservada');
let edited=utility.mergeManufacturerAcquisitionEditM128(source,'Nova observação humana','Fabricante B');
ok(Boolean(edited),'resultado não vazio');
ok(utility.stripManufacturerMetadata(edited)==='Nova observação humana','substitui somente a nota humana');
ok(utility.readManufacturerMetadata(edited).manufacturer==='Fabricante B','troca de fabricante desta aquisição');
ok(utility.readManufacturerMetadata(edited).commercialName==='Comercial X','nome comercial original preservado');
ok(checkins.readManufacturerCheckInsM127(edited,'a-1').length===1,'relato não apagado na edição');
ok(checkins.readManufacturerCheckInsM127(edited,'a-1')[0].manufacturer==='Fabricante A','relato mantém fabricante de origem');
ok(!utility.stripManufacturerMetadata(edited).includes('[VAULT:'),'marcadores não vazam em notas editáveis');
let cleared=utility.mergeManufacturerAcquisitionEditM128(edited,'','Fabricante B');
ok(utility.stripManufacturerMetadata(cleared)==='','limpar observações preserva campos estruturados');
ok(checkins.readManufacturerCheckInsM127(cleared,'a-1').length===1,'limpar observações não apaga relatos');
let emptyLab=utility.mergeManufacturerAcquisitionEditM128(cleared,'', '');
ok(!utility.readManufacturerMetadata(emptyLab).manufacturer,'fabricante pode ser deixado vazio sem inventar nome');
ok(checkins.readManufacturerCheckInsM127(emptyLab,'a-1').length===1,'limpar fabricante não apaga relato histórico');
const second={...first,manufacturer:'Fabricante B',notes:'Relato privado B'};
let twoLabs=checkins.upsertManufacturerCheckInM127(edited,second);
ok(checkins.readManufacturerCheckInsM127(twoLabs,'a-1').length===2,'D1 de laboratórios diferentes não se sobrescrevem');
twoLabs=checkins.upsertManufacturerCheckInM127(twoLabs,{...second,notes:'Relato B corrigido'});
ok(checkins.readManufacturerCheckInsM127(twoLabs,'a-1').length===2,'D1 do mesmo laboratório é idempotente');
ok(checkins.readManufacturerCheckInsM127(twoLabs,'a-1').some(i=>i.manufacturer==='Fabricante A'&&i.notes==='Relato privado A'),'relato anterior não reatribuído');
ok(checkins.readManufacturerCheckInsM127(twoLabs,'a-1').some(i=>i.manufacturer==='Fabricante B'&&i.notes==='Relato B corrigido'),'retificação não muda outro fabricante');
ok(checkins.readManufacturerCheckInsM127(twoLabs,'outra-aquisicao').length===0,'isolamento por aquisição');
const prescription=utility.mergeManufacturerAcquisitionEditM128('Nota médica','Nova nota médica',undefined);
ok(prescription==='Nova nota médica','editar somente receita mantém notas normais');
for(const name of [
 'app/saude/renovacao/editar/page.tsx',
 'app/saude/medicamentos/editar/page.tsx',
 'components/saude/ManufacturerExperiencePanelM127.tsx',
 'components/saude/MedicationManufacturerOverviewM128.tsx',
]) {
 const output=ts.transpileModule(read(name),{fileName:path.join(root,name),compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
 ok((output.diagnostics||[]).every(i=>i.category!==ts.DiagnosticCategory.Error),`sintaxe TS/TSX ${name}`);
}
const form=read('app/saude/renovacao/editar/page.tsx');
ok(form.includes('setObservacoes(stripManufacturerMetadata(data.observacoes))'),'formulário não expõe marcadores internos');
ok(form.includes('mergeManufacturerAcquisitionEditM128(')&&form.includes('renovacao.observacoes,'),'salva mesclando dados do evento original');
ok(form.includes('Laboratório / fabricante da aquisição')&&form.includes('!somenteReceita'),'edição do fabricante apenas em aquisição');
ok(form.includes('data_aquisicao')||form.includes('Dados da aquisição original'),'controle de aquisição legado mantido');
const meds=read('app/saude/medicamentos/editar/page.tsx');
ok(meds.includes('MedicationManufacturerOverviewM128')&&meds.includes('medicationId={id}')&&meds.includes('userId={user.id}')&&meds.includes('personId={personId}'),'resumo por medicamento com escopo de pessoa e conta');
ok(meds.includes('Saldo atual, fabricantes, valores e dispensação pública'),'opção de fabricante localizável pelo usuário');
const overview=read('components/saude/MedicationManufacturerOverviewM128.tsx');
ok(overview.includes('db.renovacoes.where("medicamento_id")'),'consulta apenas eventos do medicamento');
ok(overview.includes('row.user_id === userId && row.person_id === personId'),'escopo real de conta e pessoa');
ok(overview.includes('!isPrescriptionOnly(row)'),'receita pura não inventa fabricante');
ok(overview.includes('readManufacturerMetadata(row.observacoes)'),'identidade vem do evento histórico');
ok(overview.includes('apenas neste aparelho')&&overview.includes('Não é sincronizada'),'preferência local claramente identificada');
ok(!overview.includes('updateMedicamento(')&&!overview.includes('estoque_quantidade ='),'painel não altera estoque ou cadastro clínico');
const panel=read('components/saude/ManufacturerExperiencePanelM127.tsx');
ok(panel.includes('historicalOtherLab')&&panel.includes('item.manufacturer'),'relatos antigos com laboratório anterior continuam visíveis');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('scripts/test-vault-m128-manufacturer-edit.cjs'),'M128 integrado ao gate canônico');
const details=read('app/saude/renovacao/detalhes/page.tsx');
ok(!details.includes('useRenovacoes()'),'V313 mantém assinatura reativa específica');
console.log(`VAULT M128: ${checks} contratos de fabricantes, histórico, privacidade e regressão aprovados`);
