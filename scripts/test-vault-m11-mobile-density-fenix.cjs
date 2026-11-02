#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');let checks=0;
function ok(value,label){assert.ok(value,'VAULT M11: '+label);console.log(`✓ ${++checks}: ${label}`);}
const files=[
 'components/home/HomeAttentionRail.tsx',
 'components/saude/TreatmentVisitBrief.tsx',
 'components/saude/ClinicalSectionNav.tsx',
 'components/saude/MedicationRoutineSummary.tsx',
 'components/saude/MedicationStockOverview.tsx',
 'app/saude/tratamentos/page.tsx',
 'app/saude/tratamentos/detalhes/page.tsx',
 'components/saude/HealthAvatar.tsx',
 'components/saude/MedicationCatalogNameComparison.tsx',
 'scripts/test-p15-r8-home-rail-quality-a11y.cjs',
 'scripts/test-p15-r8-r2-v94-legacy-safety.cjs',
 'scripts/test-p15-r8-r3-brain-v5-compat.cjs',
 'scripts/test-v94-2-home-final-experience-contract.mjs',
 'components/saude/HealthAvatar3D.tsx',
];
for(const file of files){
 const source=read(file),p=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(p.parseDiagnostics.length===0,`TS/TSX: ${file}: ${p.parseDiagnostics.map(e=>e.messageText).join('; ')}`);
}
const [rail,visit,nav,routine,stock,treat,treatmentDetail,avatar,comparison,r8,r82,r83,v94,three]=files.map(read);
ok(rail.includes('alerts.slice(0, 1)')&&!rail.includes('snap-x snap-mandatory')&&rail.includes('className="space-y-2"'), 'Home sem carrossel lateral cortado');
ok(rail.includes('visible.map(alert')&&rail.includes('key={alert.id}')&&rail.includes('onClick={onToggle}')&&rail.includes('aria-expanded={expanded}'), 'Home preserva ordem e abertura explícita dos alertas');
ok(visit.includes('hasVisitEvidence=stats.some(item=>item.value>0)')&&visit.includes('Sem eventos vinculados para resumir'), 'Tratamento sem 4 contadores zero em preparação');
ok(visit.includes('dossier.synopsis')&&visit.includes('copySummary()')&&visit.includes('dossier.pendingLocal'), 'Preparação preserva texto e cópia com fallback');
ok(nav.includes('M11_FIVE_TABS_ONE_ROW')&&nav.includes('compactFive?"relative z-20 grid min-w-0 grid-cols-5')&&nav.includes('grid-cols-4 gap-1')&&nav.includes('min-[480px]:grid-cols-5'), 'cinco abas numa fileira preservam layouts antigos');
ok(nav.includes('hashchange')&&nav.includes('IntersectionObserver')&&nav.includes('aria-current='), 'âncoras e seção ativa intactas');
ok(routine.includes('resolvedToday}/{plannedToday}')&&routine.includes('ignoredScheduledToday')&&routine.includes('takenScheduledToday')&&routine.includes('<MedicationDoseHourChips'), 'rotina preserva doses tomadas, ignoradas e horas');
ok(routine.includes('mt-3 flex flex-wrap')&&routine.includes('Última tomada registrada:'), 'última tomada visível em bloco menor');
ok(stock.includes('formatQuantity(quantity)')&&stock.includes('referenceDay')&&stock.includes('registeredBalance')&&stock.includes('dropsConversionMissing'), 'estoque conserva quantidade, reconciliação e advertência sobre gotas');
ok(stock.includes('text-2xl')&&stock.includes('bg-surface p-3.5'), 'estoque reduz altura sem apagar informação');
ok(treat.includes('(tratamento.medicamentosCount>0 || tratamento.totalGasto>0) && (')&&treat.includes('Sem medicamentos vinculados'), 'tratamento sem dados não repete a cápsula zero');
ok(treat.includes('tratamento.alertaPrincipal.titulo === "Tratamento sem medicamento vinculado"'), 'M10 preservada: ausência não vira segundo alerta');
ok(treatmentDetail.includes('(medicamentosAtivos.length>0 || linkedDocuments.length>0 || panorama.renovacoes>0)')&&treatmentDetail.includes('<StatCard'), 'detalhes do tratamento não repetem três zeros no primeiro cartão');
ok(avatar.includes('Ângulo, zoom e aparência')&&avatar.includes('O botão do Brain mostra o contexto sem sair desta tela.'), 'Fênix explica controle e consulta local');
ok(avatar.includes('<span aria-hidden="true">Ver</span></button>:null}')&&avatar.includes('Ver contexto registrado · não é diagnóstico'), 'botão e limite clínico preservados');
ok(three.includes('M10_FACE_GUARD_NATIVE_JAW')&&three.includes('new THREE.SphereGeometry(.151,20,12)')&&!three.includes('new THREE.ExtrudeGeometry(jawShape'), 'guarda da mandíbula Android M10 intacta');
ok(three.includes('renderer.forceContextLoss()')&&three.includes('avatarAdaptiveRatio('), 'Fênix preserva liberação e limite de GPU');
ok(comparison.includes('grid grid-cols-2 gap-2')&&comparison.includes('text-emerald-300'), 'comparação visual compacta sem azul dominante');
ok(comparison.includes('currentName')&&comparison.includes('referenceName')&&comparison.includes('score'), 'referência não substitui nome silenciosamente');
ok(r8.includes('alerts.slice(0, 1)')&&r8.includes('Alerta 4')&&r82.includes('!rail.includes(\'snap-x snap-mandatory\')')&&r83.includes('alerts.slice(0, 1)')&&v94.includes('alerts.slice(0, 1)'), 'contratos históricos verificam nova prioridade sem descartar alertas');

