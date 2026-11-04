#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const ts=require('typescript');
const files=[
'components/saude/TemporaryCourseMedicationCard.tsx',
'components/saude/MedicationDoseHourChips.tsx',
'components/saude/MedicationRoutineSummary.tsx',
'components/saude/MedicationAcquisitionHistoryCard.tsx',
'components/saude/MedicationAcquisitionQuantityGuide.tsx',
'components/saude/MedicationFormatPicker.tsx',
'components/saude/MedicationIdentityPreview.tsx',
'components/saude/MedicationCatalogIdentitySummary.tsx',
'components/saude/MedicationDoseEvolutionTimeline.tsx',
'components/saude/MedicationAppearancePanel.tsx',
];
let n=0; const ok=(c,m)=>{assert.ok(c,`M59: ${m}`);n++};
const jsx={jsx:(type,props)=>({type,props:props||{}}),jsxs:(type,props)=>({type,props:props||{}}),Fragment:'fragment'};
const Icon=()=>null;
const iconModules=new Proxy({},{get:()=>Icon});
let hookValues=[],hookCursor=0;
const hooks={
 memo:f=>f,
 useState:initial=>{const i=hookCursor++;if(!(i in hookValues))hookValues[i]=typeof initial==='function'?initial():initial;return [hookValues[i],next=>{hookValues[i]=typeof next==='function'?next(hookValues[i]):next}]},
 useEffect:()=>{},
 useId:()=> 'm59-test',
};
const render=(fn,props)=>{hookCursor=0;return fn(props)};
const reset=()=>{hookValues=[];hookCursor=0};
let courses=[];
const imports={
 react:hooks,'react/jsx-runtime':jsx,'lucide-react':iconModules,
 'framer-motion':{motion:new Proxy({},{get:(_,name)=>name})},
 '@/lib/health-intelligence/temporary-course-insights':{temporaryCourseSummaries:()=>courses},
 '@/components/saude/MedicationDoseHourChips':{MedicationDoseHourChips:()=>null},
 '@/components/saude/MedicationFormatIcon':{MedicationFormatIcon:()=>null},
 '@/components/ui/AvatarMedicamento':{AvatarMedicamento:()=>null},
 '@/lib/medications/form-presentation':{
   MEDICATION_PRIMARY_FORMATS:[{id:'comprimido',label:'Comprimido',icon:Icon},{id:'gotas',label:'Gotas',icon:Icon}],
   MEDICATION_ADDITIONAL_FORMATS:[{id:'spray',label:'Spray',icon:Icon}],
 },
};
const load=file=>{const transpiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const m=new Module(file,module);m.require=id=>{if(Object.hasOwn(imports,id))return imports[id];throw Error(`Unmocked ${id} in ${file}`)};m._compile(transpiled,file);return m.exports};
const tree=v=>Array.isArray(v)?v.flatMap(tree):v===undefined||v===null||typeof v!=='object'?[]:[v,...tree(v.props?.children)];
const nodes=(v,t)=>tree(v).filter(e=>e.type===t);
const text=v=>Array.isArray(v)?v.map(text).join(''):v==null?'':typeof v==='object'?text(v.props?.children):String(v);
for(const f of files){const s=fs.readFileSync(f,'utf8'),parsed=ts.createSourceFile(f,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);ok(parsed.parseDiagnostics.length===0,'TSX válido '+f);ok(!/\b(?:medicamentosRepository\.|doseLogsRepository\.|db\.|syncQueue\.|supabase\.)/.test(s),'sem gravação no componente '+f)}
const {TemporaryCourseMedicationCard}=load(files[0]);
const med={id:'m1',user_id:'u1',person_id:'p1',status:'ativo',nome:'Exemplo'};
courses=Array.from({length:5},(_,i)=>({key:'course'+i,from:'2026-11-01',through:'2026-11-14',pending:i===4?2:0,overdue:0,taken:i,ignored:0}));
reset();let edits=0;let props={med,doseLogs:[],personId:'p1',today:'2026-11-04',onEdit:()=>edits++};
let card=render(TemporaryCourseMedicationCard,props);
ok(nodes(card,'div').filter(x=>String(x.props?.className).includes('rounded-xl border border-surface-border/50')).length===3,'três períodos iniciais');
ok(text(card).includes('Ver todos os 5 períodos registrados'),'mais períodos anunciados sem perder contagem');
let expand=nodes(card,'button').find(x=>x.props['aria-expanded']===false);ok(Boolean(expand),'botão de expansão acessível');expand.props.onClick();
card=render(TemporaryCourseMedicationCard,props);
ok(nodes(card,'div').filter(x=>String(x.props?.className).includes('rounded-xl border border-surface-border/50')).length===5,'todos os períodos registrados acessíveis');
ok(text(card).includes('Recolher períodos anteriores'),'recolhimento explícito');
ok(text(card).includes('2 em aberto'),'pendências de período oculto não são omitidas da origem');
nodes(card,'button').find(x=>String(text(x)).includes('Ajustar período')).props.onClick();ok(edits===1,'ajustar período continua delegando ao formulário');
card=render(TemporaryCourseMedicationCard,{...props,med:{...med,status:'inativo'}});ok(!text(card).includes('Ajustar período'),'histórico preservado sem ação de edição quando inativo');
reset();courses=[];ok(render(TemporaryCourseMedicationCard,props)===null,'sem cursos não inventa dados');
reset();courses=[{key:'c1',from:'2026-11-01',through:'2026-11-14',pending:0,overdue:0,taken:2,ignored:0}];ok(render(TemporaryCourseMedicationCard,props)&&text(render(TemporaryCourseMedicationCard,props)).includes('Nenhum horário'),'sem pendências informa resultado sem confirmar tomada');
const {MedicationDoseHourChips}=load(files[1]);
reset();const hours=Array.from({length:12},(_,i)=>`${String(i+1).padStart(2,'0')}:00`);const hs={hours,taken:new Set(['01:00']),ignored:new Set(['02:00'])};
let chips=render(MedicationDoseHourChips,hs);ok(nodes(chips,'li').length===8,'oito horários inicialmente montados');
ok(text(chips).includes('Ver todos os 12 horários configurados'),'todos os horários podem ser exibidos');
let first=nodes(chips,'li')[0];ok(String(first.props['aria-label']).includes('tomada registrada'),'tomadas explícitas no horário');
ok(String(nodes(chips,'li')[1].props['aria-label']).includes('ignorada'),'ignoradas nunca viram tomadas');
expand=nodes(chips,'button')[0];expand.props.onClick();chips=render(MedicationDoseHourChips,hs);ok(nodes(chips,'li').length===12,'expansão mostra todos os horários');
ok(nodes(chips,'button')[0].props['aria-expanded']===true,'estado expandido comunicado');
reset();ok(nodes(render(MedicationDoseHourChips,{...hs,hours:['08:00']}),'button').length===0,'sem expansão inútil para poucos horários');
reset();ok(text(render(MedicationDoseHourChips,{...hs,hours:[]})).includes('não possui horários configurados'),'ausência de horários informada sem inventar slots');
const {MedicationRoutineSummary}=load(files[2]);
const routine={sos:false,takenToday:2,todayQuantity:'2',todayQuantityLabel:'Quantidade',todayQuantityPartial:false,takenLast7Days:5,last7DaysQuantity:'5',last7DaysQuantityPartial:false,resolvedToday:2,plannedToday:4,takenScheduledToday:1,ignoredScheduledToday:1,quantityPerDose:'1',doseUnit:'comprimido',hours:[],takenHours:new Set(),ignoredHours:new Set(),lastDose:null,hasStockControl:true};
let summary=render(MedicationRoutineSummary,routine);let prog=tree(summary).find(x=>x.props?.role==='progressbar');
ok(Boolean(prog)&&prog.props['aria-valuenow']===2&&prog.props['aria-valuemax']===4,'progresso somente de slots programados');
ok(text(summary).includes('2/4')&&text(summary).includes('1 tomada'),'contagem clínica exata mantida');
summary=render(MedicationRoutineSummary,{...routine,resolvedToday:99});prog=tree(summary).find(x=>x.props?.role==='progressbar');ok(prog.props['aria-valuenow']===4,'barra visual limitada sem falsificar contagem clínica');
ok(text(summary).includes('99/4'),'valor original continua disponível para diagnóstico');
summary=render(MedicationRoutineSummary,{...routine,plannedToday:0});ok(!tree(summary).some(x=>x.props?.role==='progressbar'),'rotina sem horários não cria progresso');
summary=render(MedicationRoutineSummary,{...routine,sos:true});ok(!tree(summary).some(x=>x.props?.role==='progressbar'),'SOS não vira slot programado');
const {MedicationAcquisitionHistoryCard}=load(files[3]);
const acq={kind:'planned',dateLabel:'05/11/2026',pharmacyName:'Farmácia com nome muito extenso',requiresPrescription:false,onOpen:()=>{},enabled:false};
let row=render(MedicationAcquisitionHistoryCard,acq);let btn=nodes(row,'button')[0];ok(btn.props.disabled===true&&btn.props['aria-label'].includes('indisponíveis'),'sem destino não anuncia abertura falsa');
ok(text(row).includes('Aquisição prevista')&&text(row).includes('ainda não realizada'),'previsão não é confundida com aquisição realizada');
row=render(MedicationAcquisitionHistoryCard,{...acq,kind:'prescription',enabled:true});ok(text(row).includes('Receita registrada; não demonstra compra'),'receita não é compra');
row=render(MedicationAcquisitionHistoryCard,{...acq,kind:'private',enabled:true,price:13.5});ok(text(row).includes('Comprado')&&text(row).includes('R$ 13.50'),'compra mantém valor informado');
row=render(MedicationAcquisitionHistoryCard,{...acq,kind:'public',publicKind:'sus',enabled:true});ok(text(row).includes('SUS')&&text(row).includes('R$ 0,00'),'retirada sem custo não vira compra paga');
const {MedicationAcquisitionQuantityGuide}=load(files[4]);
reset();let guide=render(MedicationAcquisitionQuantityGuide,{quantity:'-2',medicamento:null});ok(Boolean(tree(guide).find(x=>x.props?.role==='status')),'quantidade negativa sinalizada na apresentação');
guide=render(MedicationAcquisitionQuantityGuide,{quantity:'2,5',medicamento:{nome:'Med',estoque_unidade_medida:'comprimidos'}});ok(!tree(guide).some(x=>x.props?.role==='status'),'quantidade positiva não gera falso erro');
ok(text(guide).includes('2,5 comprimidos')&&text(guide).includes('Não presuma que 1 caixa'),'sem conversão automática de caixas');
guide=render(MedicationAcquisitionQuantityGuide,{quantity:'',medicamento:null});ok(!tree(guide).some(x=>x.props?.role==='status'),'campo vazio exibe instrução sem erro prematuro');
const {MedicationFormatPicker}=load(files[5]);let selected='';const fmt={selectedFormat:'comprimido',onSelect:v=>selected=v,onMore:()=>{selected='more'}};
let picker=render(MedicationFormatPicker,fmt),choices=nodes(picker,'button');ok(choices.length===3&&choices[0].props['aria-pressed']===true,'seleção mantém valores e aria-pressed');
ok(tree(choices[0]).some(x=>x.type===Icon),'formato selecionado mantém ícone');choices[1].props.onClick();ok(selected==='gotas','formato delegado ao formulário');
choices[2].props.onClick();ok(selected==='more','mais formatos mantém ação do formulário');
picker=render(MedicationFormatPicker,{...fmt,selectedFormat:'spray'});ok(nodes(picker,'button')[2].props['aria-pressed']===true,'formato adicional é marcado como escolhido');
const {MedicationIdentityPreview}=load(files[6]);let preview=render(MedicationIdentityPreview,{name:'Medicamento',format:'gotas',colors:['#AABBCC','#234567','#ff0000','invalid']});
ok(text(preview).includes('Cor 1')&&text(preview).includes('Cor 2'),'cores têm rótulos visíveis no Android');
ok(!text(preview).includes('Cor 3'),'prévia preserva limite de duas cores');
const {MedicationCatalogIdentitySummary}=load(files[7]);
let ident=render(MedicationCatalogIdentitySummary,{canonicalName:'Exemplo',activeIngredient:'substância',authorityLabel:'Catálogo',divergent:true});
ok(text(ident).includes('Confira a referência')&&text(ident).includes('não avalia a prescrição'),'divergência não afirma validade clínica');
ident=render(MedicationCatalogIdentitySummary,{canonicalName:'Exemplo',activeIngredient:'substância',authorityLabel:'Catálogo',divergent:false});ok(!text(ident).includes('Confira a referência'),'referência alinhada não exibe alerta falso');
const {MedicationDoseEvolutionTimeline}=load(files[8]);
reset();const ev={currentDose:'1 mg',history:[{dosagem_antiga:'2 mg',data_mudanca:'2026-11-01'},{dosagem_antiga:'3 mg',data_mudanca:'2026-10-01'},{dosagem_antiga:'4 mg',data_mudanca:'2026-09-01'},{dosagem_antiga:'5 mg',data_mudanca:'2026-08-01'}],formatDose:v=>v,formatDay:v=>v};let timeline=render(MedicationDoseEvolutionTimeline,ev);
ok(text(timeline).includes('Ver 1 alteração(ões) mais antiga(s)'),'histórico de dosagem recolhido e contável');
let older=nodes(timeline,'details')[0];older.props.onToggle({currentTarget:{open:true}});timeline=render(MedicationDoseEvolutionTimeline,ev);ok(text(timeline).includes('Recolher alterações antigas'),'histórico permite recolher sem apagar');
const {MedicationAppearancePanel}=load(files[9]);const panel=render(MedicationAppearancePanel,{title:'Identidade com um nome bem grande',children:'Conteúdo'});ok(text(panel).includes('Conteúdo')&&text(panel).includes('Identidade'),'painel preserva campos e título');
const gate=fs.readFileSync('scripts/test-v63-release-gate.mjs','utf8');ok(gate.includes('scripts/test-vault-m59-medication-journey.cjs'),'proteções M59 no gate canônico');for(const old of ['m58-premium-daily-ux','m57-android-export','m56-form-selection','m55-progressive-ux','m54-dialog-guard'])ok(gate.includes(old),'gate mantém cirurgia '+old);
console.log(`M59 MEDICATION JOURNEY: ${n} verificações aprovadas.`);
