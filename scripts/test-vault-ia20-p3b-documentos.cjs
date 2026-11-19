#!/usr/bin/env node
'use strict';
/* IA 2.0 P3-B: contratos de codigo, nao homologacao visual no aparelho. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
let checks=0;
const read = p => fs.readFileSync(p,'utf8');
const ok = (condition,label) => {assert.ok(condition,'P3B documentos: '+label);checks++;};
const names = ['app/documentos/page.tsx','app/saude/documentos/page.tsx','components/ExportCardButton.tsx','scripts/test-v63-release-gate.mjs'];
const [personal,clinical,exportButton,gate]=names.map(read);
for(const p of names.slice(0,3)){
  const parsed=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  ok(parsed.parseDiagnostics.length===0,`JSX/TSX sem erro sintatico em ${p}: ${parsed.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join(', ')}`);
}
function portion(source,a,b){const start=source.indexOf(a),end=source.indexOf(b,start);ok(start>=0&&end>start,`regiao isolada ${a}`);return source.slice(start,end);}
const personalHeader=portion(personal,'<div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">','INDICADOR DE FILTROS');
const clinicalHeader=portion(clinical,'IA20_P3B_CLINICAL_TOOLS','{/* ====================================================\n            CONTENT');
ok(personal.includes('header-safe-top')&&personal.includes('pb-[calc(7.5rem+env(safe-area-inset-bottom))]'),'Cofre Pessoal respeita safe areas');
ok(clinical.includes('header-safe-top')&&clinical.includes('pb-[calc(7.5rem+env(safe-area-inset-bottom))]'),'Acervo Clinico respeita safe areas');
ok(personalHeader.includes('flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center'),'Cofre divide busca e ferramentas em telas compactas');
ok(personalHeader.includes('<ListSearch initiallyExpanded className="w-full min-w-0 sm:flex-1"'),'busca pessoal visivel e utilizavel');
ok(personalHeader.includes('role="group" aria-label="Ferramentas do Cofre Pessoal"'),'acoes pessoais com rotulo acessivel');
for(const action of ['setShowFilters((previous) => !previous)','onClick={openGallery}','onClick={toggleViewMode}','<ExportCardButton cards={getExportCards()}'])ok(personalHeader.includes(action),`acao pessoal preservada ${action}`);
ok((personalHeader.match(/h-11 w-11/g)||[]).length>=4,'quatro botoes da barra pessoal com piso 44');
ok(personalHeader.includes('touchTarget="comfortable"'),'PDF pessoal pede area de toque 44');
ok(personal.includes('max-h-[45dvh]')&&personal.includes('overscroll-y-contain')&&personal.includes('role="region" aria-label="Filtros do Cofre Pessoal"')&&personal.includes('aria-expanded={showFilters}')&&personal.includes('aria-controls="p5-filtros-cofre"'),'filtros do cofre rolam e anunciam expansao');
ok(personal.includes('grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'),'grade mostra um documento por linha ate 479px, sem comprimir leitura');
ok(personal.includes('viewMode ===')&&personal.includes('filteredDocs.map')&&personal.includes('InfiniteScrollTrigger'),'lista/grade e paginacao intactas');
ok(personal.includes('exportDocumentSummariesToPDF(filteredDocs)')&&personal.includes('router.push(\n          "/documentos/novo"'),'exportacao e cadastro pessoal originais');
ok(clinicalHeader.includes('flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between'),'Acervo separa cabecalho dos botoes a 320px');
ok(clinicalHeader.includes('role="group" aria-label="Ferramentas do Acervo Clínico"'),'ferramentas clinicas agrupadas');
ok(clinicalHeader.includes('label="Exportar"')&&clinicalHeader.includes('className="min-h-11"'),'Exportar clinico com nome e minimo 44px');
ok(clinicalHeader.includes('onBeforeExport={prepareExportSurface}')&&clinicalHeader.includes('onAfterExport={releaseExportSurface}'),'ciclo de exportacao preservado');
ok(clinicalHeader.includes('overflow-x-auto overscroll-x-contain')&&clinicalHeader.includes('aria-label="Período do acervo"'),'selecao de periodo rola horizontalmente');
for(const action of ["setSelectedMonth('all')","setSelectedMonth(format(new Date(),'yyyy-MM'))",'setShowFilters(true)','<ListSearch initiallyExpanded'])ok(clinicalHeader.includes(action),`controle clinico preservado ${action}`);
const monthControls=clinicalHeader.slice(clinicalHeader.indexOf('aria-label="Período do acervo"'));
ok((monthControls.match(/min-h-11 shrink-0/g)||[]).length===3,'periodos clinicos inteiros e tocaveis');
ok(clinical.includes('uniqueDocumentViewModels')&&clinical.includes('domainGroups.map')&&clinical.includes('ClinicalSectionNav'),'arvore clinica/cadastro persistem');
ok(clinical.includes('getExportCardRef')&&clinical.includes('ExportDocumentCard')&&clinical.includes('<BottomSheet'),'exportacao e filtros de meses continuam reais');
ok(clinical.includes('activePersonId')&&clinical.includes('Selecione uma pessoa'),'isolamento da pessoa ativa preservado');
ok(exportButton.includes('touchTarget?: "comfortable"')&&exportButton.includes('touchTarget === "comfortable"'),'prop opt-in: sem alterar botao antigo');
ok(exportButton.includes('!h-11 !w-11 !min-h-11 !min-w-11')&&exportButton.includes('!h-10 !w-10 !min-h-10 !min-w-10'),'alvo confortavel e compatibilidade legada');
ok(exportButton.includes('onBeforeExport?.()')&&exportButton.includes('onAfterExport?.()'),'hooks PDF intactos');
for(const required of ['scripts/test-vault-ia20-p1.cjs','scripts/test-vault-ia20-p2.cjs','scripts/test-vault-ia20-p3.cjs','scripts/test-vault-ia20-p3b-documentos.cjs','scripts/test-vault-ci360-d4-p2-decisoes.cjs']){
 ok(gate.split('"'+required+'"').length===2,`registro V63 unico: ${required}`);
}
ok(!personalHeader.includes('fetch(')&&!clinicalHeader.includes('fetch('),'toolbar nao introduz requisicoes extras');
console.log(`VAULT_IA20_P3B_DOCUMENTOS_OK: ${checks} contratos direcionados; sem equivaler fonte JSX a aceite visual Android`);
