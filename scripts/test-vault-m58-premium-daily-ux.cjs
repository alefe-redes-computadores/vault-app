#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
let n = 0;
const ok=(v, label)=>{assert.ok(v,`M58: ${label}`);n++;};
const files=[
  'components/home/HomeQuickMetrics.tsx',
  'components/home/HomeDailyHero.tsx',
  'components/home/HomeClinicalAreaTile.tsx',
  'components/home/HomeCareOrganizationTiles.tsx',
  'components/home/HomeSupplyAccessTiles.tsx',
  'components/hoje/TodayRoutinePulse.tsx',
  'components/hoje/TodayActionCenter.tsx',
  'components/hoje/TodayDoseGroupHeading.tsx',
  'components/saude/MedicationOperationalStrip.tsx',
  'components/saude/MedicationStockOverview.tsx',
];
const sources=Object.fromEntries(files.map(f=>[f,fs.readFileSync(f,'utf8')]));
const jsx={jsx:(type,props)=>({type,props:props||{}}),jsxs:(type,props)=>({type,props:props||{}}),Fragment:'fragment'};
const Icon=()=>null;
const icons=new Proxy({},{get:()=>Icon});
const react={memo:f=>f};
const imports={'react':react,'react/jsx-runtime':jsx,'lucide-react':icons,
  '@/lib/home/routine-summary-note':{homeRoutineSummaryNote:(scheduled,completed)=>`Note ${completed} of ${scheduled}`},
  '@/lib/today/today-temporal-guidance':{todayTemporalGuidance:({isFuturo,isPassado})=>isFuturo?'Planejamento futuro':isPassado?'Histórico sem confirmação':null},
  '@/components/saude/CareCommandStrip':{CareCommandStrip:()=>null},
  '@/hooks/useDismissibleDetails':{useDismissibleDetails:()=>({current:null})},
};
const load=(f)=>{const compiled=ts.transpileModule(sources[f],{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const m=new Module(f,module);m.require=id=>{if(Object.hasOwn(imports,id))return imports[id];throw Error(`Unmocked import ${id} in ${f}`)};m._compile(compiled,f);return m.exports;};
const flatten=(v)=>{if(Array.isArray(v))return v.flatMap(flatten);if(v===undefined||v===null||typeof v!=='object')return [];return [v,...flatten(v.props?.children)];};
const text=(v)=>{if(Array.isArray(v))return v.map(text).join('');if(v===undefined||v===null)return '';if(typeof v==='object')return text(v.props?.children);return String(v)};
const elements=(v,type)=>flatten(v).filter(x=>x.type===type);
const buttons=v=>elements(v,'button');
for(const f of files){
 const s=sources[f];const sf=ts.createSourceFile(f,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 ok(sf.parseDiagnostics.length===0,'TSX syntax '+f);
 ok(!/\b(?:db\.|supabase\.|syncQueue\.)/.test(s),'presentation does not access persistence '+f);
}
const {HomeQuickMetrics}=load(files[0]);
let nav=[],opened=0;
const quick=HomeQuickMetrics({appointments:3,className:'min-[380px]:grid-cols-4',pendingDoses:2,medications:7,extrasTaken:1,onNavigate:v=>nav.push(v),onOpenPending:()=>opened++});
const q=buttons(quick);
ok(q.length===4,'Home retains four original metrics');
ok(text(quick).includes('Pendentes')&&text(quick).includes('SOS / extra'),'Home names and SOS classification preserved');
ok(q.every(x=>x.props.type==='button'),'Home metric buttons cannot submit forms');
ok(q.every(x=>String(x.props.className).includes('focus-visible')),'Home shortcuts keyboard accessible');
ok(q.every(x=>String(x.props.className).includes('min-h-[58px]')),'Home mobile min-height retains legacy safety');
ok(String(quick.props.className).includes('min-[380px]:grid-cols-4'),'Home responsive columns remain owner-controlled');
q[0].props.onClick();q[1].props.onClick();q[2].props.onClick();q[3].props.onClick();
ok(opened===1&&nav.join('|')==='/hoje|/saude/medicamentos|/hoje?focus=doses','Home actions keep canonical routes');
const {HomeDailyHero}=load(files[1]);
let heroClick=0;
const hp={eyebrow:'Hoje',title:'Próximo passo',description:'Cuidado',color:'#ccc',completed:0,scheduled:0,progress:100,onOpen:()=>heroClick++};
let hero=HomeDailyHero(hp),bar=flatten(hero).find(e=>e.props.role==='progressbar');
ok(bar?.props['aria-valuenow']===0&&bar.props['aria-valuetext']==='Sem horários programados','empty scheduled routine never presents 100 percent');
ok(text(hero).includes('Sem horários'),'empty schedule described without false completion');
buttons(hero)[0].props.onClick();ok(heroClick===1,'Home hero delegates action to Home');
hero=HomeDailyHero({...hp,scheduled:5,completed:2,progress:200});bar=flatten(hero).find(e=>e.props.role==='progressbar');
ok(bar.props['aria-valuenow']===100,'visual progress is bounded, no invalid ARIA percentage');
ok(text(hero).includes('2/5'),'original completed/planned count visible');
const {HomeClinicalAreaTile}=load(files[2]);
let target='';const tile=HomeClinicalAreaTile({label:'Minha saúde',description:'Cuidado vinculado',path:'/saude/minha-saude',Icon,tone:'tone',onNavigate:x=>target=x});
ok(buttons(tile).length===1&&String(buttons(tile)[0].props.className).includes('min-[380px]:min-h-[92px]'),'clinical tile remains large tactile target');
buttons(tile)[0].props.onClick();ok(target==='/saude/minha-saude','clinical tile routes through Home authority');
const {HomeCareOrganizationTiles}=load(files[3]);
nav=[];let org=HomeCareOrganizationTiles({gastoMes:12.3,diferencaMes:1.5,totalRede:3,documentPath:'/saude/documentos',purchasePath:'/saude/compras',networkPath:'/saude/rede',networkTone:'tone',onNavigate:x=>nav.push(x)});
ok(buttons(org).length===3,'organization has three independent destinations');
ok(text(org).includes('R$ 12,30'),'currency keeps Brazilian comma formatting');
ok(text(org).includes('3 profissionais e locais'),'network count still reflects input');
buttons(org).forEach(b=>b.props.onClick());ok(nav.join('|')==='/saude/documentos|/saude/compras|/saude/rede','organization routes unchanged');
const {HomeSupplyAccessTiles}=load(files[4]);
nav=[];const supply=HomeSupplyAccessTiles({onNavigate:x=>nav.push(x),withdrawalPath:'/saude/retiradas',supplyPath:'/saude/fornecimento'});
ok(buttons(supply).length===2,'access tiles remain distinct');
buttons(supply).forEach(b=>b.props.onClick());ok(nav.join('|')==='/saude/retiradas|/saude/fornecimento','withdrawal and SUS keep separate routes');
const {TodayRoutinePulse}=load(files[5]);
const base={isHoje:true,isPassado:false,isFuturo:false,pending:2,unconfirmed:2,completed:1,ignored:1,recorded:2,projected:0,percentage:33};
let pulse=TodayRoutinePulse(base);ok(text(pulse).includes('2 pendentes'),'today retains pending count');
ok(elements(pulse,'div').some(x=>x.props.role==='progressbar'),'today with records exposes accessibility progress');
ok(flatten(pulse).some(x=>typeof x.props.className==='string'&&x.props.className.includes('text-amber-300')),'pending today remains attention tone');
pulse=TodayRoutinePulse({...base,pending:0,percentage:100});
ok(flatten(pulse).some(x=>typeof x.props.className==='string'&&x.props.className.includes('text-emerald-300')),'zero pending today does not remain alarm-colored');
pulse=TodayRoutinePulse({...base,isHoje:false,isFuturo:true,completed:0,ignored:0,recorded:0,pending:0,projected:7});
ok(text(pulse).includes('7')&&text(pulse).includes('previstas'),'future is explicitly projected');
ok(!elements(pulse,'div').some(x=>x.props.role==='progressbar'),'future never has recorded adherence progress');
ok(!text(pulse).includes('concluída'),'future never displays taken doses');
pulse=TodayRoutinePulse({...base,isHoje:false,isPassado:true,recorded:0,completed:0,ignored:0,pending:0,percentage:100});
ok(text(pulse).includes('sem registros')&&!elements(pulse,'div').some(x=>x.props.role==='progressbar'),'unconfirmed history does not become completed');
const {TodayActionCenter}=load(files[6]);
let openedDoses=0,openedRoute='';
let action=TodayActionCenter({pendingDoses:3,command:null,brainFallback:{insightId:'id / 1',headline:'Sinal importante',title:'Contexto',supporting:2},onOpenDoses:()=>openedDoses++,onNavigate:x=>openedRoute=x});
ok(buttons(action).length===2,'today retains pending and independent Brain fallback');
buttons(action)[0].props.onClick();ok(openedDoses===1,'today dose CTA delegates to real handler');
buttons(action)[1].props.onClick();ok(openedRoute.includes('insight=id%20%2F%201')&&openedRoute.includes('return_to=%2Fhoje'),'Brain route encodes insight without claiming resolution');
action=TodayActionCenter({pendingDoses:0,command:{decision:{lane:'now'}},brainFallback:{insightId:'x',headline:'Sinal',title:'Contexto',supporting:1},onOpenDoses:()=>{},onNavigate:()=>{}});
ok(buttons(action).length===0,'actionable care command does not duplicate fallback alert');
const {TodayDoseGroupHeading}=load(files[7]);
let group=TodayDoseGroupHeading({icon:Icon,label:'Manhã',description:'Programadas',completed:90,total:4,progress:500});
let pbar=flatten(group).find(x=>x.props.role==='progressbar');
ok(pbar.props['aria-valuemax']===4&&pbar.props['aria-valuenow']===4,'group count clamped to actual total');
ok(!String(pbar.props.className).split(/\s+/).includes('hidden'),'group progress now visible on mobile');
group=TodayDoseGroupHeading({icon:Icon,label:'Sem doses',description:'Nada previsto',completed:0,total:0,progress:0});
pbar=flatten(group).find(x=>x.props.role==='progressbar');ok(pbar.props['aria-valuemax']===1&&pbar.props['aria-valuenow']===0,'empty group still valid progress range');
const {MedicationOperationalStrip}=load(files[8]);
const sb={today:{label:'A revisar',detail:'Ainda não confirmada',tone:'text-amber'},stockLabel:'Não informado',stockDetail:'Informe o saldo no cadastro',stockTone:'unknown',doseOutcome:'unconfirmed'};
let strip=MedicationOperationalStrip(sb);
ok(text(strip).includes(sb.stockDetail),'unknown stock explanation shown on Android without hover');
ok(text(strip).includes('A revisar')&&text(strip).includes('Não informado'),'clinical and stock status remain separate');
strip=MedicationOperationalStrip({...sb,stockTone:'known',stockLabel:'10 un.',stockDetail:'Informado hoje'});
ok(!text(strip).includes('Informado hoje'),'healthy stock preserves compact card hierarchy');
strip=MedicationOperationalStrip({...sb,stockTone:'low',stockLabel:'Baixo',stockDetail:'Baixo'});
ok(text(strip).indexOf('Baixo')===text(strip).lastIndexOf('Baixo'),'duplicate exception explanation omitted');
const {MedicationStockOverview}=load(files[9]);
const ov={statusLabel:'Revisar',statusColor:'text-coral',statusBackground:'bg-coral/10',statusIcon:null,quantity:2,unit:'comprimidos',equivalentMl:null,negative:true,registeredBalance:-1,sos:false,daysRemaining:2,dosesAvailable:null,hasStockProjection:true,doseEstimatePossible:true,doseQuantity:1,referenceDay:'2026-11-04',dropsConversionMissing:false,formatQuantity:v=>String(v)};
let stock=MedicationStockOverview(ov);
ok(flatten(stock).some(x=>x.props.role==='status'),'negative balance retains explicit warning');
ok(text(stock).includes('Revise o estoque físico'),'negative balance never silently corrected');
ok(elements(stock,'details').length===1&&elements(stock,'summary').length===1,'stock evidence stays accessible on demand');
ok(text(stock).includes('Quantidade por dose')&&text(stock).includes('Saldo informado em'),'stock origin and calculation preserved');
stock=MedicationStockOverview({...ov,negative:false,registeredBalance:2,dropsConversionMissing:true});
ok(!flatten(stock).some(x=>x.props.role==='status'),'positive balance does not show negative warning');
ok(text(stock).includes('não fará conversão automática'),'missing drops-to-ml conversion still fail-closed');
const gate=fs.readFileSync('scripts/test-v63-release-gate.mjs','utf8');
ok(gate.includes('scripts/test-vault-m58-premium-daily-ux.cjs'),'M58 checks integrated with canonical release gate');
for(const former of ['m57-android-export','m56-form-selection','m55-progressive-ux','m54-dialog-guard','m53-global-resilience','m52-sync-resilience'])ok(gate.includes(former),'previous protection preserved: '+former);
console.log(`M58 PREMIUM DAILY UX: ${n} verificações aprovadas.`);
