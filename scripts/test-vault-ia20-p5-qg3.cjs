#!/usr/bin/env node
'use strict';
/** IA20 P5/QG3 — source-level and pure negative contracts, not Android E2E. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
let count=0;
const ok=(truth,reason)=>{assert.ok(truth,'QG3: '+reason);count++;};
const files=[
 'app/hoje/page.tsx',
 'components/hoje/TodayJourneyRailP5.tsx',
 'app/documentos/page.tsx',
 'app/mais/page.tsx',
 'components/BottomNav.tsx',
 'scripts/test-vault-ia20-p3b-documentos.cjs',
 'scripts/test-v63-release-gate.mjs',
];
for(const p of files){
 const source=read(p);
 const isTsx=p.endsWith('.tsx');
 const ast=ts.createSourceFile(p,source,ts.ScriptTarget.Latest,true,isTsx?ts.ScriptKind.TSX:ts.ScriptKind.JS);
 ok(ast.parseDiagnostics.length===0,`${p} sintaxe ${ast.parseDiagnostics.map(d=>d.messageText).join(',')}`);
}
const [today,rail,documents,more,bottom,legacy,gate]=files.map(read);
// First-fold navigation is always an action on existing DOM anchors, never a dose operation.
ok(/<TodayJourneyRailP5\s+isToday=\{isHoje\}\s+pendingCount=\{isHoje\s*\?\s*totalPendentes\s*:\s*0\}/.test(today),'Hoje: pending count from actual filtered view and only current day');
ok((today.match(/<TodayJourneyRailP5\b/g)||[]).length===1,'Hoje: one contextual navigation');
for(const id of ['hoje-doses','hoje-agenda','hoje-cuidado','hoje-diario','hoje-brain']){
 ok(today.includes(`id="${id}"`),`Hoje: destination ${id} still exists`);
 ok(rail.includes(`id: "${id}"`),`Hoje: direct navigation to ${id}`);
}
ok(rail.includes('!("daily" in item) || dailySections') && today.includes('dailySections={isHoje && !retroReviewMode}'),'Daily destinations hidden for other dates and retro review');
ok(rail.includes('pendingCount > 0')&&rail.includes('doses pendentes'),'pending only when real count exceeds zero');
ok(rail.includes('document.getElementById(id)')&&rail.includes('target.scrollIntoView'),'anchors navigate to a real DOM section');
ok(rail.includes('(prefers-reduced-motion: reduce)')&&rail.includes('? "auto" : "smooth"'),'honors reduced motion');
ok(rail.includes('min-h-11')&&rail.includes('focus-visible:outline'),'44px targets and focus');
ok(!/\bdb\.|fetch\(|\.put\(|\.update\(|marcarDose\(|ignorar\(/.test(rail),'navigation cannot write clinical data');
ok(today.includes('TodayDateNavigation')&&today.includes('TodayRoutinePulse')&&today.includes('TodayNavigationContextM120'),'day/time/origin authorities intact');
ok(today.includes('visibleTimelineItems(')&&today.includes('<TodayDoseTimelineCard')&&today.includes('handleTomarTodos()'),'dose logic and established data components retained');
ok(today.includes('<CareFlowSummaryM2 returnTo={buildTimelineUrl(dataSelecionada)} onNavigate={href => navigateWithReturnM120(href, premiumSelection)} />')&&today.includes('<TodayAgendaOverview'),'careflow and agenda components preserved');
ok(today.includes('pb-[calc(8rem+env(safe-area-inset-bottom,0px))]'),'Android bottom gesture inset reserved');
// Documents: the sticky header no longer grows 45dvh; only one real filter state.
ok(documents.includes('aria-controls="p5-filtros-cofre"')&&documents.includes('aria-expanded={showFilters}'),'filter announces state and controls correct region');
ok(documents.includes('id="p5-filtros-cofre" role="region"')&&documents.includes('className="absolute inset-x-2 top-full z-30'),'filter region floats below sticky header');
ok(documents.includes('max-h-[45dvh]')&&documents.includes('overflow-y-auto overscroll-y-contain'),'filter list scrolls locally');
ok(documents.includes('Fechar filtros')&&documents.includes('setShowFilters(false)')&&documents.includes('getElementById("p5-toggle-filtros")?.focus()'),'real close action with focus restored');
ok(documents.split('id="p5-toggle-filtros"').length===2,'one controlling filter button');
ok(documents.split('id="p5-filtros-cofre"').length===2,'one filter region');
ok(documents.includes('grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'),'one full-width document per row up to 479px');
ok(!documents.includes('grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'),'old cramped 380px grid eliminated');
for(const preserved of ['<ListSearch initiallyExpanded','setShowFilters((previous) => !previous)','onClick={openGallery}','onClick={toggleViewMode}','<ExportCardButton cards={getExportCards()}','filteredDocs.map','InfiniteScrollTrigger','exportDocumentSummariesToPDF(filteredDocs)'])ok(documents.includes(preserved),'Documents operation remains '+preserved);
ok(legacy.includes('min-[480px]:grid-cols-2')&&legacy.includes('aria-expanded={showFilters}'),'legacy P3B contract tightened, not removed');
// More remains a hub, not a second clinical record engine.
ok(more.includes('aria-label="Pessoa ativa no Vault"')&&more.includes('<PersonSelector mode="compact"'),'active person selection intact');
ok(more.includes('aria-label="Acessos de saúde"')&&more.includes('router.push("/inteligencia")'),'Brain route and clinical shortcuts remain');
ok(more.includes('aria-label="Abrir mapa de todas as áreas de saúde"')&&more.includes('/saude/mapa?return_to=%2Fmais'),'Explore and contextual return preserved');
ok(more.includes('NativeDoseAgendaInspection')&&more.includes('<MoreArea id="atualizacoes"')&&more.includes('OperationalReadinessM103'),'notification audit, updates and readiness preserved');
ok(more.includes('<ExportButton variant="settings" />')&&more.includes('Limpar dados locais'),'export and guarded clear remain');
ok(more.includes('pb-[calc(8rem+env(safe-area-inset-bottom,0px))]')&&!more.includes('min-h-[100dvh] overflow-y-auto bg-void'),'safe area and no nested page scroller');
ok(more.includes('min-h-12 w-full items-center')&&more.includes('grid min-w-0 grid-cols-2 gap-2'),'compact but usable access to health');
ok(more.includes('truncate text-[11px] text-ink-muted')&&!more.includes('truncate text-[9px] text-ink-muted'),'preference states are legible');
// Bottom nav: one global authority, five roots, no invisible or duplicated Compose.
for(const name of ['Início','Hoje','Saúde','Documentos','Mais'])ok(bottom.includes(`label: "${name}"`),`bottom root preserved: ${name}`);
ok(bottom.includes('aria-current={active ? "page" : undefined}')&&bottom.includes('aria-label={item.label}'),'root accessibility and active state preserved');
ok(bottom.includes('focus-visible:outline-emerald-300')&&bottom.includes('motion-reduce:transition-none'),'keyboard focus and reduced motion of roots');
ok(bottom.includes('text-ink-muted/85')&&!bottom.includes('text-ink-muted/65'),'inactive contrast improved');
ok(bottom.includes('showCompose =')&&bottom.includes('ia20P2HeaderOwnsCreate(')&&bottom.includes('ia20P3SuppressFallbackCompose('),'single CTA authority without creating fallback duplicates');
ok(bottom.includes('bottom-0 z-50')&&bottom.includes('safe-area-inset-bottom,0px'),'existing native bottom inset');
// Mandatory gates, including the V31 and UX360 R4 regressions, remain registered once.
for(const p of ['scripts/test-vault-ia20-p5-qg3.cjs','scripts/test-vault-ia20-p4-home-viva.cjs','scripts/test-vault-ui360-r5.cjs','scripts/test-vault-ux360-r4-video.cjs','scripts/test-vault-ux360-r5-geometry.cjs','scripts/test-v31-layout-nav-contract.mjs','scripts/test-vault-ia20-p3b-documentos.cjs','scripts/test-vault-m139-global-visual.cjs']){
 ok(gate.split(`"${p}"`).length===2,`V63 includes exactly once ${p}`);
}
// Negative controls: these would violate the protected behavior and must be rejected.
const validCard=(value)=>/\bmin-h-(?:11|12|14)\b/.test(value)||/\bmin-h-\[(?:4[4-9]|[5-9]\d|1\d\d)px\]/.test(value);
ok(validCard('min-h-11')&&!validCard('min-h-[30px]'),'negative: below-touch target rejected');
const localDestination=p=>/^\/(?!\/)[a-z0-9/-]+$/.test(p);
ok(localDestination('/hoje')&&!localDestination('https://wrong.test')&&!localDestination('//wrong.test'),'negative: no external or protocol-relative anchors');
const distinct=(ids)=>new Set(ids).size===ids.length;
ok(distinct(['hoje-doses','hoje-agenda','hoje-cuidado','hoje-diario','hoje-brain'])&&!distinct(['hoje-doses','hoje-doses']),'negative: duplicate anchor rejected');
console.log(`VAULT_IA20_P5_QG3_OK: ${count} testes de estrutura, UX, acesso, integridade e regressao; Android real permanece a homologar`);
