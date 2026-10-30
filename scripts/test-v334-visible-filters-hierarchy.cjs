#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const paths=[
  'components/list/ListFilters.tsx',
  'components/list/ListSearch.tsx',
  'components/saude/ClinicalSectionNav.tsx',
  'app/saude/medicamentos/page.tsx',
  'app/saude/documentos/page.tsx',
  'app/inteligencia/alertas/page.tsx',
];
for(const path of paths){
  const src=read(path),tree=ts.createSourceFile(path,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(tree.parseDiagnostics.length,0,`${path}: sintaxe TSX: ${tree.parseDiagnostics.map(x=>x.messageText).join('; ')}`);
}
const filter=read(paths[0]),search=read(paths[1]),nav=read(paths[2]),med=read(paths[3]),docs=read(paths[4]),brain=read(paths[5]);
assert(filter.includes('V334_VISIBLE_FILTER_TRIGGER'),'gatilho global visível');
assert(filter.includes('<span>Filtros</span>')&&filter.includes('aria-haspopup="dialog"'),'filtro textual, acessível e contextualizado');
assert(filter.includes('activeCount > 0')&&filter.includes('aria-hidden="true"'),'contagem de filtros ativos');
assert(filter.includes('if (onClear) clearRef.current?.focus')&&filter.includes('else applyRef.current?.focus'),'foco inicial válido com/sem limpar');
assert(filter.includes('triggerRef.current.focus')&&filter.includes('document.body.style.overflow = previous'),'sheet restaura foco e rolagem');
assert(filter.includes('onClear ? <button')&&filter.includes('col-span-2'),'não exibir ação limpar desabilitada');
assert(filter.includes('Aplicar filtros')&&filter.includes('setOpen(false)'),'sheet mantém ação aplicar');
assert(search.includes('V334_VISIBLE_SEARCH_TRIGGER')&&search.includes('>Buscar</span>'),'buscar descobrível em modo compacto');
assert(search.includes('role="search"')&&search.includes('onChange(event.target.value)'),'busca continua funcional');
assert(nav.includes('layout="grid"')&&nav.includes('layout?:"scroll"|"grid"'),'hierarquia visível por padrão com opção scroll');
assert(nav.includes('min-[480px]:grid-cols-4')&&nav.includes('break-words text-center'),'rótulos completos responsivos');
assert(nav.includes('hashchange')&&nav.includes('IntersectionObserver'),'deep-link e destaque de seção preservados');
assert(med.includes('V334_VISIBLE_MEDICATION_FILTERS')&&med.includes('Filtrar medicamentos por categoria'),'medicamentos mostra 7 filtros');
assert(med.includes('aria-pressed={medicationFilter === value}')&&med.includes('selectMedicationFilter(value)'),'filtro selecionado e handler canônico');
for(const item of ['Por período','Controlados','Encerrados','Atenção','SOS'])assert(med.includes(item),'categoria preservada '+item);
assert(docs.includes('aria-label="Filtrar documentos"')&&docs.includes('<span>Filtros</span>'),'documentos mostra filtro textual');
assert(docs.includes('setShowFilters(')&&docs.includes('hasActiveFilters'),'documentos mantém filtros originais');
assert(brain.includes('<span className="inline">Filtros</span>')&&brain.includes('Filtrar por momento da decisão'),'central mostra os filtros sem rolagem oculta');
assert(brain.includes('setFiltersOpen(true)')&&brain.includes('setLane('),'central continua acionável');
const gate=read('scripts/test-v63-release-gate.mjs');
assert(gate.includes('"scripts/test-v334-visible-filters-hierarchy.cjs"'),'gate global inclui V334');
for(const earlier of ['test-v333-fenix-navigation-gpu.cjs','test-v332-operational-ux.cjs','test-v330-fenix-health-preview.cjs','test-v329-care-supply-safety.cjs'])assert(gate.includes(earlier),'gate anterior preservado '+earlier);
console.log('VAULT V334 — FILTROS VISÍVEIS + BUSCA + HIERARQUIA GLOBAL CONTRACT OK');
