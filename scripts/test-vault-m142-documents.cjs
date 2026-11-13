'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const files = ['lib/health-supply/presentation.ts','app/saude/fornecimento/page.tsx','components/saude/SupplyCycleSummary.tsx'];
for (const rel of files) {
  const source = read(rel);
  const parsed = ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length,0, `${rel} possui erro de sintaxe: ${parsed.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join('; ')}`);
}
const code = ts.transpileModule(read(files[0]), { fileName: files[0],compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true });
assert.equal(code.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).length || 0,0);
const mod = new Module('health-supply-presentation',module);
mod.filename=path.join(root, files[0]);
mod.paths=module.paths;
mod._compile(code.outputText,mod.filename);
const { prioritizedSupplyDocuments, unassignedSupplyDocuments, supplyDocumentMedicationId }=mod.exports;
const make=(id,medicationId,created_at='2026-11-01T00:00:00.000Z',overrides={})=>({id,person_id:'p',user_id:'u',category_id:'saude',title:`Documento ${id}`,type:'receita',metadata:{},entidade_tipo:medicationId?'medicamento':undefined,entidade_id:medicationId || undefined,attachments:[],created_at,...overrides});
const rows=[
  make('rx-old','med-a','2026-10-01T00:00:00.000Z'),
  make('rx-other','med-b','2026-11-11T00:00:00.000Z'),
  make('rx-new',null,'2026-11-10T00:00:00.000Z',{metadata:{medicamento_id:'med-a'}}),
  make('rx-unassigned',null,'2026-11-12T00:00:00.000Z'),
  make('rx-stranger','med-a','2026-11-12T00:00:00.000Z',{person_id:'another'}),
  make('other-category','med-a','2026-11-12T00:00:00.000Z',{category_id:'pessoal'})
];
const relevant=prioritizedSupplyDocuments(rows,'p','u',new Set(['med-a']));
assert.deepEqual(relevant.map(x=>x.id),['rx-new','rx-old'],'Somente receitas do medicamento, da mais recente para a antiga');
assert.deepEqual(unassignedSupplyDocuments(rows,'p','u').map(x=>x.id),['rx-unassigned'],'Sem medicamento em revisão separada');
assert.equal(supplyDocumentMedicationId(rows[2]),'med-a');
assert.equal(supplyDocumentMedicationId(rows[3]),null);
assert.deepEqual(prioritizedSupplyDocuments(rows,'p','u',new Set()),[],'Sem medicamento: nunca incluir todo acervo');
assert.deepEqual(prioritizedSupplyDocuments(rows,'p','other-user',new Set(['med-a'])),[],'Isolamento de conta');
const page=read(files[1]);
const summary=read(files[2]);
assert.match(page,/&aba=documentos/, 'Retorno deve abrir a aba documentos');
assert.match(page,/links\.some\(l => l\.document_id === d\.id\)/,'Estado salvo por vínculo');
assert.match(page,/Vínculo salvo, entrega informada e exigência atendida são estados diferentes/,'Não confundir vínculo e exigência atendida');
assert.match(page,/showUnassignedDocuments \? \[\.\.\.availableCycleDocuments, \.\.\.unassignedCycleDocuments\]/,'Revisão de documentos sem medicamento deve ser explícita');
assert.match(page,/selectableCycleDocuments\s*\.map/,'Seletor restrito');
assert.doesNotMatch(summary,/availableHealthDocuments/,'O resumo não deve mostrar o acervo global');
assert.match(summary,/availableMedicationDocuments/);
console.log('M142 R2: CONTRATOS DE DOCUMENTOS OK | escopo, recente, isolamento, revisão, estado, retorno e TS/TSX sintático.');
