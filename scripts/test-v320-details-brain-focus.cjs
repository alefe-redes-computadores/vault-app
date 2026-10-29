#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const detail=read('app/saude/medicamentos/detalhes/page.tsx');
const brain=read('app/inteligencia/page.tsx');
for(const [name,code] of [['detalhes.tsx',detail],['brain.tsx',brain]]){
  const src=ts.createSourceFile(name,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(src.parseDiagnostics.length,0,`${name}: TSX sem erros sintáticos`);
}
assert(detail.includes('VAULT_V320_QUICK_DOSE_TOP'));
assert(detail.includes('onClick={\n                    abrirQuickDose'),'Dose canônica reutiliza handler original');
assert.equal((detail.match(/abrirQuickDose\s*\n\s*\}/g)||[]).length,1,'Um único botão de dose canônico');
assert(detail.includes('med.status !== "descontinuado" || isSOS'),'Regra de medicamento suspenso preservada');
assert(detail.includes('medicamento-rotina')&&detail.includes('medicamento-financeiro')&&detail.includes('medicamento-receita'),'Âncoras preservadas');
assert(detail.includes('MedicationJourneySummary snapshot={journeySnapshot}'),'Jornada preservada');
assert(detail.includes('HealthSupplyEntry medicamentoId={med.id!}'),'Fornecimento preservado');
assert(detail.includes('comportamento.tipo === "alerta_adesao"'),'Alerta de adesão segue aberto');
assert(detail.includes('<details open={comportamento.tipo === "alerta_adesao"}'),'Observação secundária é progressiva');
assert(detail.includes('VAULT_V320_FINANCE_PROGRESSIVE'),'Ritmo avançado acessível por expansão');
assert(detail.includes('MedicationPurchaseRhythmCard events={renovacoes}'),'Projeção financeira não removida');
assert(detail.includes('Menor preço médio por farmácia:')&&detail.includes('Quantidade registrada hoje'),'V319 mantida');
assert(brain.includes('VAULT_V320_BRAIN_EVIDENCE'));
assert(brain.indexOf('<BrainCarePlan plan=')<brain.indexOf('VAULT_V320_BRAIN_EVIDENCE'),'Decisão clínica antes das análises');
for(const s of ['CareAccessBrief portfolio=','DoseEvidenceBrief context=','UpcomingDoseAgenda context=','PrescriptionPlanningBrief context=','CareFinancialOutlook command='])
  assert(brain.includes(s),`Brain mantém ${s}`);
assert(brain.includes('preserveReturn(href)'),'Retorno contextual permanece');
console.log('V320 OK: ação de dose priorizada, observações conservadoras, financeiro progressivo e Brain sem duplicar decisões.');
