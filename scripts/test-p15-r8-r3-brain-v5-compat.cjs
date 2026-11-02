#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');let checks=0;
const ok=(v,label)=>{assert(v,'P15 R8 R3: '+label);console.log(`✓ ${++checks}: ${label}`)};
const h=read('app/page.tsx');
const r=read('components/home/HomeAttentionRail.tsx');
const v94=read('scripts/test-v94-2-home-final-experience-contract.mjs');
const v54=read('scripts/test-brain-v5-4-home-experience-contract.mjs');
const v54r2=read('scripts/test-brain-v5-4-r2-home-carousel-contract.mjs');
const complete=read('scripts/test-brain-v5-completion-contract.mjs');
const v332=read('scripts/test-v332-operational-ux.cjs');
const gate=read('scripts/test-v63-release-gate.mjs');
for(const [label,source] of [['V94.2',v94],['V5.4 Home',v54],['V5.4 R2',v54r2],['V5 Completion',complete]]){
  ok(!source.includes('h.includes("brainV5Pulse.counters.attention")')&&!source.includes('home.includes("brainV5Pulse.counters.attention")'),label+' não exige contador obsoleto');
}
ok(h.includes('brainV5Pulse.journeys.filter(item => item.requires_attention)')&&h.includes('brainV5Pulse.counters.new'),'Home mostra jornadas de atenção e novidades reais');
ok(h.includes('healthIntelligence.maturity.totalRecords')&&h.includes('sourcesWithData')&&h.includes('{" cobertura"}'),'Maturidade e cobertura conservadas');
ok(h.includes('longitudinalHighlights.map')&&h.includes('longitudinalHighlights.length > 1'),'Múltiplos sinais ainda acessíveis');
ok(h.includes('Sinais do Brain organizados por prioridade')&&h.includes('grid grid-cols-1 gap-2 min-[620px]:grid-cols-2'),'Grade progressiva real do Brain');
ok(h.includes('setInsightExplicado(')&&h.includes('router.push("/inteligencia/alertas")'),'Evidência e Central continuam navegáveis');
ok(!h.includes('Deslize para ver outros sinais')&&v332.includes('Deslize para ver outros sinais')&&v332.includes('!home.includes('),'Não reintroduz falso anúncio de carrossel');
ok(v54.includes('Todos os sinais ficam acessíveis acima')&&v54r2.includes('Todos os sinais ficam acessíveis acima'),'V5.4 e V5.4 R2 validam grid atual');
ok(!v54r2.includes('h.includes("w-[86%]")')&&!v54r2.includes('h.includes("snap-x")'),'V5.4 R2 não depende de layout removido');
ok(r.includes('alerts.slice(0, 1)')&&!r.includes('snap-x snap-mandatory'),'Alertas operacionais mantêm lista vertical e expansão integral');
ok(gate.includes('test-p15-r8-r3-brain-v5-compat.cjs')&&gate.includes('test-p15-r8-r2-v94-legacy-safety.cjs'),'Gate registra prevenções R3 e R2');
console.log(`VAULT P15 R8 R3: ${checks} checagens de compatibilidade Brain V5 aprovadas`);
