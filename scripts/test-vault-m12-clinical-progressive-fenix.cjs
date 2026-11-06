#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
let checks=0;
function ok(value,label){assert.ok(value,'VAULT M12: '+label);console.log(`✓ ${++checks}: ${label}`)}
const read=file=>fs.readFileSync(file,'utf8');
const changed=[
 'app/saude/tratamentos/detalhes/page.tsx',
 'app/saude/minha-saude/page.tsx',
 'components/saude/TreatmentCareLinks.tsx',
 'components/saude/TreatmentSymptomTimeline.tsx',
 'components/saude/MedicationStockOverview.tsx',
 'components/saude/MedicationDoseHistoryLink.tsx',
 'components/saude/MedicationAcquisitionHistoryCard.tsx',
 'components/saude/MedicationJourneySummary.tsx',
 'components/saude/TreatmentLinkedMetrics.tsx',
 'components/saude/HealthAvatar3D.tsx',
 'components/saude/HealthAvatar.tsx',
];
for(const path of changed){const text=read(path),parsed=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);ok(parsed.parseDiagnostics.length===0,`${path}: TSX ${parsed.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; ')}`)}
const [treatment,health,links,symptoms,stock,history,acquisition,journey,metrics,three,avatar]=changed.map(read);
ok(treatment.includes('label="Áreas do tratamento" layout="grid" density="compact" priorityCount={3}')&&treatment.includes('label:"Medicamentos"')&&treatment.includes('label:"Rede"'), 'Tratamento prioriza ações clínicas e conserva âncoras');
ok(health.includes('label="Áreas de Minha Saúde" layout="grid" density="compact" priorityCount={4}')&&health.includes('id:"historico"'), 'Minha Saúde prioriza visão, Avatar, fontes e indicadores; histórico acessível');
ok(treatment.includes('panorama.renovacoes>0 || panorama.medicamentosPrecisandoAtencao>0')&&treatment.includes('Sem aquisições ou pendências registradas'), 'Panorama vazio não vira duas métricas zero');
ok(treatment.includes('Nenhum evento clínico vinculado a este tratamento.')&&treatment.includes('timeline.map('), 'Linha clínica vazia compacta; timeline real mantida');
ok(links.includes('<TreatmentLinkedMetrics items={counts}/>')&&links.includes('counts.some(item=>item.value>0)')&&links.includes('visibleProcesses.map(')&&links.includes('visibleWithdrawals.map('), 'Contadores extraídos; processos e retiradas canônicos intactos');
ok(metrics.includes('items.filter(item => Number.isFinite(item.value) && item.value > 0)')&&!/(?:\bdb\.|\bsupabase\b|fetch\(|localStorage|\.insert\(|\.update\()/.test(metrics), 'Métrica nova sem leituras, gravações nem contagem artificial');
ok(symptoms.includes('Sem relatos vinculados · detalhes opcionais')&&symptoms.includes('record.intensidade')&&symptoms.includes('não demonstram causa ou eficácia'), 'Sintomas vazios concisos; não cria causalidade');
ok(stock.includes('Origem do saldo e cálculo')&&stock.includes('Quantidade por dose:')&&stock.includes('Saldo informado em:')&&stock.includes('Revise o estoque físico')&&stock.includes('Gotas por ml não está configurado'), 'Estoque reordena metadados sem esconder alertas');
ok(history.includes('Histórico e calendário de doses')&&history.includes('onClick={onOpen}')&&history.includes('min-h-12'), 'Histórico de doses compacto mantém destino');
ok(acquisition.includes('initial={{opacity:0}} animate={{opacity:1}}')&&!acquisition.includes('height:"auto"')&&acquisition.includes('disabled={!enabled}'), 'Aquisições não animam altura e nunca abrem sem ID');
ok(acquisition.includes('const shownPrice=kind==="prescription"?"Receita":kind==="planned"?"Prevista"')&&acquisition.includes('kind==="public"?"R$ 0,00"')&&acquisition.includes('Number.isFinite(price)'), 'Receita, previsão, SUS e compra ainda têm autoridades distintas');
ok(journey.includes('const recorded=items.filter(item=>item.value>0)')&&journey.includes('const remaining=items.filter(item=>item.value===0)')&&journey.includes('Outras etapas · {remaining.length}')&&journey.includes('onNavigate(href)'), 'Jornada prioriza etapas registradas sem perder links de itens vazios');
ok(journey.includes('overdueWithdrawals>0')&&journey.includes('plannedAcquisitions>0')&&journey.includes('Planejamento futuro não registra compra'), 'Jornada preserva previsão versus realização e alerta de atraso');
ok(three.includes('M10_FACE_GUARD_NATIVE_JAW')&&three.includes('new THREE.SphereGeometry(.151,20,12)')&&!three.includes('new THREE.ExtrudeGeometry(jawShape')&&three.includes('renderer.forceContextLoss()'), 'Fênix: mandíbula segura e descarte GPU preservados');
ok(avatar.includes('Toque no Avatar para ampliar.')&&avatar.includes('Ver contexto registrado · não é diagnóstico')&&avatar.includes('onClick={onBrainSelect}'), 'Fênix: acessibilidade M7 e Brain não diagnóstico');
// Evaluate the NEW stateless UI with synthetic data, rather than merely inspecting markers.
const jsx=(type,props)=>({type,props:props||{}}),icon=()=>null;
const deps={
 'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'Fragment'},
 'lucide-react':new Proxy({},{get:()=>icon}),
 '@/lib/health-intelligence/medication-journey-signal':{medicationJourneySignal:()=>({tone:'quiet',label:'Evidência',explanation:'Sem conclusões automáticas'})},
};
function load(path){const mod=new Module(path,module);mod.require=id=>{if(id in deps)return deps[id];throw Error('M12 dependency unexpected '+id)};mod._compile(ts.transpileModule(read(path),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,path);return mod.exports;}
function walk(node){if(Array.isArray(node))return node.flatMap(walk);if(node&&typeof node==='object'&&'props'in node)return [node,...walk(node.props.children)];return []}
function words(node){return walk(node).flatMap(x=>[x.props.children]).flat(Infinity).filter(x=>typeof x==='string'||typeof x==='number').join(' ')}
const Metric=load(changed[8]).TreatmentLinkedMetrics;
const m=(label,value)=>({label,value,Icon:icon});
ok(Metric({items:[m('Processos',0),m('Retiradas',0)]})===null,'Métrica vazia não monta painel');
const info=walk(Metric({items:[m('Processos',0),m('Retiradas',2),m('Receitas',1)]}));
const labels=info.filter(x=>x.type==='strong').map(x=>x.props.children).join(',');
ok(labels==='2,1'&&!words(info).includes('Processos'),'Métrica exibe somente os dois vínculos reais');
ok(info.find(x=>x.type==='div'&&x.props['aria-label']==='Vínculos existentes no tratamento')!=null,'Métrica identifica sua origem para leitor de tela');
const Journey=load(changed[7]).MedicationJourneySummary;
const empty={overdueWithdrawals:0,pendingWithdrawals:0,plannedAcquisitions:0,completedAcquisitions:0,prescriptions:0,latestPrescriptionDate:null,latestAcquisitionDate:null,nextPlannedAcquisitionDate:null,nextWithdrawalDate:null};
const emptyNodes=walk(Journey({snapshot:empty,medicationId:'m1',onNavigate:()=>{}}));
ok(emptyNodes.some(x=>x.type==='p'&&String(x.props.children).includes('Nenhum evento registrado')),'Jornada sem vínculos apresenta explicação única');
ok(emptyNodes.some(x=>x.type==='details'&&String(words(x)).includes('Outras etapas')),'Jornada vazia ainda permite consultar quatro rotas');
const some=walk(Journey({snapshot:{...empty,prescriptions:2,pendingWithdrawals:1},medicationId:'m1',onNavigate:()=>{}}));
ok(some.some(x=>x.type==='button'&&x.props['aria-label']==='Abrir histórico de receitas')&&some.some(x=>x.type==='button'&&x.props['aria-label']==='Abrir histórico de retiradas'),'Jornada mantém acesso real às etapas com registros');
const gate=read('scripts/test-v63-release-gate.mjs');
for(let i=1;i<=12;i++)ok(gate.includes(`test-vault-m${i}-`),`gate cumulativo M${i}`);
console.log(`VAULT M12: ${checks} verificações de UX, arquitetura, histórico e Fênix aprovadas.`);
