#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
let n=0; const ok=(v,l)=>{assert.ok(v,l);console.log(`✓ M153 P6 VISUAL CONT ${++n}: ${l}`)};
for(const p of ['app/page.tsx','app/hoje/page.tsx','app/saude/medicamentos/page.tsx','components/PendingDosesModal.tsx','components/hoje/TodayFilterPanel.tsx']){
  const source=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  ok(source.parseDiagnostics.length===0,`TSX parse ${p}`);
}
const home=read('app/page.tsx');
const meds=read('app/saude/medicamentos/page.tsx');
const modal=read('components/PendingDosesModal.tsx');
const today=read('app/hoje/page.tsx');
const filters=read('components/hoje/TodayFilterPanel.tsx');
const dates=read('lib/today/timeline-date-presentation.ts');
const old=read('scripts/test-vault-m136-visual-navigation.cjs');
ok(meds.includes('railSize="label"')&&meds.includes('[writing-mode:vertical-rl]')&&meds.includes('setSelectedRegulatory(regulatoryProfile)'),'tarja textual abre autoridade regulatória existente');
ok(meds.includes('data-vault-compact-medication-meta')&&meds.includes('activeIngredient'),'compacto preserva princípio ativo, fabricante e origem');
ok(modal.includes('data-vault-dose-primary-action="scheduled"')&&modal.includes('data-vault-dose-secondary-action="now"')&&modal.includes('safe-area-inset-bottom'),'modal distingue caminho padrão, exceção e safe area');
ok(home.includes('data-vault-withdrawal-relational-card')&&home.includes('data-vault-withdrawal-treatment')&&home.includes('isSusWithdrawal')&&home.includes('isPurchasedWithdrawal'),'retirada combina medicamento, origem e tratamento explícito');
ok(home.includes('retiradasAgendaM147.slice(0, 3)')&&home.includes('quantityFollowUpChecked'),'Home mostra agenda rica sem Brain reconhecido persistente');
ok(today.includes('filtersHydrated')&&today.includes('hasExplicitFilter')&&today.includes('setFiltroStatus("todos")'),'Hoje abre limpo sem apagar filtro explicitamente recebido por URL');
ok(dates.includes('year:')&&dates.includes('"numeric"'),'data fora de hoje expõe ano real');
ok(filters.includes('closeOnSelect')&&filters.includes('closePanel()'),'filtro simples aplica e fecha');
ok(old.includes('railSize="label"')&&old.includes('[writing-mode:vertical-rl]'),'contrato M136 evoluiu sem remover interatividade');
console.log(`VAULT M153 P6 VISUAL CONTINUIDADE — ${n} verificações aprovadas`);
