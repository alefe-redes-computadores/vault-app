#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
let count = 0;
const check = (value, label) => { assert.ok(value, 'M65: '+label); count++; };
const read = file => fs.readFileSync(file, 'utf8');
const edited = [
 'app/inteligencia/page.tsx', 'app/saude/minha-saude/page.tsx',
 'app/saude/documentos/page.tsx', 'app/saude/medicamentos/page.tsx',
 'app/ajuda/page.tsx', 'lib/help/catalog.ts',
 'components/saude/CareRelationshipRoutes.tsx',
 'components/health-intelligence/BrainNextStep.tsx',
 'components/hoje/TodayTimelineGuide.tsx',
 'components/saude/HealthAvatar.tsx','components/home/HomeCommandCenter.tsx',
 'lib/health-intelligence/care-journey-360.ts','components/saude/CareJourney360.tsx'
];
for(const file of edited){
 const parsed=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 check(parsed.parseDiagnostics.length===0,`TS/TSX ${file}`);
}
const source=read('lib/health-intelligence/care-journey-360.ts');
const component=read('components/saude/CareJourney360.tsx');
for(const s of [source,component]){
 check(!/\b(?:db\.|supabase|\.put\(|\.add\(|safeUpdate\(|safeAdd\(|fetch\(|\.delete\()/.test(s),'novo módulo puramente de leitura');
}
const compile=(text,isJsx)=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:isJsx?ts.JsxEmit.ReactJSX:undefined,esModuleInterop:true}}).outputText;
const load=(file,imports)=>{
 const mod=new Module(path.resolve(file),module);mod.paths=Module._nodeModulePaths(path.dirname(path.resolve(file)));
 mod.require=id=>Object.prototype.hasOwnProperty.call(imports,id)?imports[id]:require(id);
 mod._compile(compile(read(file),file.endsWith('.tsx')),path.resolve(file));return mod.exports;
};
const {projectCareJourney360}=load('lib/health-intelligence/care-journey-360.ts',{});
const snapshot={medications:{active:7,needsAction:2,temporary:1},access:{withdrawals:{scheduled:4,overdue:1},processes:{active:2},documents:{explicitMissing:1},acquisitions:{planned:3}},archive:{total:9,withAttachments:6,unlinked:3},health:{records30d:12,activeDays30d:5},plan:{items:[{id:'x'},{id:'y'}],counts:{now:1}}};
const before=JSON.stringify(snapshot);
check(projectCareJourney360(null).length===0,'sem snapshot não inventa um resumo');
const tiles=projectCareJourney360(snapshot);
check(tiles.length===7 && new Set(tiles.map(x=>x.id)).size===7,'sete módulos distintos');
check(tiles.every(x=>x.href.startsWith('/')&&!x.href.startsWith('//')&&typeof x.detail==='string'),'somente rotas locais e rótulos reais');
check(tiles.find(x=>x.id==='medications').count===7 && tiles.find(x=>x.id==='withdrawals').count===4,'medicações e retiradas com origens próprias');
check(tiles.find(x=>x.id==='withdrawals').detail.includes('1 agendada') && !tiles.find(x=>x.id==='withdrawals').detail.includes('realizada'),'data anterior é revisão e nunca desfecho');
check(tiles.find(x=>x.id==='acquisitions').evidence==='planned' && tiles.find(x=>x.id==='acquisitions').detail.includes('não são compra'),'planos nunca viram realizações');
check(tiles.find(x=>x.id==='brain').evidence==='interpretation','plano Brain não é evento clínico');
check(tiles.find(x=>x.id==='health').count===12 && tiles.find(x=>x.id==='documents').count===9,'documentos e histórico mantêm métricas independentes');
check(JSON.stringify(snapshot)===before,'projeção não modifica o objeto original');
const corrupt=JSON.parse(JSON.stringify(snapshot)); corrupt.medications.active=Number.NaN; corrupt.access.withdrawals.overdue=-12; corrupt.archive.total=Infinity;
const safe=projectCareJourney360(corrupt);
check(safe.find(x=>x.id==='medications').count===0 && safe.find(x=>x.id==='documents').count===0,'NaN e valores infinitos são saneados');
check(safe.find(x=>x.id==='withdrawals').detail==='Agendamentos não confirmam recebimento','contagem negativa não cria falso atraso');
// Render the REAL compiled UI with an isolated JSX runtime, not a copy.
let slots=[], cursor=0;
const react={useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];}};
const Icon=()=>null;
const jsx={jsx:(type,props)=>({type,props:props||{}}),jsxs:(type,props)=>({type,props:props||{}})};
const Comp=load('components/saude/CareJourney360.tsx',{'react':react,'react/jsx-runtime':jsx,'lucide-react':new Proxy({}, {get:()=>Icon}),'@/lib/health-intelligence/care-journey-360':{projectCareJourney360}}).CareJourney360;
const tree=x=>Array.isArray(x)?x.flatMap(tree):x&&typeof x==='object'?[x,...tree(x.props?.children)]:[];
const text=x=>Array.isArray(x)?x.map(text).join(''):x&&typeof x==='object'?text(x.props?.children):x==null?'':String(x);
let destinations=[];const render=(compact=true)=>{cursor=0;return Comp({command:snapshot,compact,onNavigate:href=>destinations.push(href)});};
check(Comp({command:null,onNavigate:()=>{}})===null,'nenhum cartão para pessoa sem contexto');
slots=[];let view=render(true);let buttons=tree(view).filter(x=>x.type==='button');
check(buttons.length===4,'três cartões compactos e controle de expansão');
check(text(view).includes('Mapa do cuidado 360') && text(view).includes('não confirmação de ações'),'UI identifica escopo e limite');
const firstHref=tiles[0].href;buttons[0].props.onClick();check(destinations.length===1&&destinations[0]===firstHref,'ação delega ao dono e usa rota canônica');
const expand=buttons.at(-1);check(expand.props['aria-expanded']===false,'recolhimento acessível');
expand.props.onClick();view=render(true);buttons=tree(view).filter(x=>x.type==='button');check(buttons.length===8,'expansão apresenta todos os sete módulos sem nova busca');
check(buttons.at(-1).props['aria-expanded']===true,'expansão anunciada');
const help=load('lib/help/catalog.ts',{});
for(const id of ['retro-review','avatar-inspection']){
 const topic=help.helpTopics.find(t=>t.id===id);
 check(topic && topic.steps.length===3 && topic.steps.every(s=>s.title&&s.text),`guia ${id} completo`);
 check(topic.routes.length===0&&topic.destination.startsWith('/')&&fs.existsSync(path.join('app',topic.destination,'page.tsx')),`guia ${id} não captura rota existente`);
}
check(help.findHelpTopic('/saude/medicamentos/editar')?.id==='medication-form','guia de edição canônico não substituído');
check(help.searchHelpTopics('sincronizacao').some(t=>t.id==='sync'),'busca de ajuda antiga preservada');
const pageHelp=read('app/ajuda/page.tsx');check(pageHelp.includes('helpTopics.find(entry => entry.id === id)')&&pageHelp.includes('setSelected(topic)'), 'deep link apenas para guias conhecidos');
const today=read('components/hoje/TodayTimelineGuide.tsx');check(today.includes('isPassado ? "retro-review" : "today"')&&today.includes('Somente uma confirmação registra tomada'),'guia por data sem mutar tomada');
const avatar=read('components/saude/HealthAvatar.tsx');check(avatar.includes('/ajuda?topico=avatar-inspection')&&avatar.includes('canMountAvatar3D(')&&avatar.includes('<details open className="group mx-auto mt-3'),'Fênix mantém controle 3D e guia sob demanda');
const meds=read('app/saude/medicamentos/page.tsx');check(meds.includes('/ajuda?topico=medications')&&meds.includes('regulatoryBorderColor')&&meds.includes('setQuickDoseMedId(med.id!)'),'lista mantém faixa regulatória e dose rápida');
const route=read('components/saude/CareRelationshipRoutes.tsx');check(route.includes('Outras relações e guias')&&route.includes('onNavigate(href)')&&route.includes('href:"/saude/retiradas"'),'relacionamentos secundários recolhidos e navegáveis');
const home=read('components/home/HomeCommandCenter.tsx');check(home.includes('networkTone="text-emerald-300/80"')&&home.includes('path: "/saude/consultas"')&&home.includes('text-violet-300')&&home.includes('path: "/saude/exames"')&&home.includes('text-emerald-400'),'V9 cores clínicas intactas');
check(home.includes('go("/ajuda?topico=home")')&&home.includes('() => <div className="space-y-2"><HomeCareOrganizationTiles'),'Home: conteúdo e ajuda na mesma função JSX');
const brain=read('components/health-intelligence/BrainNextStep.tsx');check(brain.includes('onOpen(decision.href)')&&brain.includes('<VaultBrainEvidence item={decision} />'),'Brain mantém ação e evidência originais');
check(brain.includes('decision.evidenceKind === "projected"')&&brain.includes('Confira a origem antes de registrar'),'Brain diferencia projeção de realização');
const intelligence=read('app/inteligencia/page.tsx'),myHealth=read('app/saude/minha-saude/page.tsx'),docs=read('app/saude/documentos/page.tsx');
check(intelligence.includes('<CareJourney360 command={health.careCommand}')&&intelligence.includes('<BrainCarePlan plan={health.careCommand.plan}'),'Central reutiliza snapshot e preserva plano');
check(myHealth.includes('<CareJourney360 command={intelligence.careCommand}')&&myHealth.includes('<HealthBody key={personId}'),'Minha Saúde preserva avatar por pessoa');
check(myHealth.includes('id="minha-saude-panorama"') && myHealth.includes('{() => <PersonalHealthOverview') && myHealth.includes('id="minha-saude-mapa-cuidado"'), 'M64 permanece intacta: panorama sob demanda e Mapa 360 em disclosure independente');
check(myHealth.includes('{() => <CareJourney360 command={intelligence.careCommand}') && !myHealth.includes('{() => <div className="space-y-3"><PersonalHealthOverview'), 'M65 nao substitui o JSX clinico protegido pela M64');
check(docs.includes('<CareJourney360 command={healthIntelligence.careCommand}')&&docs.includes('<DocumentArchiveOverview command='),'acervo preserva resumo e conecta panorama');
const gate=read('scripts/test-v63-release-gate.mjs');
for(const file of ['scripts/test-vault-m65-care-360.cjs','scripts/test-vault-m64-premium-performance.cjs','scripts/test-vault-m63-notifications-search.cjs','scripts/test-vault-m61-help.cjs'])check(gate.includes(`"${file}"`),`gate preserva ${file}`);
console.log(`VAULT M65 CARE 360: ${count} verificações aprovadas`);
