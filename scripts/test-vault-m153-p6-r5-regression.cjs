#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const read = p => fs.readFileSync(p, 'utf8');
const meds = read('app/saude/medicamentos/page.tsx');
const card = read('components/list/ListCard.tsx');
const home = read('app/page.tsx');
const filters = read('components/hoje/TodayFilterPanel.tsx');
const modal = read('components/PendingDosesModal.tsx');
const gate = read('scripts/test-v63-release-gate.mjs');
let n=0;
function pass(yes, desc) { assert.ok(yes,'R5: '+desc); console.log('R5 '+ ++n +' OK: '+desc); }
for (const path of ['app/page.tsx','app/saude/medicamentos/page.tsx','components/PendingDosesModal.tsx','components/hoje/TodayFilterPanel.tsx','components/list/ListCard.tsx']) {
 const ast=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 pass(ast.parseDiagnostics.length===0,'TSX valido '+path);
}
const medAst=ts.createSourceFile('meds.tsx',meds,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const cards=[];
function visit(node) { if (ts.isJsxOpeningElement(node) && node.tagName.getText(medAst)==='ListCard') cards.push(node); ts.forEachChild(node,visit); }
visit(medAst);
pass(cards.length===1,'ListCard principal unico; sem substituir a autoridade original');
const attrs=cards[0].attributes.properties;
const attr=name=>attrs.find(x=>ts.isJsxAttribute(x) && x.name.text===name);
pass(Boolean(attr('color')&&attr('rail')&&attr('railSize')),'borda de autoridade e rail no mesmo cartao');
pass(attr('railSize').initializer?.text==='label','rail regulatorio e textual');
pass(meds.includes('[writing-mode:vertical-rl]')&&meds.includes('Abrir classificação:')&&(meds.includes('regulatoryListLabelMED04(regulatoryProfile, reconciliationP6, catalogIdentity?.regulatoryNeedsReview === true)') && meds.includes('{prescriptionIdentityP6}') && meds.includes('aria-label={`Ver classificação da receita: ${prescriptionIdentityP6}`}') && !meds.includes('prescriptionIdentityP6 ?? medicationRegulatoryShortLabel')),'etiqueta vertical legivel e acessivel');
pass((meds.match(/setSelectedRegulatoryScope\(\{/g)||[]).length===1,'um unico clique de explicacao regulatoria');
pass(meds.includes('selectedRegulatory.sourceLabel')&&meds.includes('selectedRegulatory.verified')&&meds.includes('regulatorySurface.rail'),'origem, verificacao e cor da regra preservadas');
pass(card.includes('railSize?: "standard" | "slim" | "label"')&&card.includes('railSize === "label" ? (medicationFlow ? "w-7" : "w-8")')&&card.includes('medicationFlow ? (isTight ? "py-1.5 pr-2 pl-9" : "p-3 pl-9")')&&card.includes('(isTight ? "p-2.5 pl-10" : "p-3 pl-10")')&&card.includes('const isTight = isCompact && compactTight;')&&card.includes('medicationFlow = false')&&meds.includes('medicationFlow'),'tarja R5 mais fina opt-in, sem alterar cards de outras áreas');
pass(meds.includes('data-vault-compact-medication-meta')&&meds.includes('activeIngredient')&&meds.includes('latestManufacturer'),'compacto conserva principio ativo e fabricante');
pass(filters.includes('if (closeOnSelect) closePanel()')&&filters.includes('options(statusOptions, status, onStatus, true)')&&filters.includes('options(APPOINTMENTS, appointment, onAppointment, true)'),'filtros simples aplicam e recolhem com clique');
pass(modal.includes('data-vault-dose-primary-action="scheduled"')&&modal.includes('data-vault-dose-secondary-action="now"')&&modal.includes('safe-area-inset-bottom'),'modal conserva dois caminhos, acesso e safe area');
pass(home.includes('quantityFollowUpChecked')&&home.includes('feedback === "already_knew"')&&home.includes('sendExperienceFeedback(insight, "already_knew")'),'Brain preserva already_knew e recolhimento do aviso');
pass(home.includes('data-vault-withdrawal-relational-card')&&home.includes('data-vault-withdrawal-treatment')&&home.includes('retiradasAgendaM147.slice(0, 3)'),'retirada rica e vinculo explicito preservados');
const oldTestFiles=[
 'scripts/test-vault-m10-premium-ux-face.cjs',
 'scripts/test-v76-1-regulatory-edge-contract.mjs',
 'scripts/test-v76-2-regulatory-rail-contract.mjs',
 'scripts/test-v59-regulatory-identity-contract.mjs',
 'scripts/test-v35-1-regulatory-border-contract.mjs',
 'scripts/test-v76-experience-closure-contract.mjs',
 'scripts/test-p9-supercirurgia.cjs',
 'scripts/test-vault-m109-medication-list-density.cjs',
 'scripts/test-v328-medication-card-care-navigation.cjs',
 'scripts/test-vault-m148-p1.cjs'
];
for (const f of oldTestFiles) {
  const src=read(f);
  pass(!src.includes("includes('railSize=\"slim\"')") && !src.includes("includes('<Info size={12}')") && !src.includes("includes('<StickyNote size={13}')") && !src.includes("includes('onClick={() => select(option.value)}')"), 'contrato historico sem expectativas antigas: '+f);
}
pass(gate.includes('test-vault-m153-p6-r5-regression.cjs'),'R5 integra o gate global');
console.log('VAULT M153 P6 R5 REGRESSOES: '+n+' verificacoes OK');
