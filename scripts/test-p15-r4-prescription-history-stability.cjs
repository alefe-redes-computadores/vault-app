#!/usr/bin/env node
"use strict";
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const detail=read('app/saude/medicamentos/detalhes/page.tsx');
const prescription=read('components/saude/MedicationPrescriptionCard.tsx');
const history=read('components/saude/MedicationAcquisitionHistoryCard.tsx');
const avatar=read('components/saude/HealthAvatar3D.tsx');
const brain=read('lib/health-intelligence/avatar-decision-brief.ts');
const gate=read('scripts/test-v63-release-gate.mjs');
let n=0;function ok(value,label){assert(value,`P15 R4: ${label}`);console.log(`✓ ${++n}: ${label}`)}
for(const [p,code] of [['detalhes',detail],['receita',prescription],['aquisições',history],['avatar',avatar],['brain',brain]]){
  const tree=ts.createSourceFile(p,code,ts.ScriptTarget.Latest,true,p==='brain'?ts.ScriptKind.TS:ts.ScriptKind.TSX);
  ok(tree.parseDiagnostics.length===0,`TSX/TS sem erros: ${p}`);
}
ok(detail.includes('import { MedicationPrescriptionCard }') && detail.includes('<MedicationPrescriptionCard') && detail.includes('validityLabel="Validade de referência" nextLabel="Próxima solicitação planejada"'),'V217 preserva referências reais na página e conteúdo renderizado');
ok(prescription.includes('{validityLabel}')&&prescription.includes('{nextLabel}')&&prescription.includes('Registrar receita recebida'),'rótulos recebidos são exibidos no componente');
ok(detail.includes('onPlan={() => router.push(`/saude/renovacao/nova-receita?medicamento_id=${encodeURIComponent(med.id!)}&mode=plan&return_to=')&&detail.includes('onReceived={() => router.push(`/saude/renovacao/nova-receita?medicamento_id=${encodeURIComponent(med.id!)}&return_to='),'navega para planejamento e registro de receita, não aquisição inventada');
ok(detail.includes('hasAttachment={Boolean(documento?.attachments?.length)}')&&detail.includes('onAttachment={abrirAnexo}')&&detail.includes('onLink={() => router.push(`/saude/medicamentos/editar?id=${id}&intent=rede`)}'),'anexo e vínculo continuam autoridade do documento selecionado');
ok(prescription.includes('hasAttachment ? onAttachment : onLink')&&prescription.includes('onClick={onReceived}')&&prescription.includes('onClick={onPlan}'),'ações visuais reais sem segunda camada de gravação');
ok(detail.includes('status={!med.data_receita ? "missing"')&&detail.includes('validadeReceitaAtual.status === "vence_hoje"')&&prescription.includes('Referência vencida')&&prescription.includes('Sem prazo calculado'),'status da receita continua calculado pelo dossiê e exibido com incerteza');
ok(detail.includes('<section id="medicamento-receita"')&&detail.includes('<ClinicalDisclosure id="historico-aquisicoes"')&&detail.includes('<ClinicalDisclosure id="medicamento-rede"'),'âncoras e contexto do cuidado preservados');
ok(detail.includes('somenteReceita ? (')&&detail.includes('aquisicaoFutura ? (')&&detail.includes('const somenteReceita = isPrescriptionOnly(renovacao)')&&detail.includes('const aquisicaoFutura = isFutureAcquisition(renovacao, diaFinanceiro)'),'V221 mantém distinção entre receita, futuro e efetivado');
ok(detail.includes('<MedicationAcquisitionHistoryCard')&&detail.includes('kind={somenteReceita ? ("prescription") : aquisicaoFutura ? ("planned")')&&history.includes('const shownPrice=kind==="prescription"?"Receita":kind==="planned"?"Prevista"'),'o evento futuro não recebe preço pago nem estoque');
ok(detail.includes('semCusto = !somenteReceita && !aquisicaoFutura')&&history.includes('kind==="public"?"R$ 0,00"')&&history.includes('publicKind==="sus"?"SUS":"Sem custo"'),'SUS e aquisição comprada permanecem distinguidos');
ok(detail.includes('price={typeof renovacao.preco === "number" && Number.isFinite(renovacao.preco) ? renovacao.preco : null}')&&history.includes('Number.isFinite(price)'),'valor não cadastrado não vira compra de preço zero');
ok(detail.includes('enabled={Boolean(renovacao.id)}')&&detail.includes('encodeURIComponent(renovacao.id)')&&history.includes('disabled={!enabled}'),'histórico só abre evento com ID existente e navegável');
ok(detail.includes('aria-expanded={showAllRenovacoes}')&&detail.includes('aria-controls="medicamento-historico-aquisicoes-lista"')&&detail.includes('id="medicamento-historico-aquisicoes-lista"'),'expansão acessível mantém lista sob demanda');
ok(detail.includes('MedicationPurchaseRhythmCard events={renovacoes}')&&detail.includes('summarizeMedicationCosts(renovacoes, diaFinanceiro)')&&detail.includes('HealthSupplyEntry medicamentoId={med.id!}'),'custo, fornecimento e receita continuam independentes');
ok(!/(?:\bdb\.|\bsupabase\b|\bsafeAdd\b|\bsafeUpdate\b|\bmarcarDose\s*\()/.test(prescription+history),'componentes novos não consultam banco nem registram doses');
ok(avatar.includes('stageRingMaterial=new THREE.MeshBasicMaterial({color:0x89f3d4,transparent:true,opacity:.10,depthWrite:false})')&&avatar.includes('expressionEyeScaleY')&&avatar.includes('renderer.forceContextLoss()')&&!avatar.includes('requestAnimationFrame(animate)'),'Avatar refina palco sem loop ou malhas extras');
const compiled=ts.transpileModule(brain,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const box={exports:{}};new Function('module','exports',compiled)(box,box.exports);const build=box.exports.buildAvatarDecisionBrief;
const cleaned=build({evidenceKind:'projected',reason:'Conferir\u200B registros\u2060 pendentes',overdueWithdrawals:2,missingDocuments:3});
ok(!/[\u200b-\u200d\u2060\ufeff]/i.test(cleaned.explanation)&&cleaned.explanation.includes('Conferir registros pendentes')&&cleaned.explanation.includes('Projeção não confirma realização.'),'Fênix remove invisíveis Unicode e mantém ressalva');
ok(build({evidenceKind:'missing_data',reason:'Conferir\u200d evidências'}).explanation.includes('Dados incompletos: confirme os registros.')&&build({evidenceKind:'association',reason:'Coincidência'}).explanation.includes('não demonstra causa'),'Brain continua distinguindo falta de dados e associação');
ok(gate.includes('scripts/test-p15-r4-prescription-history-stability.cjs')&&gate.includes('scripts/test-p15-r3-care-network-ownership-avatar-brain.cjs'),'contratos P15 R4/R3 presentes na suíte');
console.log(`P15 R4: ${n} verificações de receitas, aquisições, Avatar e Brain aprovadas`);
