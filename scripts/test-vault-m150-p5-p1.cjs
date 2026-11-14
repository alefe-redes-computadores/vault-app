#!/usr/bin/env node
'use strict';
/** Read-only M150 P5 P1 contracts, no production database. */
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const paths=[
 'components/PageTransition.tsx',
 'components/health-intelligence/HealthInsightExplanationSheet.tsx',
 'components/saude/PharmaLensWorkspaceV7.tsx',
 'components/saude/PharmaLensObservationPanelV7.tsx',
 'components/saude/BrainV7UniversalConsole.tsx',
 'components/saude/VisualStudioWorkspaceV8.tsx',
];
let passed=0;
const ok=(name,condition)=>{assert.ok(condition,`P5 P1: ${name}`);passed++;console.log('✓',name)};
for(const path of paths){
 const tree=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 ok('TSX sintaxe '+path,tree.parseDiagnostics.length===0);
}
const [transition,sheet,pl,observations,brain,visual]=paths.map(read);
ok('Transição não começa com página vazia',transition.includes('initial={false}')&&!transition.includes('opacity: 0'));
ok('Acessibilidade de movimento continua ligada',transition.includes('useReducedMotion()')&&transition.includes('reduceMotion'));
ok('Backdrop opaco no primeiro quadro',sheet.includes('bg-black/95 backdrop-blur-[2px]')&&sheet.includes('initial={false}'));
ok('Modal e explicação íntegros',sheet.includes('aria-modal="true"')&&sheet.includes('onClose')&&sheet.includes('role="dialog"')&&sheet.includes('EvidenceReceiptM119'));
ok('PharmaLens sem números de engine no cabeçalho',pl.includes('VAULT · Saúde · Fênix')&&!pl.includes('VAULT · PharmaLens V7'));
ok('Links do Brain e Visual Studio permanecem',pl.includes('VAULT Brain · estabilidade, histórico e dossiê')&&pl.includes('/saude/brain-v7')&&pl.includes('Visual Studio · formas e quatro eixos')&&pl.includes('/saude/visual-studio'));
ok('PharmaLens mantém isolamento por pessoa',pl.includes('db.medicamentos.where')&&pl.includes('user?.id')&&pl.includes('activePersonId'));
ok('PharmaLens não infere eficácia/estoque',pl.includes('Não determina qual fabricante é mais eficaz')&&pl.includes('nem recomenda substituição'));
ok('PharmaLens sem marcadores genéricos',!/(?:dia|registro|melhora|piora)\(s\)/.test(observations)&&!observations.includes('percebida(s)'));
ok('PharmaLens eventos permanecem',observations.includes('obs.takenScheduled')&&observations.includes('obs.takenRescue')&&observations.includes('obs.explicitlyIgnored')&&observations.includes('observations.entries'));
ok('Brain título de produto sem versão',brain.includes('VAULT · Brain · Fênix')&&brain.includes('VAULT Brain observacional')&&!brain.includes('Brain V7 observacional'));
ok('Brain mantém ressalva clínica',brain.includes('Não determina dose segura')&&brain.includes('não reduz alertas de interações'));
ok('Brain exibe dia singular/plural',brain.includes('a.observedDays===1?"":"s"'));
ok('Visual Studio marca única',visual.includes('VAULT · VISUAL STUDIO')&&visual.includes('Dossiê completo do Brain')&&visual.includes('Voltar ao VAULT Brain'));
ok('Fênix e dados reais inalterados',visual.includes('<FenixSceneV8 snapshot={studio}/>')&&visual.includes('<WearableEvidenceV8P2 snapshot={studio}/>')&&visual.includes('<AxisCheckinV8 snapshot={studio}'));
const legacy=read('scripts/test-vault-brain-v7-universal.cjs'),gate=read('scripts/test-v63-release-gate.mjs');
ok('Legacy Brain verifica destino e nome atual',legacy.includes("pl.includes('/saude/brain-v7')&&pl.includes('VAULT Brain · estabilidade, histórico e dossiê')"));
ok('Gate novo uma vez',gate.split('"scripts/test-vault-m150-p5-p1.cjs"').length===2&&gate.includes('"scripts/test-vault-m150-p4-r3.cjs"'));
console.log(`M150 P5 P1: ${passed} contratos semânticos e sintáticos OK`);
