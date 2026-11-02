#!/usr/bin/env node
"use strict";
const fs=require('node:fs'),assert=require('node:assert/strict'),Module=require('node:module'),ts=require('typescript');
const read=path=>fs.readFileSync(path,'utf8');let n=0;
const check=(ok,why)=>{assert.ok(ok,`M13: ${why}`);console.log(`✓ ${++n}: ${why}`)};
const files=[
  'app/saude/tratamentos/detalhes/page.tsx',
  'components/saude/TreatmentTimelineRow.tsx',
  'components/saude/ClinicalDisclosure.tsx',
  'components/saude/MedicationPrescriptionCard.tsx',
  'components/saude/MedicationCareNetworkDetails.tsx',
  'components/saude/MedicationDoseHistoryLink.tsx',
  'components/saude/MedicationDoseEvolutionTimeline.tsx',
  'components/saude/TreatmentSymptomTimeline.tsx',
  'components/saude/MedicationAcquisitionHistoryCard.tsx',
  'components/saude/ClinicalListSummary.tsx',
  'components/saude/HealthAvatar.tsx'
];
for(const path of files){const node=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);check(node.parseDiagnostics.length===0,`parse TSX ${path}: ${node.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; ')}`);}
const [detail,row,disclosure,prescription,network,history,evolution,symptoms,acquisition,summary,avatar]=files.map(read);
check(detail.includes('import { TreatmentTimelineRow }')&&detail.includes('<TreatmentTimelineRow')&&detail.includes('timeline.map((event)'),'linha clínica foi modularizada sem mudar o índice original');
check(detail.includes('const href = getTimelineHref(event)')&&detail.includes('if (!href) return;')&&detail.includes('router.push(href)')&&detail.includes('trigger("vibrate")'),'autoridade de navegação e haptic permanecem no pai');
check(detail.includes('id="tratamento-linha"')&&detail.includes('id="tratamento-financeiro"')&&detail.includes('id="tratamento-rede"')&&detail.includes('id="tratamento-medicamentos"'),'âncoras e seções do tratamento continuam presentes');
check(row.includes('disabled={disabled}')&&row.includes('onClick={onOpen}')&&row.includes('line-clamp-2')&&row.includes('motion-reduce:transition-none'),'linha acessível sem lógica clínica');
check(!/(?:\bdb\.|\bsupabase\b|\bfetch\(|router\.|localStorage|indexedDB)/.test(row),'componente de timeline não consulta nem escreve dados');
check(disclosure.includes('if (hash === id) setOpen(true)')&&disclosure.includes('window.addEventListener("hashchange"')&&disclosure.includes('{open && (')&&disclosure.includes('typeof children === "function"'),'revelação por deep-link e montagem lazy preservadas');
check(disclosure.includes('min-h-[60px]')&&disclosure.includes('line-clamp-2')&&disclosure.includes('aria-controls={`${id}-panel`}'),'resumo reduzido mantém acessibilidade');
check(prescription.includes('hasAttachment ? onAttachment : onLink')&&prescription.includes('onClick={onReceived}')&&prescription.includes('onClick={onPlan}'),'receita mantém todas as ações explícitas');
check(prescription.includes('status: PrescriptionStatus')&&prescription.includes('statePresentation[status]')&&prescription.includes('bg-emerald-400/10 text-emerald-300'),'status farmacêutico continua sem inferência');
check(prescription.includes('min-[420px]:grid-cols-2')&&prescription.includes('min-h-11'),'responsividade e toque da receita preservados');
check(network.includes('node.id ? action(')&&network.includes('node.phone ? action(')&&network.includes('node.address ? action('),'ações da rede exigem dados existentes');
check(network.includes('onNavigate(')&&network.includes('onMap(')&&network.includes('onCall(')&&network.includes('latestPublicAcquisition.needsPrescription'),'origem, mapa, telefone e alerta de receita preservados');
check(history.includes('Histórico e calendário de doses')&&history.includes('onClick={onOpen}')&&history.includes('Veja tomadas, horários, SOS e dias sem confirmação'),'histórico permanece navegável sem modificar tomadas');
check(evolution.includes('newestFirst.slice(0, 3)')&&evolution.includes('newestFirst.slice(3)')&&evolution.includes('historyRows(older,3)')&&evolution.includes('showOlder && <ol'),'todas alterações de dosagem disponíveis sob demanda');
check(evolution.includes('const newestFirst = [...history].reverse()')&&evolution.includes('formatDose(item.dosagem_antiga)')&&evolution.includes('formatDay(item.data_mudanca)'),'ordem e formatadores de dosagem canônicos');
check(symptoms.includes('record.intensidade')&&symptoms.includes('!dossier')&&symptoms.includes('Mudanças não demonstram causa ou eficácia'),'sintomas não inventam causalidade');
check(acquisition.includes('kind==="planned"?"Prevista"')&&acquisition.includes('kind==="public"?"R$ 0,00"')&&acquisition.includes('disabled={!enabled}'),'compra futura e SUS não viram compra paga');
check(summary.includes('metrics.map')&&summary.includes('toneClass')&&summary.includes('tabular-nums')&&summary.includes('break-all font-mono text-lg font-semibold'),'métricas preservam valores compridos sem corte (V302)');
check(avatar.includes('M13_FENIX_EXPLAINABLE_3D')&&avatar.includes('O modelo é ilustrativo, não representa um diagnóstico.'),'Fênix explica limite do 3D sem nova malha');
check(avatar.includes('Toque na Fênix para ampliar.')&&avatar.includes('Ver contexto registrado · não é diagnóstico')&&avatar.includes('Consultar contexto do Brain sem mudar de página'),'contratos antigos de Fênix mantidos');
const scene=read('components/saude/HealthAvatar3D.tsx');
check(scene.includes('M10_FACE_GUARD_NATIVE_JAW')&&scene.includes('new THREE.SphereGeometry(.151,20,12)')&&scene.includes('renderer.forceContextLoss()'),'Fênix 3D mantém mandíbula nativa e descarte GPU');
const legacy=read('scripts/test-p15-r2-clinical-cost-detail-adaptive.cjs');
check(legacy.includes("evolution.includes('newestFirst.slice(0, 3)')")&&legacy.includes("evolution.includes('{historyRows(older,3)}')"),'regressão histórica ajustada à nova densidade');
// Real TSX runtime callbacks with an isolated JSX runtime, no browser or network.
const jsx=(type,props)=>({type,props:props??{}});
const icon=()=>null;
const runtime={'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'lucide-react':new Proxy({}, {get:()=>icon})};
const load=file=>{const source=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;const m=new Module(file,module);m.require=id=>{if(id in runtime)return runtime[id];throw Error('M13 import inesperado '+id)};m._compile(source,file);return m.exports;};
const flatten=(v)=>Array.isArray(v)?v.flatMap(flatten):v&&typeof v==='object'&&'props'in v?[v,...flatten(v.props.children)]:[];
const Row=load(files[1]).TreatmentTimelineRow;let opened=0;
let item=Row({title:'Consulta registrada',description:'Local informado',date:'01/11/2026',icon:'Ícone',disabled:false,onOpen:()=>opened++});
check(item.type==='button'&&item.props.disabled===false,'linha do tempo renderiza ação de evento disponível');
item.props.onClick();check(opened===1,'linha do tempo chama exatamente o callback do pai');
check(flatten(item).some(x=>x.type==='span'&&x.props.children==='Local informado'),'descrição contextual permanece visível');
item=Row({title:'Registro legado',date:'—',icon:null,disabled:true,onOpen:()=>opened++});
check(item.props.disabled===true,'evento sem destino permanece desabilitado');
const Prescription=load(files[3]).MedicationPrescriptionCard;
const hit={plan:0,attach:0,link:0,received:0};
const args={typeLabel:'Receita',status:'current',issuedAt:'01/11/2026',expiresAt:'01/12/2026',nextAt:'30/11/2026',validityLabel:'Validade',nextLabel:'Renovação',onPlan:()=>hit.plan++,onAttachment:()=>hit.attach++,onLink:()=>hit.link++,onReceived:()=>hit.received++,hasAttachment:false};
const buttons=node=>flatten(node).filter(x=>x.type==='button');
let rendered=Prescription(args);let b=buttons(rendered);check(b.length===3,'receita mantém ajuste, anexo/vínculo e recebimento');b.forEach(x=>x.props.onClick());
check(hit.plan===1&&hit.link===1&&hit.attach===0&&hit.received===1,'sem anexo, vínculo abre destino original');
rendered=Prescription({...args,hasAttachment:true});buttons(rendered)[1].props.onClick();check(hit.attach===1,'com anexo, documento é consultado sem criar novo');
const gate=read('scripts/test-v63-release-gate.mjs');for(let i=1;i<=13;i++)check(gate.includes(`test-vault-m${i}-`),`gate cumulativo M${i}`);
console.log(`VAULT M13: ${n} contratos de arquitetura, comportamento e Fênix aprovados.`);
