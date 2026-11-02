#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');let total=0;const ok=(v,m)=>{assert.ok(v,'M18: '+m);total++;};
const files=['components/saude/MedicationWorkspaceNavigation.tsx','app/saude/medicamentos/page.tsx','app/saude/medicamentos/detalhes/page.tsx','components/saude/HealthAvatar.tsx'];
for(const file of files){const source=read(file),parsed=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(parsed.parseDiagnostics.length===0,'syntax '+file);}
const [nav,list,detail,avatar]=files.map(read);
for(const id of ['medicamento-agora','medicamento-rotina','medicamento-receita','medicamento-fornecimento','medicamento-rede','medicamento-financeiro','historico-aquisicoes'])ok(nav.includes(id),'detail destination '+id);
for(const id of ['medicamentos-atencao','medicamentos-em-dia','medicamentos-planejados','medicamentos-sos','medicamentos-suspensos'])ok(nav.includes(id),'list destination '+id);
ok(detail.includes('<MedicationDetailNavigation')&&!detail.includes('<ClinicalSectionNav'),'detail delegates navigation hierarchy');
ok(list.includes('<MedicationListGroupNavigation')&&!list.includes('<ClinicalSectionNav'),'list delegates group hierarchy');
ok(nav.includes('historyCount')&&nav.includes('hasRoutine')&&nav.includes('hasFinancial'),'optional destinations follow rendered content');
ok(nav.includes('attention')&&nav.includes('planned')&&nav.includes('suspended'),'list counts remain explicit');
ok(avatar.includes('connection?:{saveData?:boolean;effectiveType?:string;')&&avatar.includes("nav.connection?.saveData===true")&&avatar.includes("/(^|-)2g$/")&&avatar.includes("addEventListener?.('change',sync)")&&avatar.includes("removeEventListener?.('change',sync)"),'Fenix respects data saver and slow network, including changes');
ok(!/\b(fetch\(|supabase|\bdb\.|localStorage|\.put\(|\.update\()/.test(nav),'navigation component has no data authority');
ok(read('scripts/test-v63-release-gate.mjs').includes('test-vault-m18-medication-navigation-fenix.cjs'),'M18 is cumulative');
console.log(`VAULT M18: ${total} structural checks passed`);
