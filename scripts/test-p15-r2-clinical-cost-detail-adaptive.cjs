#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');let total=0;
function check(ok,why){assert(ok,`P15 R2: ${why}`);console.log(`✓ ${++total}: ${why}`)}
const paths=[
'app/saude/medicamentos/detalhes/page.tsx',
'components/saude/MedicationPaidCostCards.tsx',
'components/saude/MedicationDoseEvolutionTimeline.tsx',
'components/home/HomeDailyHero.tsx',
'components/hoje/TodayRoutinePulse.tsx',
'components/saude/HealthAvatar3D.tsx',
'lib/health-intelligence/avatar-decision-brief.ts',
];
for(const p of paths){const file=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);check(file.parseDiagnostics.length===0,`TS(X) válido ${p}`)}
const [detail,finance,evolution,home,today,avatar,brain]=paths.map(read);
check(detail.includes('<MedicationPaidCostCards paidCount={renovacoesPagas.length}')&&detail.includes('paidTotal={custoHistoricoRenovacoes} paidAverage={precoMedioRenovacoes}')&&detail.includes('referencePrice={med.preco}'),'resumo financeiro herda apenas totais calculados previamente');
check(!detail.includes('<StatCard')&&finance.includes('import { StatCard }')&&finance.includes('paidCount > 0'),'cards financeiros extraídos, nenhum cálculo refeito na página');
check(detail.includes('summarizeMedicationCosts(renovacoes, diaFinanceiro)')&&detail.includes('Planejado · não realizado')&&detail.includes('Não entram no gasto, no preço médio nem no estoque'),'V249: aquisições pagas, futuro e estoque continuam independentes');
check(finance.includes('paidCount > 0')&&finance.includes('paidTotal.toFixed(2)')&&finance.includes('paidAverage.toFixed(2)'),'somente aquisições realizadas alimentam custo e média');
check(finance.includes('Valor informado')&&finance.includes('referencePrice.toFixed(2)')&&finance.includes('Não informado'),'valor cadastrado permanece alternativa, sem inferir aquisição');
check(finance.includes('grid-cols-1')&&finance.includes('min-[400px]:grid-cols-2'),'cards financeiros evitam duas colunas estreitas no celular');
for(const str of ['MedicationPurchaseRhythmCard events={renovacoes}','VAULT_V320_FINANCE_PROGRESSIVE','label="Menor preço médio por farmácia:"','getElementById("historico-aquisicoes")','`/saude/medicamentos/historico?id=${id}`','<MedicationDoseEvolutionTimeline','className="vault-deferred" history={med.historico_dosagens}'])check(detail.includes(str),`contrato histórico: ${str.slice(0,57)}`);
check(evolution.includes('const newestFirst = [...history].reverse()')&&evolution.includes('newestFirst.slice(0, 3)')&&evolution.includes('newestFirst.slice(3)'),'histórico mantém ordem canônica e expõe três alterações, com demais sob demanda');
check(evolution.includes('{historyRows(recent,0)}')&&evolution.includes('{historyRows(older,3)}')&&evolution.includes('older.length>0 && <details')&&evolution.includes('showOlder && <ol')&&evolution.includes('onToggle={event=>setShowOlder'),'eventos antigos permanecem acessíveis sob expansão nativa');
check(evolution.includes('formatDose(item.dosagem_antiga)')&&evolution.includes('formatDay(item.data_mudanca)'),'formatadores clínicos permanecem os originais');
check(!/(\bdb\.|\bsupabase\b|\bsafeUpdate|\bsafeAdd)/.test(finance+evolution),'componentes visuais nunca escrevem banco ou rede');
check(home.includes('motion-reduce:transition-none')&&today.includes('motion-reduce:transition-none'),'animações de progresso respeitam preferência por movimento reduzido');
check(avatar.includes('opacity: .095, depthWrite: false')&&avatar.includes('eyeWhite: new THREE.MeshStandardMaterial({ color: "#cdd7d3", roughness: .81 })')&&avatar.includes('renderer.forceContextLoss()')&&!avatar.includes('requestAnimationFrame(animate)'),'Avatar suaviza lentes sem mudar malhas, olhos ou ciclo WebGL');
const transformed=ts.transpileModule(brain,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};new Function('module','exports',transformed)(mod,mod.exports);const brief=mod.exports.buildAvatarDecisionBrief;
check(brief({evidenceKind:'missing_data',reason:'Contexto parcial'}).explanation.includes('Dados incompletos: confirme os registros.'),'Brain com dados incompletos não apresenta justificativa como confirmação');
check(brief({evidenceKind:'projected',reason:'Planejamento'}).explanation.includes('Projeção não confirma realização.')&&brief({evidenceKind:'association',reason:'Padrão'}).explanation.includes('não demonstra causa'),'avisos anteriores de projeção/associação preservados');
const crowded=brief({evidenceKind:'missing_data',reason:'Contexto extenso '.repeat(70),overdueWithdrawals:2,missingDocuments:3});
check(crowded.explanation.length<=370&&crowded.explanation.includes('2 retirada')&&crowded.explanation.includes('3 documento')&&crowded.explanation.includes('Dados incompletos:'),'prioridades simultâneas e alerta cabem na explicação curta');
check(read('scripts/test-v63-release-gate.mjs').includes('scripts/test-p15-r2-clinical-cost-detail-adaptive.cjs'),'novo contrato integra release gate');
console.log(`VAULT P15 R2 — ${total} verificações clínicas e estruturais aprovadas`);
