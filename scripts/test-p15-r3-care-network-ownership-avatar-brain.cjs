#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const read=file=>fs.readFileSync(file,'utf8');
const detail=read('app/saude/medicamentos/detalhes/page.tsx');
const network=read('components/saude/MedicationCareNetworkDetails.tsx');
const avatar=read('components/saude/HealthAvatar3D.tsx');
const brain=read('lib/health-intelligence/avatar-decision-brief.ts');
const gate=read('scripts/test-v63-release-gate.mjs');
let n=0;
const ok=(value,label)=>{assert(value,`P15 R3: ${label}`);console.log(`✓ ${++n}: ${label}`);};
for(const [name,source,kind] of [
  ['detalhes',detail,ts.ScriptKind.TSX],['rede de cuidado',network,ts.ScriptKind.TSX],
  ['Avatar',avatar,ts.ScriptKind.TSX],['Fênix',brain,ts.ScriptKind.TS]]) {
  const tree=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,kind);
  ok(tree.parseDiagnostics.length===0,`${name}: sintaxe TS/TSX válida`);
}
ok(detail.includes('loadMedicationDetailRelations({')&&detail.includes('relationSnapshot?.medico')&&detail.includes('relationSnapshot?.hospital'),
  'relações vêm do dossiê já autorizado; sem novo carregamento');
ok(detail.includes('<ClinicalDisclosure id="medicamento-rede"')&&detail.includes('{() => <MedicationCareNetworkDetails'),
  'rede mantém âncora e montagem sob demanda');
for(const token of ['otherMedicationCount:outrosMedsDesteMedico.length','hospital={hospital ?', 'location={local ?', 'pharmacy={farmacia || med.farmacia ?', 'ultimaRenovacao && ultimaRenovacaoSemCusto', 'onNavigate={href=>router.push(href)}','onMap={abrirNoMapa}','onCall={ligar}','formatDay={formatDate}']){
  ok(detail.includes(token),`dossiê mantém ligação ${token.slice(0,55)}`);
}
ok(network.includes('encodeURIComponent(id)')&&network.includes('onNavigate(`/saude/${type}/detalhes?id=${encodeURIComponent(id)}`)'),
  'destinos de cadastro usam IDs reais e codificados');
ok(network.includes('onClick={onClick}')&&network.includes('aria-label={label}')&&network.includes('focus-visible:outline'),
  'ações reais acessíveis e navegáveis por teclado');
ok(network.includes('onMap(node.address!)')&&network.includes('onCall(node.phone!)')&&network.includes('node.id ? action'),
  'mapa/telefone/detalhes só aparecem com dados da relação');
ok(!network.includes('db.')&&!network.includes('supabase')&&!network.includes('useLiveQuery')&&!network.includes('fetch('),
  'apresentação não consulta dados nem substitui autoridade de dono');
ok(!network.includes('safeAdd')&&!network.includes('safeUpdate')&&!network.includes('marcarDose('),
  'apresentação não cria eventos nem grava dose ou estoque');
ok(network.includes('Médico Prescritor')&&network.includes('Farmácia Vinculada')&&network.includes('Local de Saúde')&&network.includes('Hospital'),
  'todas as quatro relações continuam identificadas');
ok(network.includes('Última aquisição registrada via SUS / sem custo')&&network.includes('Registro indica necessidade de nova receita.'),
  'fornecimento público não é confundido com compra paga ou receita já renovada');
ok(detail.includes('HealthSupplyEntry medicamentoId={med.id!}')&&detail.includes('MedicationJourneySummary snapshot={journeySnapshot}'),
  'fornecimento e jornada permanecem nas autoridades independentes');
for(const anchor of ['medicamento-rede','medicamento-receita','medicamento-financeiro','historico-aquisicoes'])ok(detail.includes(anchor),'âncora preservada: '+anchor);
ok(detail.includes('onClick={\n                    abrirQuickDose')&&detail.includes('QuickDoseModal'),
  'registro canônico de doses permanece na página');
ok(avatar.includes('watchAccent: new THREE.MeshBasicMaterial({ color: 0x69bda4, transparent: true, opacity: .49, depthWrite: false })')
  &&avatar.includes('materials.watchAccent')&&avatar.includes('renderer.forceContextLoss()'),
  'Avatar mantém material reutilizado e limpeza do contexto');
ok(avatar.includes('eyeWhite: new THREE.MeshStandardMaterial({ color: "#cdd7d3", roughness: .81 })')
  &&avatar.includes('expressionEyeScaleY')&&!avatar.includes('requestAnimationFrame(animate)'),
  'olhos e budget WebGL permanecem protegidos');
const compiled=ts.transpileModule(brain,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const m={exports:{}};new Function('module','exports',compiled)(m,m.exports);const build=m.exports.buildAvatarDecisionBrief;
const result=build({reason:'Revisar\t dados\n anotados',evidenceKind:'projected',overdueWithdrawals:2,missingDocuments:3});
ok(!/[\u0000-\u001f\u007f]/.test(result.explanation)&&result.explanation.includes('Revisar dados anotados'),
  'Fênix normaliza caracteres de controle em explicações');
ok(result.explanation.includes('Projeção não confirma realização.')&&result.explanation.includes('2 retirada')&&result.explanation.includes('3 documento'),
  'alertas distintos e ressalva clínica persistem após limpeza');
ok(build({evidenceKind:'association',reason:'Coincidência de sintomas'}).explanation.includes('Associação temporal não demonstra causa.'),
  'associação não se torna diagnóstico causal');
ok(gate.includes('scripts/test-p15-r3-care-network-ownership-avatar-brain.cjs'),
  'contrato da P15 R3 integra a suíte integral');
ok(gate.includes('scripts/test-p15-r2-clinical-cost-detail-adaptive.cjs')&&gate.includes('scripts/test-p15-r1-stable-modules.cjs'),
  'contratos das cirurgias anteriores preservados');
console.log(`VAULT P15 R3: ${n} verificações de redes, proprietário, Avatar, Brain e regressão aprovadas`);
