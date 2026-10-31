#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const read = file => fs.readFileSync(file,'utf8');
const home=read('app/page.tsx'),today=read('app/hoje/page.tsx');
const metrics=read('components/home/HomeQuickMetrics.tsx'),avatar=read('components/saude/HealthAvatar3D.tsx');
for(const p of ['app/page.tsx','app/hoje/page.tsx','components/home/HomeQuickMetrics.tsx','components/saude/HealthAvatar3D.tsx']){
 const tree=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(tree.parseDiagnostics.length,0,`${p}: TSX syntax ${tree.parseDiagnostics.map(x=>x.messageText).join('; ')}`);
}
assert(home.includes('<HomeQuickMetrics')&&home.includes('pendingDoses={dosesPendentesAtrasadas.length}')&&home.includes('appointments={totalCompromissosHoje}'),'Home reuses authoritative counts');
assert(home.includes('extrasTaken={Math.max(0, dosesTomadasHoje - dosesTomadasDaRotinaHoje)}'),'SOS/extra count remains independent of routine');
assert(home.includes('className="min-[380px]:grid-cols-4"') && metrics.includes('grid grid-cols-2') && metrics.includes('${className}'), 'V196: mobile-first 2 columns and 4 from 380px, class lives on Home');
assert(metrics.includes('min-[380px]:border-b-0') && metrics.includes('min-[380px]:border-r'), 'responsive borders survive extraction');
assert(metrics.includes('memo(function HomeQuickMetrics')&&metrics.includes('aria-label="Atalhos de saúde da Home"'),'extracts accessible memoized quick metrics');
for(const label of ['Agenda','Pendentes','Remédios','SOS / extra'])assert(metrics.includes(label),`quick metric ${label} preserved`);
assert(metrics.includes('onOpenPending')&&metrics.includes('onNavigate("/saude/medicamentos")'),'quick actions still point to right screens');
assert(home.includes('href: "/?open=pending-doses"')&&home.includes('window.dispatchEvent(new Event("vault:open-pending-doses"))'),'contextual pending action opens modal on already-mounted Home');
assert(home.includes('router.push(resumoContextual.href)')&&home.includes('href: primaryCareCommand.href')&&home.includes('href: primaryMedicationCareOpportunity.actionHref'),'Brain and acquisition keep canonical destinations');
assert(today.includes('const metricItems = useMemo(() => doses.filter('),'routine metrics memoized');
assert(today.includes('const dosesElegiveisLote = useMemo(() =>')&&today.includes('new Map<string, DoseItemExt>()'),'batch projection memoized and deduplicated');
assert(today.includes('useMemo(() => partitionDoseBatchByStock('),'stock partition projection memoized');
for(const x of ['!dose.tomada','!dose.ignorada','!dose.isDataConflict','dose.horario <= horaAtual','dosesSemEstoqueNoLote','dosesComEstoqueNoLote','snapshotLote = [...dosesComEstoqueNoLote]'])assert(today.includes(x),'retains clinical batch safety: '+x);
assert(avatar.includes('P8: pele e olhos menos plastificados')&&avatar.includes('P9: transição de luz no rosto')&&avatar.includes('P10: pelos e lábios'),'P8/P9/P10 Avatar layers retained');
assert(avatar.includes('opacity: .42')&&avatar.includes('opacity:.075')&&avatar.includes('avatarAdaptiveRatio(')&&avatar.includes('renderer.forceContextLoss()'),'V273/P8 ocular reflection & GPU budget preserved');
assert(!avatar.includes('requestAnimationFrame(function'),'no perpetual GPU loop introduced');
console.log('✓ VAULT P10: Home quick metrics + Brain navigation + memoized Hoje clinical batches + Avatar GPU safety OK');
