#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const home=read('app/page.tsx');
const today=read('app/hoje/page.tsx');
const todayActions=read('components/hoje/TodayActionCenter.tsx');
const supply=read('app/saude/fornecimento/page.tsx');
const health=read('app/saude/minha-saude/page.tsx');
const disclosure=read('components/saude/ClinicalDisclosure.tsx');
const gate=read('scripts/test-v63-release-gate.mjs');
for(const [name,source] of [['Home',home],['Hoje',today],['Fornecimento',supply],['Minha Saúde',health]]){
  const tree=ts.createSourceFile(name+'.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(tree.parseDiagnostics.length,0,`${name}: TSX válido`);
}
assert(today.includes('VAULT_V321_DAILY_FOCUS'));
assert(today.includes('id="hoje-doses"'));
assert(today.includes('pendingDoses={totalPendentes}')&&todayActions.includes('pendingDoses > 0')&&today.includes('scrollIntoView({ behavior: "smooth", block: "start" })'),'CTA de doses usa fila existente');
assert(today.includes('VAULT_V321_MONTH_DEFERRED')&&today.includes('<ClinicalDisclosure')&&today.includes('id="hoje-mes"'),'mês sob demanda');
assert(today.includes('<DoseMonthOverview userId={user.id} personId={activePersonId} today={hoje} context={healthIntelligence.context}'),'visão mensal mantém owner e fonte canônica');
assert(today.includes('onClick={() => void handleTomarTodos()}')&&today.includes('dosesElegiveisLote.length > 1'),'ação em lote preservada');
assert(today.includes('setMostrarConcluidas')&&today.includes('QuickDoseModal'),'ações de dose e histórico preservadas');
assert(home.includes('VAULT_V321_HOME_EVIDENCE')&&home.includes('home-health-evidence'),'home organiza análise');
assert(home.includes('defaultOpen={longitudinalHighlights.some('),'alertas prioritários da Home iniciam abertos');
assert(home.includes('longitudinalHighlights.map(')&&home.includes('setInsightExplicado('),'insights continuam explicáveis');
assert(home.includes('suppressOperationalOverlap('),'deduplicação operacional preservada');
assert(supply.includes('VAULT_V321_SUPPLY_FOCUS'));
assert(supply.indexOf('id="processos"') < supply.indexOf('Ajuda e catálogo SUS'),'processos antes do catálogo');
assert(supply.includes('processView.activeProcesses.map(renderProcess)')&&supply.includes('setCreating(true);'),'criação de processo segue caminho original');
for(const term of ['relationalIndex.processes.filter(', 'medicationSupplyRoute(', 'SU'+'PPLY_ORIGIN_LABELS', 'SusCatalogBrowser compact','repo.create(personId, v, ids)']){
  assert(supply.includes(term),`fornecimento mantém ${term}`);
}
assert(health.includes('VAULT_V321_AVATAR_CARE')&&health.includes('<DeferredHealthSection id="avatar-care-workspace"'),'projeção Avatar sob demanda');
assert(health.includes('<HealthBody key={personId}')&&health.includes('Vault Intelligence'),'Avatar 3D e atenção visíveis');
assert(health.includes('VAULT_V321_HEALTH_DEEP_LINK')&&health.includes('window.addEventListener("hashchange", reveal)'),'links revelam painéis fechados');
assert(health.includes('<DeferredHealthSection id="analises"')&&health.includes('<DeferredHealthSection id="fontes"'),'seções anteriores preservadas');
assert(disclosure.includes('{open && (')&&disclosure.includes('if (hash === id) setOpen(true)'),'disclosure remonta conteúdo só na abertura');
for(const name of ['test-v318-medication-compact-operations.cjs','test-v319-medication-detail-progressive.cjs','test-v320-details-brain-focus.cjs','test-v321-global-health-focus.cjs']) assert(gate.includes(name),`gate preserva ${name}`);
console.log('VAULT V321: Hoje operacional, Home com prioridades, SUS relacional, Avatar lazy e deep-links — OK');