// Executa os componentes originais com JSX reduzido, sem DOM, banco ou chamadas de rede.
const jsx=(type,props)=>({type,props:props||{}}),icon=()=>null;
const deps={
 'react':{useState:v=>[v,()=>{}],useRef:()=>({current:null}),useId:()=>'-m11-id',useEffect:()=>{},memo:fn=>fn},
 'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'Fragment'},
 'lucide-react':new Proxy({},{get:()=>icon}),
};
function load(file){const m=new Module(file,module);m.require=k=>{if(k in deps)return deps[k];throw Error('M11: import inesperado '+k)};m._compile(ts.transpileModule(read(file),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports;}
function nodes(n){if(Array.isArray(n))return n.flatMap(nodes);if(n&&typeof n==='object'&&'props' in n)return [n,...nodes(n.props.children)];return [];}
const Home=load(files[0]).HomeAttentionRail;
const alerts=Array.from({length:5},(_,i)=>({id:'a'+i,title:'A'+i}));let toggled=0;
const props={alerts,description:'Atenção',expanded:false,onToggle:()=>toggled++,renderAlert:a=>jsx('article',{children:a.title})};
const one=Home(props);ok(nodes(one).filter(x=>x.type==='article').length===1,'Home fechada renderiza apenas 1 alerta inteiro');
const button=nodes(one).find(x=>x.type==='button');ok(button?.props['aria-expanded']===false,'botão informa recolhimento');button.props.onClick();ok(toggled===1,'expansão usa callback original');
const all=Home({...props,expanded:true});ok(nodes(all).filter(x=>x.type==='article').length===5&&nodes(all).find(x=>x.type==='button')?.props['aria-expanded']===true,'expansão mostra 5 alertas na ordem');
ok(Home({...props,alerts:[]})===null,'sem alertas não inventa prioridade');
const Brief=load(files[1]).TreatmentVisitBrief;
const d={synopsis:'Resumo sem vinculação',medications:[],symptoms:[],consultations:[],documents:[],upcoming:[],pendingLocal:0};
const empty=nodes(Brief({dossier:d,color:'#abcdef',onNavigate:()=>{}}));
ok(empty.some(x=>x.type==='p'&&String(x.props.children).includes('Sem eventos vinculados')),'preparação sem vínculo tem mensagem única');
ok(!empty.some(x=>x.type==='div'&&String(x.props.className||'').includes('grid-cols-4')),'sem eventos não monta grade de 4 zeros');
ok(empty.some(x=>x.type==='button'&&String(x.props['aria-label']).includes('Copiar resumo')),'texto da consulta continua copiável');
const connected=nodes(Brief({dossier:{...d,medications:[{id:'m'}]},color:'#abcdef',onNavigate:()=>{}}));
ok(connected.some(x=>x.type==='div'&&String(x.props.className||'').includes('grid-cols-4')),'com vínculo os totais reaparecem');
const Nav=load(files[2]).ClinicalSectionNav;
const buildItems=n=>Array.from({length:n},(_,i)=>({id:'section-'+i,label:'Opção '+i,icon:null}));
const five=nodes(Nav({label:'Áreas de Hoje',items:buildItems(5),layout:'grid',density:'compact'}));
ok(five.find(x=>x.type==='nav')?.props.className.includes('grid-cols-5'),'cinco seções ficam numa fileira');
const four=nodes(Nav({label:'Áreas',items:buildItems(4),layout:'grid',density:'compact'}));
ok(four.find(x=>x.type==='nav')?.props.className.includes('grid-cols-4'),'quatro seções mantêm layout antigo');
const gate=read('scripts/test-v63-release-gate.mjs');
for(let i=1;i<=11;i++)ok(gate.includes(`test-vault-m${i}-`),`gate cumulativo M${i}`);
console.log(`VAULT M11: ${checks} verificações de hierarquia móvel, tratamento, doses, alertas e Fênix aprovadas.`);
