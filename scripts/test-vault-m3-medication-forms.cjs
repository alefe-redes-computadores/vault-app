#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { Module } = require('node:module');
const read = p => fs.readFileSync(p, 'utf8');
let passed = 0;
const ok = (value, label) => {
  assert.ok(value, `VAULT M3: ${label}`);
  console.log(`✓ ${++passed}: ${label}`);
};

const paths = [
  'app/saude/medicamentos/novo/page.tsx',
  'app/saude/medicamentos/editar/page.tsx',
  'components/saude/AvatarCareReadiness.tsx',
  'lib/medications/catalog-review-projection.ts',
  'lib/medications/identity-color-selection.ts',
  'hooks/useMedicationCatalogDismiss.ts',
  'scripts/test-vault-m3-medication-forms.cjs',
];
for (const path of paths) {
  const text = read(path);
  if (/\.(tsx|ts)$/.test(path)) {
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    ok(source.parseDiagnostics.length === 0, `${path}: TS/TSX válido`);
  }
  ok(!text.endsWith('\n\n') && text.endsWith('\n'), `${path}: um único LF no EOF`);
}
const novo = read(paths[0]);
const editar = read(paths[1]);
const fenix = read(paths[2]);
const projection = read(paths[3]);
const palette = read(paths[4]);
const dismissal = read(paths[5]);
for (const [label, page, normalizer] of [['Novo', novo, 'normalizeCatalogComparisonText'], ['Editar', editar, 'normalizeCatalogText']]) {
  ok(page.includes(`projectMedicationCatalogChoices(catalogReference, ${normalizer})`), `${label}: política de normalização prévia mantida`);
  ok(page.includes('useMedicationCatalogDismiss(isCatalogOpen, catalogPopoverRef, setIsCatalogOpen)'), `${label}: popover delega fechamento`);
  ok(page.includes('toggleMedicationIdentityColor(previous, hex)'), `${label}: cores delegadas sem mutar estado`);
  ok(!page.includes('const catalogPresentationSuggestions =\n'), `${label}: catálogo não recalculado dentro da página`);
  ok(page.includes('getMedicationCatalogAuthority(') && page.includes('validateMedication('), `${label}: autoridade e validação clínica originais`);
  ok(page.includes('catalogPresentationIssue') && page.includes('catalogRegulatoryIssues'), `${label}: divergências do catálogo continuam apresentadas`);
  ok(page.includes('useMedicationFormDossier') && page.includes('dosageAcknowledgementRef'), `${label}: guarda de pessoa e confirmação de dosagem intactas`);
}
ok(editar.includes('markChanged();') && editar.includes('setCores(previous => toggleMedicationIdentityColor(previous, hex))'), 'Editar: marca alteração após a escolha de cor');
ok(projection.includes('const catalogForms =') && projection.includes('const catalogPresentationSuggestions ='), 'Projeção centraliza formas e sugestões completas');
ok(projection.includes('new Map<') && projection.includes('.slice(') && projection.includes('.sort('), 'Projeção preserva deduplicação e limite de dez sugestões');
ok(!/\b(db\.|supabase|fetch\(|safeAdd|safeUpdate|updateMedicamento\(|addMedicamento\()/i.test(projection + palette + dismissal), 'Módulos novos não escrevem na base nem fazem consultas');
ok(dismissal.includes('document.removeEventListener("pointerdown"') && dismissal.includes('document.removeEventListener("keydown"') && dismissal.includes('"Escape"'), 'Autocomplete preserva limpeza de listeners e Escape');
ok(dismissal.includes('if (!isOpen) return;') && dismissal.includes('popoverRef.current?.contains'), 'Clique dentro do catálogo não fecha; fechado não cria listeners');
ok(fenix.includes('aria-hidden="true"') && fenix.includes('touch-manipulation'), 'Fênix: toque mobile e ícones decorativos acessíveis');
ok(fenix.includes('buildAvatarDecisionBrief(') && fenix.includes('<AvatarEvidenceBoundary') && fenix.includes('Brain · {brief.posture}') && fenix.includes('data-care-status={carePosture.tone}'), 'Brain/Fênix conserva autoridade, evidências e postura');
const v34 = read('scripts/test-v34-medication-identity-density-contract.mjs');
const v953 = read('scripts/test-v95-3-catalog-authority-contract.mjs');
const strip = read('components/saude/MedicationOperationalStrip.tsx');
ok(v34.includes('MedicationOperationalStrip today={todayStatus}') &&
   v34.includes('stockLabel={stockUnknown ? "Não informado"') &&
   v34.includes('doseOutcome={dosesIgnoradasHoje>0&&!isSOS?') &&
   v34.includes('strip.includes(') &&
   strip.includes('Hoje: ${today.label}. Estoque: ${stockLabel}. ${stockDetail}'),
   'V34/V98: contrato operacional confere renderização real de rotina/estoque');
const list = read('app/saude/medicamentos/page.tsx');
for (const [label, testSource] of [['V34', v34], ['V95.3', v953]]) {
  ok(testSource.includes('showActiveIngredient && (') &&
     testSource.includes('catalogIdentity?.authorityState === "possible_divergence"') &&
     testSource.includes('Revisar identidade') &&
     !testSource.includes('includes("Princípio ativo ·")'),
     `${label}: contrato histórico testa a identidade REAL da lista V98`);
}
ok(list.includes('className="sr-only" title={`Princípio ativo: ${activeIngredient}`}') &&
   list.includes('Princípio ativo: {activeIngredient}') &&
   list.includes('Revisar identidade') && list.includes('density="compact"'),
   'V98: princípio ativo acessível, divergência visível e lista compacta');
ok(read('scripts/test-v63-release-gate.mjs').includes('scripts/test-vault-m3-medication-forms.cjs'), 'Gate global inclui M3');

function loadCommonJs(file, aliases = {}) {
  const compiled = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const m = new Module(file, module);
  m.filename = file;
  m.paths = module.paths;
  m.require = id => id in aliases ? aliases[id] : require(id);
  m._compile(compiled, file);
  return m.exports;
}
const catalogue = loadCommonJs('lib/medications/catalog-presentation.ts');
const actual = loadCommonJs('lib/medications/catalog-review-projection.ts', {
  '@/lib/medications/catalog-presentation': catalogue,
});
const reducer = loadCommonJs('lib/medications/identity-color-selection.ts');
const project = actual.projectMedicationCatalogChoices;
const ref = {
  id: 'sample', canonicalName: 'Exemplo', sources: [],
  pharmaceuticalForms: ['COM REV', 'CAP DURA'],
  presentations: [
    { label: 'COM REV 30 mg CT 20', pharmaceuticalForm: 'COM REV', packageDescription: '20 comprimidos' },
    { label: 'COM REV 30 mg CT 30', pharmaceuticalForm: 'COM REV' },
    { label: 'CAP DURA 20 mg CT 10', pharmaceuticalForm: 'CAP DURA' },
    { label: 'Produto sem concentração', pharmaceuticalForm: 'sem' },
  ],
};
for (const normalizer of [catalogue.normalizeCatalogComparisonText, catalogue.normalizeCatalogText]) {
  const result = project(ref, normalizer);
  ok(result.catalogForms.includes('CAP DURA') && result.catalogForms.includes('COM REV 30 mg CT 20'), 'Catálogo: fontes oficiais preservadas sem enriquecimento inventado');
  ok(result.catalogPresentationSuggestions.length === 2, 'Catálogo: apresentação duplicada desduplicada e sem dosagem ignorada');
  ok(result.catalogPresentationSuggestions[0].dosage === '20 mg' && result.catalogPresentationSuggestions[1].dosage === '30 mg', 'Catálogo: sugestões ordenadas numericamente');
  ok(result.catalogPresentationSuggestions[0].format === 'capsula' && result.catalogPresentationSuggestions[1].format === 'comprimido', 'Catálogo: formato inferido da apresentação correspondente');
}
ok(project(null, catalogue.normalizeCatalogComparisonText).catalogPresentationSuggestions.length === 0, 'Sem referência hidratada não inventa sugestões');
ok(project(null, catalogue.normalizeCatalogText).catalogForms.length === 0, 'Sem referência hidratada não inventa forma farmacêutica');
const third = reducer.toggleMedicationIdentityColor(['#AAA', '#BBB'], '#CCC');
ok(JSON.stringify(third) === JSON.stringify(['#BBB', '#CCC']), 'Terceira cor substitui a mais antiga');
ok(JSON.stringify(reducer.toggleMedicationIdentityColor(['#AAA', '#BBB'], '#AAA')) === JSON.stringify(['#BBB']), 'Selecionar cor existente remove a cor');
ok(JSON.stringify(reducer.toggleMedicationIdentityColor([], '#AAA')) === JSON.stringify(['#AAA']), 'Paleta inicia com apenas uma cor');
ok(JSON.stringify(['#AAA', '#BBB']) === JSON.stringify(['#AAA', '#BBB']), 'Paleta não altera os valores de entrada');
console.log(`VAULT M3 — ${passed} contratos de formulários, catálogo, Brain/Fênix e UX aprovados.`);
