#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const read=path=>fs.readFileSync(path,'utf8');let checked=0;
function ok(value,label){assert(value,`P15 R5: ${label}`);console.log(`✓ ${++checked}: ${label}`)}
const files={
 detail:'app/saude/medicamentos/detalhes/page.tsx',
 stock:'components/saude/MedicationStockOverview.tsx',
 suspension:'components/saude/MedicationSuspensionSummary.tsx',
 home:'components/home/HomeDailyHero.tsx',
 today:'components/hoje/TodayRoutinePulse.tsx',
 avatar:'components/saude/HealthAvatar3D.tsx',
 brain:'lib/health-intelligence/avatar-decision-brief.ts',
};
const source=Object.fromEntries(Object.entries(files).map(([k,p])=>[k,read(p)]));
for(const [key,p] of Object.entries(files)){
  const ast=ts.createSourceFile(p,source[key],ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  ok(ast.parseDiagnostics.length===0,`TS(X) válido: ${p}`);
}
const {detail,stock,suspension,home,today,avatar,brain}=source;
ok(detail.includes('<MedicationStockOverview')&&detail.includes('estoqueStatus.label')&&detail.includes('statusIcon={<EstoqueStatusIcon size={10}/>}'),'Estoque recebe status calculado e ícone da página');
ok(detail.includes('quantity={quantidadeDisponivel}')&&detail.includes('registeredBalance={saldoRegistrado}')&&detail.includes('negative={estoqueNegativo}'),'Saldo físico e reconciliação vêm da autoridade original');
ok(detail.includes('dropsConversionMissing={isGota && (unidadeEstoque.includes("ml") || unidadeEstoque.includes("frasco")) && gotasPorMl === null}'),'Conversão de gotas só com configuração real');
ok(detail.includes('hasStockProjection={Boolean(estoqueInfo)}')&&detail.includes('doseEstimatePossible={Boolean(estoqueInfo?.estimativaDosesDisponivel)}'),'Projeção desconhecida não vira quantidade estimada');
ok(detail.includes('formatQuantity={formatQuantidade}')&&detail.includes('referenceDay={formatDate(med.estoque_data_referencia)}'),'Formatadores de unidade e data permanecem canônicos');
ok(detail.includes('<MedicationSuspensionSummary')&&detail.includes('med.status ===')&&detail.includes('med.motivo_descontinuacao'),'Suspensão continua dependente do status real');
ok(detail.includes('medicoDescontinuacao?.nome || med.medico_descontinuacao_nome')&&detail.includes('medicamentoSubstituto.nome'),'Médico e substituto vêm do dossiê da pessoa');
ok(detail.includes('encodeURIComponent(medicamentoSubstituto.id)')&&suspension.includes('disabled={!replacement.id}'),'Destino do substituto só abre com ID real válido');
ok(!/\b(db\.|supabase|safeAdd|safeUpdate|marcarDose\()/.test(stock+suspension),'Novos componentes não gravam nem consultam dados clínicos');
for(const str of ['Gotas por ml não está configurado','Revise o estoque físico','Quantidade por dose:', 'Saldo informado em:'])ok(stock.includes(str),'Texto de estoque preservado: '+str);
for(const str of ['Medicamento suspenso','Motivo registrado','Médico relacionado','Substituído por'])ok(suspension.includes(str),'Histórico de suspensão preservado: '+str);
ok((detail.match(/vault-deferred/g)||[]).length>=5&&detail.includes('ESTOQUE')&&detail.includes('temEstoque'),'V197: grupos diferidos e estoque continuam na página');
ok(detail.includes('onClick={\n                    abrirQuickDose')&&detail.includes('QuickDoseModal'),'Dose canônica continua intocada');
ok(detail.includes('MedicationPaidCostCards')&&detail.includes('MedicationPrescriptionCard')&&detail.includes('MedicationAcquisitionHistoryCard')&&detail.includes('MedicationCareNetworkDetails'),'Modularizações anteriores preservadas');
ok(detail.includes('Menor preço médio por farmácia:')&&detail.includes('getElementById("historico-aquisicoes")')&&detail.includes('`/saude/medicamentos/historico?id=${id}`'),'V70/V319/V320 sem regressão');
ok(home.includes('scheduled > 0 && Number.isFinite(progress)')&&home.includes('Sem horários programados'),'Home só mostra progresso se existem doses previstas');
ok(today.includes('aria-valuetext={`${completed} concluídas, ${ignored} ignoradas, ${unconfirmed} sem confirmação`}'),'Hoje explicita as três categorias para leitores de tela');
ok(avatar.includes("event.key==='Home'||event.key==='0'")&&avatar.includes('Home ou zero restauram a frente'),'Atalho do Avatar restaura direção e zoom sem reconstrução');
ok(avatar.includes('renderer.forceContextLoss()')&&!avatar.includes('requestAnimationFrame(animate)')&&avatar.includes('expressionEyeScaleY'),'Orçamento WebGL e olhos preservados');
const compiled=ts.transpileModule(brain,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const m={exports:{}};new Function('exports','module',compiled)(m.exports,m);const summarize=m.exports.buildAvatarDecisionBrief;
const huge=summarize({evidenceKind:'projected',reason:'Evidência extensa '.repeat(40),overdueWithdrawals:2,missingDocuments:3});
ok(huge.explanation.length<=370&&huge.explanation.includes('…')&&huge.explanation.includes('Projeção não confirma realização.')&&huge.explanation.includes('2 retirada')&&huge.explanation.includes('3 documento'),'Fênix usa reticências e preserva ressalva e múltiplas pendências');
ok(summarize({evidenceKind:'association',reason:'Coincidência observada'}).explanation.includes('Associação temporal não demonstra causa.'),'Correlação não vira causa clínica');
ok(summarize({evidenceKind:'missing_data',reason:'Ainda incompleto'}).explanation.includes('Dados incompletos:'),'Ausência de dados continua explícita');
ok(read('scripts/test-v63-release-gate.mjs').includes('scripts/test-p15-r5-stock-suspension-ux-brain-avatar.cjs'),'Contrato novo registrado no release gate');
console.log(`VAULT P15 R5: ${checked} verificações de estoque, suspensão, navegação, Brain e Avatar aprovadas`);
