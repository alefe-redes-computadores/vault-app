#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const detail=read('app/saude/medicamentos/detalhes/page.tsx');
const best=read('components/saude/MedicationBestPriceLink.tsx');
const r6=read('scripts/test-p14-r6-clinical-modules-brain-avatar.cjs');
const gate=read('scripts/test-v63-release-gate.mjs');
for(const [p,src] of [['detalhes',detail],['best price',best]]){
  const tree=ts.createSourceFile(p+'.tsx',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(tree.parseDiagnostics.length,0,p+' deve ter TSX sintaticamente válido');
}
assert(detail.includes('label="Menor preço médio por farmácia:"'), 'V319/V320: rótulo histórico presente em detalhes');
assert(detail.includes('<MedicationBestPriceLink mean={melhorFarmacia.media_preco}'), 'componente de preço recebe média canônica');
assert(best.includes('{label} <strong') && best.includes('label:string'), 'rótulo realmente exibido, não comentário de teste');
assert(best.includes('Menor média registrada')&&best.includes('Não é cotação atual'), 'V R6: explicação da média real sem inventar preço atual');
assert(detail.includes('Quantidade registrada hoje'), 'V319/V320: quantidade registrada, não estoque inferido');
assert(detail.includes('VAULT_V320_FINANCE_PROGRESSIVE'), 'V320: financeiro progressivo preservado');
assert(detail.includes('MedicationPurchaseRhythmCard events={renovacoes}'), 'V320: previsão financeira preservada');
assert(detail.includes('MedicationJourneySummary snapshot={journeySnapshot}'), 'V320: jornada preservada');
assert(detail.includes('HealthSupplyEntry medicamentoId={med.id!}'), 'V320: fornecimento canônico');
assert(detail.includes('id="historico-aquisicoes"'), 'histórico abre para comparar somente aquisições registradas');
assert(r6.includes('Menor média registrada'), 'contrato R6 original continua testando o componente');
assert(gate.includes('scripts/test-p14-r6-r3-historical-price.cjs'),'novo contrato incluído no gate');
console.log('P14 R6 R3 OK: V319 + V320, rótulo realmente renderizado, e R6 compatível');
